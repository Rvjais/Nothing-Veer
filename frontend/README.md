# Nothing Music (NothingVeer) 🎶

An Android music application built in **React Native** that fuses the iconic **Nothing OS** visual design language with the seamless **online streaming engine of YouTube Music** (inspired by *Auric Music*).

---

## 📸 Overview & Design Philosophy

Nothing Music brings the clean, minimalist, high-contrast monochrome aesthetic of Nothing OS to life:
- **Dot-Matrix Typography**: Authentic `Ndot-77` font for headers, track counters, time indicators, and status badges.
- **NType & Geist Fonts**: Sleek, legible typefaces (`NType82-Headline`, `NType82-Regular`, `Geist-Medium`, `GeistMono`).
- **Signature Rotating Vinyl Disc**: An animated vinyl player with realistic concentric grooves, rotating artwork center label, center spindle, tone arm indicator, and ambient glow.
- **Floating Nothing Capsules**: Pill-shaped bottom navigation and interactive mini-player capsule with spinning vinyl indicator.
- **Glyph Equalizer**: Pulsing LED bar indicators inspired by the Nothing Phone Glyph Interface.
- **Pure AMOLED Black Theme**: Designed to maximize contrast and battery life with `#000000` AMOLED surfaces and Nothing red accents (`#D71921`).

---

## ⚡ Features (Powered by YouTube Music & LRCLIB)

1. **Online Music Streaming**:
   - Stream millions of songs directly from YouTube Music without requiring API keys or sign-ins.
   - High bitrate audio playback (AAC 128kbps / Opus 160kbps) with unthrottled streaming URLs.
   - Background playback support on Android with media notification service.
   - In-memory stream caching for instant subsequent plays.

2. **Synchronized & Plain Lyrics (LRCLIB)**:
   - Real-time auto-scrolling lyrics synchronized with song playback.
   - Active lyric line glowing with Nothing White/Red typography.
   - Tap any lyric line to instantly seek to that part of the song!

3. **Explore & Home Feeds**:
   - Quick Picks, Trending, and Curated hits.
   - Mood & Genre quick filters: `ALL`, `TRENDING`, `CHILL`, `SYNTH`, `WORKOUT`, `POP`, `ROCK`, `HIP-HOP`.
   - Live YouTube Music explore shelves.

4. **Live Search**:
   - Instant search suggestions as you type.
   - Categorized results for tracks and artists.
   - Quick trending search keyword chips.

5. **Library & Playlist Management**:
   - Persistent **Favorites** and **Recently Played** history.
   - Custom playlist creation and management (stored locally via AsyncStorage).

6. **Full Audio Controls**:
   - Scrubbable progress bar with millisecond-precise seeking.
   - Transport controls: Shuffle, Previous, Big Play/Pause, Next, Repeat (Off / All / One).
   - "Up Next" Queue modal sheet with track removal and reordering.

---

## 📂 Project Architecture

```
NothingVeer/
├── App.tsx                     # Root orchestrator with font loader and tab navigation
├── app.json                    # Expo & Android native configuration (permissions, package)
├── package.json                # Project dependencies (Expo 57, React Native 0.86, Expo AV)
├── android/                    # Complete native Android Gradle project (ready to build APK)
├── assets/
│   ├── fonts/                  # Nothing OS fonts (Ndot-77, NType82, Geist, GeistMono)
│   └── light/                  # Adaptive icons, bootsplash logos
└── src/
    ├── constants/
    │   └── theme.ts            # Nothing OS color palette, font mapping, layout dimensions
    ├── types/
    │   └── music.ts            # TypeScript interfaces for Track, Album, Lyrics, etc.
    ├── services/
    │   ├── youtube.ts          # YouTube Music Innertube API (Search, Suggestions, Home Feed)
    │   ├── streamResolver.ts   # Multi-tier audio stream resolver (Innertube + Piped fallback)
    │   └── lyrics.ts           # LRCLIB synchronized lyrics fetcher and LRC parser
    ├── store/
    │   ├── usePlayerStore.ts   # Zustand store for audio playback, queue & Expo AV sound
    │   └── useLibraryStore.ts  # Persistent storage for favorites, recents & playlists
    ├── components/
    │   ├── common/
    │   │   ├── NothingText.tsx       # Typography component with variant support
    │   │   ├── NothingCard.tsx       # Nothing OS widget card with red accent dot
    │   │   ├── NothingButton.tsx     # Tactile pill / circle button with haptics
    │   │   ├── NothingSearchBar.tsx  # Styled search input with clear button
    │   │   └── GlyphIndicator.tsx    # Animated Nothing Glyph LED sound visualizer
    │   ├── player/
    │   │   ├── VinylDisc.tsx         # Signature rotating Vinyl Disc player
    │   │   ├── ProgressBar.tsx       # Interactive scrubbable seekbar with mono time
    │   │   ├── PlayerControls.tsx    # Playback transport controls
    │   │   ├── MiniPlayer.tsx        # Floating capsule mini-player
    │   │   ├── LyricsOverlay.tsx     # Synced lyrics viewer with tap-to-seek
    │   │   └── QueueModal.tsx        # Up Next queue bottom sheet
    │   └── navigation/
    │       └── NothingTabBar.tsx     # Floating bottom capsule navigation bar
    └── screens/
        ├── HomeScreen.tsx            # Feed, mood pills, quick picks, recent cards
        ├── SearchScreen.tsx          # Real-time search with suggestions & trending tags
        ├── LibraryScreen.tsx         # Favorites, Recents, and custom Playlists
        ├── NowPlayingScreen.tsx      # Fullscreen player with Vinyl & Lyrics views
        └── SettingsScreen.tsx        # Stream quality, audio cache & app settings
```

---

## 🚀 Running the App

### 1. Start the Expo Development Server
Inside `C:\Users\Veer\Desktop\personal\Nothing Music\NothingVeer`:
```bash
npx expo start
```
Scan the QR code with the **Expo Go** app on your Android device, or press `a` to run on a connected Android phone/emulator.

### 2. Run Directly on Connected Android Device or Emulator
```bash
npm run android
```

### 3. Build Android Debug APK
```bash
cd android
./gradlew assembleDebug
```
The output APK will be generated at:
`android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🧪 Technical Verification
- **TypeScript**: Passes with 0 errors (`npx tsc --noEmit`).
- **Metro Android Bundling**: Verified with `npx expo export --platform android` (Bundled 719 modules + Hermes bytecode `index.hbc`).
- **Native Android Prebuild**: Executed with `npx expo prebuild --platform android` (Full Android Gradle project generated).
