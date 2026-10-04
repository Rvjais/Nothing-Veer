const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());

// In-memory cache for resolved stream URLs
const streamCache = new Map();

app.get('/', (req, res) => {
  res.send('Nothing Music Audio Proxy Online (yt-dlp Redirector)');
});

app.get('/stream', async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) return res.status(400).send('Missing id');

  // Check cache first
  const cached = streamCache.get(videoId);
  if (cached && cached.expires > Date.now()) {
    console.log(`[Proxy] Redirecting to cached stream for ${videoId}`);
    return res.redirect(cached.url);
  }

  console.log(`[Proxy] Resolving stream for ${videoId} via yt-dlp...`);
  
  // Use yt-dlp to get the direct googlevideo.com URL
  const command = `yt-dlp -f "bestaudio[ext=m4a]/bestaudio" -g "https://www.youtube.com/watch?v=${videoId}"`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`[Proxy] yt-dlp error: ${error.message}`);
      return res.status(500).send('Stream resolution failed');
    }

    // Output may contain warnings, the URL is usually the last non-empty line
    const lines = stdout.split('\n').map(l => l.trim()).filter(l => l.startsWith('http'));
    const url = lines[lines.length - 1];

    if (!url) {
      console.error(`[Proxy] yt-dlp could not find stream URL. Stderr: ${stderr}`);
      return res.status(404).send('Audio stream not found');
    }

    console.log(`[Proxy] Resolved stream URL for ${videoId}. Redirecting...`);
    
    // Cache the URL for 3 hours
    streamCache.set(videoId, {
      url,
      expires: Date.now() + 3 * 60 * 60 * 1000
    });

    res.redirect(url);
  });
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Audio Streaming Proxy running on http://0.0.0.0:${PORT}`);
});
