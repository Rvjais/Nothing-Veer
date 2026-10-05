# YouTube onboarding, offline cache, and UI refresh

## What changed

- A startup welcome screen offers **Sign in / Sign up** and **Skip for now**. It returns on a new app launch until a YouTube session is saved. Skip allows guest playback for the current launch; it does not sign the user out or remove files.
- YouTube authentication/rate-limit responses (401, 403, 429) request connection instead of showing a generic playback error. The prompt offers opening YouTube, playing saved music, or returning to the app. A successful session capture retries the selected song. Other problems, such as an unreachable backend or unavailable audio format, keep their own error messages.
- **Downloads** now contains two tabs: **Downloads** and **Cached**. Both have Play all, Shuffle, song/artist filtering, and recent/alphabetical sorting.
- Completed online songs are automatically saved to a separate device cache. Playback prefers local files before contacting the backend. Cached files are checked against their recorded sizes, and missing/partial files are excluded.
- **Keep** copies a cached song into permanent Downloads without a network request. Cache cleanup never removes that copy.
- Automatic caching can be switched off. Its default limit is 200 MB, with 50 MB and 500 MB options. Older entries are evicted first; the song currently in use is protected. In-progress downloads can be stopped, and startup removes incomplete/orphaned files.
- Home, Search, Library, Settings, and the offline collection have clearer headings and spacing. Surfaces use a calmer graphite palette. The mini-player shows buffering; the full player identifies cached/downloaded playback. Removed the screen-wide tab layout animation that could cause text/layout glitches.
- Player initialization is delayed until a play request instead of starting the native audio service during onboarding.

## Practical limits

The cache contains complete files saved by this update, not every song in the historical recent list. Older songs need an online play to populate it. Automatic caching downloads a full copy and uses extra data; the user can disable it. The operating system may remove cache storage, so use Keep for songs that should remain in Downloads. Signing in does not guarantee that YouTube will make every track available.

Fresh Google account creation still uses the existing YouTube WebView flow and was not performed with new credentials. This update adds onboarding and recovery prompts; it does not convert Google authentication to OAuth.

## Validation

TypeScript, lint, and regression tests are used for the update. Tests cover authenticated cookie capture, haptics preferences, competing playback requests, cache persistence/eviction/protection, cancellation, offline playback without a resolver call, rate-limit-to-sign-in routing, incomplete-file rejection, and copying cached songs into Downloads.

On the connected Android device, Home and Downloads/Cached layouts were inspected, and two completed cached audio files appeared in the new tab. Further device interaction was paused while the phone was being used; final offline playback and Keep behavior are covered by automated tests rather than claimed as a completed manual device test.

The current installed development client receives these JavaScript changes through Metro. A standalone release with bundled JavaScript is needed for cold-launch use without a development server.
