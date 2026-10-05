# Android device audit — 2026-10-06

Tested the installed Nothing Music development app on the connected LXX513 phone running Android 15, using the current workspace JavaScript through Metro. No app source fixes or native rebuild were performed. This is a device smoke test plus targeted source review, not a guarantee that all bugs were found.

## Confirmed on the device

| Priority | Finding | Evidence / next step |
| --- | --- | --- |
| High | YouTube session is not recognized by the app | Settings says “SIGN IN TO YOUTUBE”, while the authentication WebView displays an authenticated YouTube profile. Investigate cookie-domain matching and the SID/HSID requirement in `frontend/src/components/auth/YouTubeAuthModal.tsx:29`. Password entry was not tested. |
| High | Online playback fails | Playing Starboy (`3_g2un5M350`) reaches the backend but yt-dlp returns “Sign in to confirm you’re not a bot.” The phone shows “Could not resolve this track from YouTube.” |
| High | Native startup crash observed | Initial launch showed a white screen. Logcat recorded `NullPointerException` in `ReactActivityDelegate.onKeyDown(ReactActivityDelegate.java:216)` during that startup. Restarting the app recovered it. Exact triggering key/input and repeatability remain unverified. |
| Medium | Abandoned download consumes storage | `files/downloads` contains a 1,810,772-byte completed `.webm` and a 2,009,966-byte `.download`. The Downloads summary shows 3.6 MB, while the single saved track shows 1.7 MB. This is leftover temporary data, not a proven arithmetic error. |

## Confirmed by source review / local endpoint checks

| Priority | Finding | Evidence |
| --- | --- | --- |
| High | Cookie values can be exposed in error output | Backend adds cookies to yt-dlp command arguments, then logs `error.message`; Node command failure messages include arguments. `/stream` also returns the message to clients. Do not log or return unsanitized subprocess errors with credentials. No actual cookie leak was triggered during this audit. |
| High | Backend cache ignores authentication identity | Both cached URLs and pending resolutions use only video ID and quality in `backend/server.js:33`. Signing in/out or switching accounts can reuse a resolution from another session. |
| Medium | Audio cache clearing cannot reach the intended endpoint | `StreamResolver.clearCache()` makes a GET request, while backend exposes DELETE `/cache`. A GET request returned HTTP 404. Settings can incorrectly describe this as an unreachable backend. |
| Medium | Downloads omit session headers | `downloadManager.ts` forwards User-Agent but discards `resolved.cookie`. A download requiring authenticated re-resolution will reach `/stream` without the session cookie. |
| Medium | Haptics and data streaming switches are UI-only | Both flags exist only as local state in Settings. Haptics calls and network/playback logic do not consult them, and values are not persisted. |
| Medium | Navigation pill captures its initial width | The PanResponder is retained with `useRef` but its callbacks close over the initial `containerWidth` of zero. Drag calculations therefore use invalid widths. It also advertises “Drag to reorder” without implementing reordering. |
| Medium | Search filter error handling is incomplete | Category changes call `YouTubeService.search(...).then(...)` with no catch/finally. A rejection can leave loading active. Searches also have no request-order guard, so older responses can replace newer results. |
| Medium | Album/artist pages use generic song search | Collection pages call search using title/artist rather than fetching tracks by collection ID; displayed tracks and “download all” need not correspond to the actual album. |
| Medium | Rapid playback requests can compete | `playTrack()` resets and loads the player asynchronously without a request guard. A slower earlier resolution can modify the native player after a newer selection. Not stress-reproduced on the device. |
| Low | About/version labels are stale | Settings/boot show 2.0.0, package/app configuration show 1.0.0; Settings says direct Innertube resolution despite the yt-dlp proxy implementation. |

## Passed checks

- Home catalog and Starboy search loaded.
- Home/Search/Library/Downloads/Settings navigation was exercised.
- YouTube WebView loaded and displayed its existing authenticated session.
- Existing downloaded Kesariya played locally; the UI timer advanced to 34 seconds.
- Playback remained PLAYING after sending the app into the background.
- Android media pause changed the session to PAUSED at 49.725 seconds.
- TypeScript `tsc --noEmit` passed.
- `npm run lint` completed with zero errors and six unused-variable warnings.

## Session setup and limits

Metro and the audio backend were started; USB forwarding for ports 8081 and 3000 was restored. Forwarding disappeared once during the audit, producing connection failures; it was restored before reproducing YouTube's bot rejection. The backend needed explicit access to the installed yt-dlp executable; that was an audit environment issue.

No Google password was entered, and no cookies were read into tool output. Favorites, playlists and downloads were not deleted. The abandoned temporary file was left intact. Native Gradle builds, authenticated online playback, fresh downloads, complete queue/repeat behavior, lock-screen playback, and long-running stability remain unverified. Successful local playback does not establish that all player controls work.

Recommended first fix: make the existing authenticated WebView session recognizable by the app and handle session state consistently in resolution, playback, downloads, and caches. A browser swap alone does not implement cookie transfer.

## Fixes implemented and retested

- Session recognition now reads native HttpOnly cookies from the actual YouTube hosts and accepts secure SID variants. On the phone, the existing signed-in WebView session was captured successfully; Settings continued to show signed in after restarting and reinstalling the app.
- Session credentials are supplied through private temporary Netscape jars to yt-dlp, not process arguments. Failures use fixed messages, and stream caches/pending resolutions are isolated by a session hash. Clearing cache also prevents in-flight requests from repopulating it.
- Cache clearing now sends DELETE and returns HTTP 204 from the local backend.
- Downloads pass the session header, refuse new network downloads in offline mode, and protect active temporary files during cleanup. Startup cleanup removed the abandoned `.download` while preserving the completed Kesariya song.
- Haptics and offline mode are persisted settings. Every app haptics call now respects the shared preference. Offline playback resolution uses downloaded tracks; requesting an unavailable online track in offline mode produces a clear error.
- The navigation pill uses current layout measurements. A drag from Settings to Library selected Library on the phone; its accessibility text now describes switching tabs.
- Search/category changes have error handling and request-order guards. Album/artist collections browse their IDs rather than substituting a generic song search. Batch save/download actions wait for completion and report failures.
- Playback requests cannot apply a slow earlier resolution over a newer track; native track replacement is serialized. Retry checks the actual native track, and queue removal no longer skips the following song.
- The startup key guard is generated through an Expo config plugin, so it survives prebuild. The Android build completed successfully and its APK was installed with app data preserved. A stale Expo launcher error screen immediately after installation needed a cold restart; that debug launcher issue is not claimed fixed.
- App version and resolver labels match configuration/implementation. Two source files were normalized from Windows encoding to UTF-8 so they could be edited consistently.
- Added a project-local Python environment with the pinned yt-dlp default dependencies, including the missing EJS solver. The backend enables the installed Node runtime and supports an explicit YouTube client override. See `backend/README.md` for reproducible setup.

Validation: TypeScript passed; lint completed with zero errors and zero warnings; three frontend regression tests and the backend integration test passed. Backend coverage includes private jar cleanup, session cache isolation, safe failures, and pending-cache invalidation. Frontend coverage includes secure session cookies, disabled haptics, and competing stream resolutions. Native build: `assembleDebug`, arm64, successful.

Online playback passed after completing the project-local extractor setup: Starboy loaded from the backend and advanced past 20 seconds. Android reported PAUSED at 20.608 seconds with audio buffered to 106.254 seconds. USB forwarding disappeared repeatedly during the session; `npm run usb` now restores missing forwarding while testing. Saved cookies alone still do not guarantee that every YouTube track will be available. No new Google credentials were entered or exposed.
