const express = require("express");
const cors = require("cors");
const { execFile } = require("child_process");
const https = require("https");

const app = express();
app.use(cors());

const PORT = Number(process.env.PORT || 3000);
const YT_DLP_BIN = process.env.YT_DLP_BIN || "yt-dlp";
const RESOLVE_TIMEOUT_MS = 15_000;
const UPSTREAM_TIMEOUT_MS = 20_000;
const MAX_REDIRECTS = 4;
const streamCache = new Map();
const pendingResolutions = new Map();

const FORMAT_BY_QUALITY = {
  high: "bestaudio/best",
  medium: "bestaudio[abr<=128]/bestaudio",
  low: "bestaudio[abr<=64]/bestaudio",
};

function normalizeQuality(value) {
  return Object.prototype.hasOwnProperty.call(FORMAT_BY_QUALITY, value)
    ? value
    : "high";
}

function isValidVideoId(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{11}$/.test(value);
}

function cacheKey(videoId, quality) {
  return videoId + ":" + quality;
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

async function getStreamUrl(videoId, quality, forceRefresh = false) {
  const key = cacheKey(videoId, quality);
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
    "--socket-timeout",
    "8",
    "-f",
    format,
    "-g",
    "https://www.youtube.com/watch?v=" + videoId,
  ];

  const resolution = new Promise((resolve, reject) => {
    execFile(
      YT_DLP_BIN,
      commandArgs,
      {
        timeout: RESOLVE_TIMEOUT_MS,
        maxBuffer: 1024 * 1024,
        windowsHide: true,
      },
      (error, stdout) => {
        if (error) return reject(error);

        const url = stdout
          .split(/\r?\n/)
          .map((line) => line.trim())
          .find((line) => line.startsWith("https://"));

        if (!url) return reject(new Error("yt-dlp returned no audio URL."));
        streamCache.set(key, { url, expiresAt: getExpiry(url) });
        resolve(url);
      }
    );
  });

  pendingResolutions.set(key, resolution);
  try {
    return await resolution;
  } finally {
    pendingResolutions.delete(key);
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
    await getStreamUrl(videoId, quality);
    response.json({ ready: true });
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return response
        .status(503)
        .send("yt-dlp is not installed or not in PATH. Install it or set YT_DLP_BIN.");
    }
    if (error && error.killed) {
      return response.status(504).send("yt-dlp timed out while resolving this track.");
    }
    console.error("[Proxy] Resolution failed for " + videoId + ": " + error.message);
    response.status(502).send("Could not resolve this track from YouTube.");
  }
});

app.get("/stream", async (request, response) => {
  const videoId = request.query.id;
  if (!isValidVideoId(videoId)) {
    return response.status(400).send("A valid 11-character YouTube video id is required.");
  }

  const quality = normalizeQuality(request.query.quality);
  const key = cacheKey(videoId, quality);
  const range = request.headers.range;

  try {
    let upstreamUrl = await getStreamUrl(videoId, quality);
    let upstream = await openUpstream(upstreamUrl, range);

    if ([401, 403].includes(upstream.statusCode) && !response.headersSent) {
      upstream.resume();
      streamCache.delete(key);
      upstreamUrl = await getStreamUrl(videoId, quality, true);
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
      console.error("[Proxy] Upstream stream failed for " + videoId + ": " + error.message);
      if (!response.headersSent) response.status(502).send("Audio source failed.");
      else response.destroy(error);
    });
    response.once("close", () => {
      if (!response.writableEnded) upstream.destroy();
    });
    upstream.pipe(response);
  } catch (error) {
    console.error("[Proxy] Stream failed for " + videoId + ": " + error.message);
    if (!response.headersSent) {
      const status = error && error.killed ? 504 : 502;
      response.status(status).send(error.message || "Could not open the audio stream.");
    } else {
      response.destroy(error);
    }
  }
});

app.delete("/cache", (_request, response) => {
  streamCache.clear();
  response.status(204).end();
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Audio Streaming Proxy running on port " + PORT);
  console.log("yt-dlp executable: " + YT_DLP_BIN);
});

module.exports = app;
