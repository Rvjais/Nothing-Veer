const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const https = require('https');
const http = require('http');

const app = express();
app.use(cors());
app.use(express.json());

// ─── In-memory stream cache ────────────────────────────────────────────────
const streamCache = new Map();
const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours

// ─── Health / Ping endpoint (used by keep-alive) ──────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Nothing Music Audio Proxy', ts: Date.now() });
});

app.get('/ping', (req, res) => {
  res.json({ pong: true, ts: Date.now() });
});

// ─── Stream resolver ──────────────────────────────────────────────────────
app.get('/stream', async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) return res.status(400).json({ error: 'Missing id' });

  // Return cached URL if still valid
  const cached = streamCache.get(videoId);
  if (cached && cached.expires > Date.now()) {
    console.log(`[Cache HIT] ${videoId}`);
    return res.redirect(cached.url);
  }

  console.log(`[Resolving] ${videoId} via yt-dlp...`);

  const command = [
    'yt-dlp',
    '-f', '"bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio"',
    '--no-playlist',
    '--no-warnings',
    '-g',
    `"https://www.youtube.com/watch?v=${videoId}"`
  ].join(' ');

  exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
    if (error) {
      console.error(`[Error] yt-dlp failed for ${videoId}: ${error.message}`);
      return res.status(500).json({ error: 'Stream resolution failed' });
    }

    const lines = stdout.split('\n').map(l => l.trim()).filter(l => l.startsWith('http'));
    const url = lines[lines.length - 1];

    if (!url) {
      console.error(`[Error] No URL found for ${videoId}. stderr: ${stderr}`);
      return res.status(404).json({ error: 'Audio stream not found' });
    }

    console.log(`[OK] Resolved ${videoId}`);

    streamCache.set(videoId, { url, expires: Date.now() + CACHE_TTL });

    res.redirect(url);
  });
});

// ─── Self keep-alive pinger ───────────────────────────────────────────────
// Render free tier spins down after 15 min of inactivity.
// We ping ourselves every 10 minutes to stay awake.
const RENDER_URL = process.env.RENDER_EXTERNAL_URL;

function selfPing() {
  if (!RENDER_URL) return; // only runs on Render (env var auto-set by Render)

  const url = `${RENDER_URL}/ping`;
  const client = url.startsWith('https') ? https : http;

  client.get(url, (res) => {
    console.log(`[Keep-Alive] Pinged ${url} → ${res.statusCode}`);
  }).on('error', (err) => {
    console.warn(`[Keep-Alive] Ping failed: ${err.message}`);
  });
}

// Ping every 10 minutes
setInterval(selfPing, 10 * 60 * 1000);

// ─── Start server ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Nothing Music Proxy running on port ${PORT}`);
  if (RENDER_URL) {
    console.log(`Keep-alive active → pinging ${RENDER_URL}/ping every 10 min`);
  }
});
