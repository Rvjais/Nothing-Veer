# Nothing Music audio backend

Run `npm install`, then `npm start` in this directory. The backend listens on port 3000. Install a current yt-dlp distribution with its matching EJS dependencies; Node 22 or newer is used for YouTube's JavaScript challenges.

To install the pinned extractor and challenge solver locally on Windows:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

The backend automatically uses this environment's yt-dlp executable when present. Global Python packages are unaffected.

Configuration:

- `YT_DLP_BIN`: executable path if `yt-dlp` is not in PATH.
- `YT_DLP_JS_RUNTIME`: defaults to the Node executable running this server. Set to `deno:<path>` to use Deno instead.
- `YT_DLP_YOUTUBE_ARGS`: uses `web_embedded` for authenticated requests, avoiding the default authenticated TV client's [known yt-dlp failure](https://github.com/yt-dlp/yt-dlp/issues/17389); anonymous requests use yt-dlp's default. Override this as YouTube's supported clients change.
- `PORT`: defaults to 3000.

The frontend supplies its YouTube session using `x-youtube-cookie`. The backend writes a private temporary Netscape cookie jar, removes it after extraction, and hashes the session when identifying cached URLs. Cookies and subprocess command errors are not returned to clients or logged.

Format selection prefers audio-only streams. If YouTube only provides a combined audio/video stream, the player can use that stream's audio, but network usage and downloaded files will be larger. Quality settings express a preference; fallback formats can exceed the requested bitrate.

For a USB-connected Android development build:

```powershell
adb reverse tcp:3000 tcp:3000
adb reverse tcp:8081 tcp:8081
```

Start Metro from `frontend` with `EXPO_PUBLIC_BACKEND_URL=http://127.0.0.1:3000`. Port forwarding must be restored after a USB reconnect. Release builds require an HTTPS backend URL.

Keep `npm run usb` running in another backend terminal during USB testing. It restores missing port forwarding after reconnects without restarting the app or deleting device data. With multiple devices, set `ANDROID_SERIAL` to the phone to test.

Run `npm test` for cache isolation, temporary jar cleanup, secret-safe failures, and cache invalidation regression coverage. See [yt-dlp's EJS setup guide](https://github.com/yt-dlp/yt-dlp/wiki/EJS) for extractor/runtime installation details.
