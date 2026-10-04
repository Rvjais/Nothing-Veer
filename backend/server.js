const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const https = require('https');

const app = express();
app.use(cors());

// In-memory cache for resolved stream URLs
const streamCache = new Map();

function getStreamUrl(videoId) {
  return new Promise((resolve, reject) => {
    const cached = streamCache.get(videoId);
    if (cached && cached.expires > Date.now()) {
      return resolve(cached.url);
    }
    
    const command = `yt-dlp -f "bestaudio[ext=m4a]/bestaudio" -g "https://www.youtube.com/watch?v=${videoId}"`;
    exec(command, (error, stdout, stderr) => {
      if (error) return reject(error);
      const lines = stdout.split('\n').map(l => l.trim()).filter(l => l.startsWith('http'));
      const url = lines[lines.length - 1];
      if (!url) return reject(new Error("No URL found in yt-dlp output"));
      
      streamCache.set(videoId, { url, expires: Date.now() + 3 * 60 * 60 * 1000 });
      resolve(url);
    });
  });
}

app.get('/', (req, res) => {
  res.send('Nothing Music Audio Proxy Online (Byte Proxy)');
});

app.get('/stream', async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) return res.status(400).send('Missing id');

  try {
    const url = await getStreamUrl(videoId);
    
    // Forward the Range header if requested by ExoPlayer for seeking/chunking
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    console.log(`[Proxy] Streaming ${videoId} (Range: ${req.headers.range || 'Full'})`);

    https.get(url, { headers }, (ytRes) => {
      // YouTube returned an error (e.g. 403)
      if (ytRes.statusCode >= 400) {
        console.error(`[Proxy] YouTube returned status ${ytRes.statusCode}`);
        return res.status(ytRes.statusCode).send('Upstream Error');
      }

      // Forward HTTP status code (200 OK or 206 Partial Content)
      res.status(ytRes.statusCode);
      
      // Forward all safe response headers (Content-Type, Content-Length, Content-Range, Accept-Ranges)
      for (const [key, value] of Object.entries(ytRes.headers)) {
        // Skip cross-origin restricted headers from YouTube
        if (!key.toLowerCase().startsWith('access-control') && !key.toLowerCase().startsWith('alt-svc')) {
          res.setHeader(key, value);
        }
      }
      
      // Pipe the bytes directly to the client
      ytRes.pipe(res);
    }).on('error', (err) => {
      console.error(`[Proxy] Stream error for ${videoId}:`, err.message);
      res.status(500).send('Proxy stream error');
    });

  } catch (error) {
    console.error(`[Proxy] Resolution error for ${videoId}:`, error.message);
    res.status(500).send('Stream resolution failed');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Audio Streaming Proxy running on http://0.0.0.0:${PORT}`);
});
