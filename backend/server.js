const express = require("express");
const cors = require("cors");
const { execFile } = require("child_process");
const https = require("https");
const { createHash } = require("crypto");
const { mkdtemp, writeFile, rm } = require("fs/promises");
const { tmpdir } = require("os");
const { join } = require("path");
const { existsSync } = require("fs");

const app = express();
app.use(cors());

const PORT = Number(process.env.PORT || 3000);
const LOCAL_YT_DLP = join(__dirname, ".venv", process.platform === "win32" ? "Scripts/yt-dlp.exe" : "bin/yt-dlp");
const YT_DLP_BIN = process.env.YT_DLP_BIN || (existsSync(LOCAL_YT_DLP) ? LOCAL_YT_DLP : "yt-dlp");
const YT_DLP_JS_RUNTIME = process.env.YT_DLP_JS_RUNTIME || "node:" + process.execPath;
const RESOLVE_TIMEOUT_MS = 45_000;
const UPSTREAM_TIMEOUT_MS = 20_000;
const MAX_REDIRECTS = 4;
const streamCache = new Map();
const pendingResolutions = new Map();

const FORMAT_BY_QUALITY = {
  high: "bestaudio/best",
  medium: "bestaudio[abr<=128]/bestaudio/best",
  low: "bestaudio[abr<=64]/bestaudio/best",
};

function normalizeQuality(value) {
  return Object.prototype.hasOwnProperty.call(FORMAT_BY_QUALITY, value)
    ? value
    : "high";
}

function isValidVideoId(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{11}$/.test(value);
}

function sessionKey(cookieString = "") {
  return createHash("sha256").update(cookieString).digest("hex");
}

function cacheKey(videoId, quality, cookieString = "") {
  return sessionKey(cookieString) + ":" + videoId + ":" + quality;
}

function readCookieHeader(request) {
  const value = request.headers["x-youtube-cookie"] || "";
  if (typeof value !== "string" || value.length > 16_000 || /[^\x20-\x7e]/.test(value)) {
    throw Object.assign(new Error("Invalid YouTube session header."), { status: 400 });
  }
  return value.split(";").map((part) => part.trim()).filter(Boolean).sort().join("; ");
}

function resolutionError(error, stderr = "") {
  if (error.code === "ENOENT") return Object.assign(new Error("yt-dlp is not installed or not in PATH. Install it or set YT_DLP_BIN."), { status: 503 });
  if (error.killed) return Object.assign(new Error("YouTube took too long to resolve this track. Try again."), { status: 504 });
  if (/sign in|not a bot|cookies.*no longer valid/i.test(stderr)) {
    return Object.assign(new Error("YouTube rejected this session. Reconnect YouTube in Settings and try again."), { status: 401 });
  }
  if (/429|too many requests/i.test(stderr)) return Object.assign(new Error("YouTube is rate limiting playback. Please try again later."), { status: 429 });
  if (/page needs to be reloaded/i.test(stderr)) return Object.assign(new Error("YouTube rejected the backend player client. Update yt-dlp or configure a supported player client."), { status: 502 });
  if (/requested format.*not available|no video formats|only images are available/i.test(stderr)) return Object.assign(new Error("YouTube did not provide an audio format. Update yt-dlp and its JavaScript runtime, then retry."), { status: 502 });
  if (/javascript runtime|challenge solving|signature extraction|n challenge/i.test(stderr)) return Object.assign(new Error("The audio backend needs an updated yt-dlp JavaScript runtime to play this track."), { status: 503 });
  if (/HTTP Error 403|Forbidden/i.test(stderr)) return Object.assign(new Error("YouTube denied the audio request. Refresh your session and update yt-dlp before retrying."), { status: 403 });
  if (/cookie|netscape/i.test(stderr)) return Object.assign(new Error("The audio backend could not use the saved YouTube session. Reconnect YouTube and try again."), { status: 401 });
  return Object.assign(new Error("Could not resolve this track from YouTube."), { status: 502 });
}

function getExpiry(url) {
  try {
    const expiresInSeconds = Number(new URL(url).searchParams.get("expire"));
    if (Number.isFinite(expiresInSeconds) && expiresInSeconds > 0) {
      return Math.max(Date.now(), expiresInSeconds * 1000 - 60_000);
    }
  } catch {
    // A missing/invalid expiry uses the short fallback below.
  }
  return Date.now() + 5 * 60_000;
}

async function getStreamUrl(videoId, quality, forceRefresh = false, cookieString = "") {
  const key = cacheKey(videoId, quality, cookieString);
  const cached = streamCache.get(key);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }
  if (forceRefresh) streamCache.delete(key);

  const pending = pendingResolutions.get(key);
  if (pending) return pending;

  const format = FORMAT_BY_QUALITY[quality];
  const commandArgs = [
    "--no-warnings",
    "--no-playlist",
    "--js-runtimes",
    YT_DLP_JS_RUNTIME,
    "--extractor-args",
    process.env.YT_DLP_YOUTUBE_ARGS || (cookieString ? "youtube:player_client=web_embedded" : "youtube:player_client=default"),
    "--socket-timeout",
    "8",
    "-f",
    format,
    "-g",
    "https://www.youtube.com/watch?v=" + videoId,
  ];

  // Use yt-dlp's cookie jar support. Cookies never appear in process arguments
  // or failure messages; the private temporary jar is removed on every exit.
  const generation = cacheGeneration;
  const resolution = (async () => {
    let directory;
    try {
      if (cookieString) {
        directory = await mkdtemp(join(tmpdir(), "nothing-youtube-"));
        const file = join(directory, "cookies.txt");
        const rows = cookieString.split("; ").map((part) => {
          const separator = part.indexOf("=");
          const name = part.slice(0, separator);
          const value = part.slice(separator + 1);
          if (separator < 1 || !/^[A-Za-z0-9_-]+$/.test(name)) {
            throw Object.assign(new Error("Invalid YouTube session cookie."), { status: 400 });
          }
          return [".youtube.com", "TRUE", "/", "TRUE", "0", name, value].join("\t");
        });
        await writeFile(file, "# Netscape HTTP Cookie File\n" + rows.join("\n") + "\n", { mode: 0o600 });
        commandArgs.push("--cookies", file);
      }
      return await new Promise((resolve, reject) => {
        execFile(
          YT_DLP_BIN,
          commandArgs,
          {
            timeout: RESOLVE_TIMEOUT_MS,
            maxBuffer: 1024 * 1024,
            windowsHide: true,
          },
          (error, stdout, stderr) => {
            if (error) return reject(resolutionError(error, stderr));
            const url = stdout
              .split(/\r?\n/)
              .map((line) => line.trim())
              .find((line) => line.startsWith("https://"));
            if (!url) return reject(new Error("yt-dlp returned no audio URL."));
            if (generation === cacheGeneration) streamCache.set(key, { url, expiresAt: getExpiry(url) });
            resolve(url);
          }
        );
      });
    } finally {
      if (directory) await rm(directory, { recursive: true, force: true });
    }
  })();

  pendingResolutions.set(key, resolution);
  try {
    return await resolution;
  } finally {
    if (pendingResolutions.get(key) === resolution) pendingResolutions.delete(key);
  }
}

function isAllowedUpstreamUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  return (
    host === "googlevideo.com" ||
    host.endsWith(".googlevideo.com") ||
    host === "youtube.com" ||
    host.endsWith(".youtube.com")
  );
}

function openUpstream(url, range, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (!isAllowedUpstreamUrl(url)) {
      reject(new Error("yt-dlp returned an unsupported upstream URL."));
      return;
    }

    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Encoding": "identity",
    };
    if (range) headers.Range = range;

    const request = https.get(url, { headers }, (upstream) => {
      const status = upstream.statusCode || 502;
      const location = upstream.headers.location;
      const isRedirect = [301, 302, 303, 307, 308].includes(status);

      if (isRedirect && location) {
        upstream.resume();
        if (redirectCount >= MAX_REDIRECTS) {
          reject(new Error("The audio source redirected too many times."));
          return;
        }
        const nextUrl = new URL(location, url).toString();
        openUpstream(nextUrl, range, redirectCount + 1).then(resolve, reject);
        return;
      }
      if (isRedirect) {
        upstream.resume();
        reject(new Error("The audio source returned a redirect without a target."));
        return;
      }

      resolve(upstream);
    });

    request.setTimeout(UPSTREAM_TIMEOUT_MS, () => {
      request.destroy(new Error("The YouTube audio source timed out."));
    });
    request.once("error", reject);
  });
}

function copyMediaHeaders(upstream, response) {
  const allowedHeaders = [
    "accept-ranges",
    "cache-control",
    "content-length",
    "content-range",
    "content-type",
    "etag",
    "last-modified",
  ];
  for (const header of allowedHeaders) {
    const value = upstream.headers[header];
    if (value !== undefined) response.setHeader(header, value);
  }
  response.setHeader("Cache-Control", "no-store");
}

app.get("/", (_request, response) => {
  response.send("Nothing Music Audio Proxy Online");
});

app.get("/resolve", async (request, response) => {
  const videoId = request.query.id;
  if (!isValidVideoId(videoId)) {
    return response.status(400).send("A valid 11-character YouTube video id is required.");
  }

  const quality = normalizeQuality(request.query.quality);
  try {
    const cookieString = readCookieHeader(request);
    await getStreamUrl(videoId, quality, false, cookieString);
    response.json({ ready: true });
  } catch (error) {
    const status = error.status || 502;
    console.warn("[Proxy] Resolution failed for " + videoId + " (HTTP " + status + "): " + (error.status ? error.message : "Extractor failure."));
    response.status(status).send(error.status ? error.message : "Could not resolve this track from YouTube.");
  }
});

app.get("/stream", async (request, response) => {
  const videoId = request.query.id;
  if (!isValidVideoId(videoId)) {
    return response.status(400).send("A valid 11-character YouTube video id is required.");
  }

  const quality = normalizeQuality(request.query.quality);
  const range = request.headers.range;

  try {
    const cookieString = readCookieHeader(request);
    const key = cacheKey(videoId, quality, cookieString);
    let upstreamUrl = await getStreamUrl(videoId, quality, false, cookieString);
    let upstream = await openUpstream(upstreamUrl, range);

    if ([401, 403].includes(upstream.statusCode) && !response.headersSent) {
      upstream.resume();
      streamCache.delete(key);
      upstreamUrl = await getStreamUrl(videoId, quality, true, cookieString);
      upstream = await openUpstream(upstreamUrl, range);
    }

    const status = upstream.statusCode || 502;
    if (status >= 400) {
      upstream.resume();
      return response.status(status).send("YouTube rejected the audio stream.");
    }

    copyMediaHeaders(upstream, response);
    response.status(status);

    upstream.once("error", (error) => {
      console.warn("[Proxy] Upstream stream failed for " + videoId + ".");
      if (!response.headersSent) response.status(502).send("Audio source failed.");
      else response.destroy(error);
    });
    response.once("close", () => {
      if (!response.writableEnded) upstream.destroy();
    });
    upstream.pipe(response);
  } catch (error) {
    console.warn("[Proxy] Stream failed for " + videoId + ".");
    if (!response.headersSent) {
      response.status(error.status || 502).send(error.status ? error.message : "Could not open the audio stream.");
    } else {
      response.destroy(error);
    }
  }
});

let cacheGeneration = 0;
app.delete("/cache", (_request, response) => {
  cacheGeneration++;
  streamCache.clear();
  pendingResolutions.clear();
  response.status(204).end();
});

if (require.main === module) app.listen(PORT, "0.0.0.0", () => {
  console.log("Audio Streaming Proxy running on port " + PORT);
  console.log("yt-dlp executable: " + YT_DLP_BIN);
});

module.exports = app;
