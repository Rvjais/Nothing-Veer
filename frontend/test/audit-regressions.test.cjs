const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(relative, mocks) {
  const filename = path.join(__dirname, "..", relative);
  const js = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(js, {
    module, exports: module.exports,
    require: name => { if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`); return mocks[name]; },
    console, setTimeout, clearTimeout, URL, URLSearchParams, AbortController, __DEV__: true,
  }, { filename });
  return module.exports;
}

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

test("an authenticated mobile YouTube session is accepted without legacy SID/HSID", async () => {
  const checked = [];
  const { readYouTubeSession } = load("src/services/youtubeSession.ts", {
    "react-native": { Platform: { OS: "android" } },
    "@react-native-cookies/cookies": {
      flush: async () => {},
      get: async origin => {
        checked.push(origin);
        return origin.includes("m.youtube") ? {
          "__Secure-3PSID": { value: "session-value" },
          bad: { value: "unsafe\nheader" },
        } : { VISITOR_INFO1_LIVE: { value: "anonymous" } };
      },
    },
  });
  assert.equal(await readYouTubeSession(), "__Secure-3PSID=session-value");
  assert.deepEqual(checked, ["https://www.youtube.com", "https://m.youtube.com"]);
});

test("disabled haptics perform no native calls and native failures do not reject", async () => {
  let enabled = false;
  let calls = 0;
  const haptics = load("src/services/haptics.ts", {
    "../store/usePreferencesStore": { usePreferencesStore: { getState: () => ({ hapticsEnabled: enabled }) } },
    "expo-haptics": { selectionAsync: async () => { calls++; throw new Error("unavailable"); } },
  });
  await haptics.selectionAsync();
  assert.equal(calls, 0);
  enabled = true;
  await haptics.selectionAsync();
  assert.equal(calls, 1);
});

test("a slow earlier stream resolution cannot replace a newer track", async () => {
  const first = deferred();
  const second = deferred();
  const added = [];
  const native = {
    setupPlayer: async () => {}, updateOptions: async () => {}, addEventListener: () => {},
    pause: async () => {}, reset: async () => {}, play: async () => {},
    add: async track => { added.push(track.id); },
  };
  const { usePlayerStore } = load("src/store/usePlayerStore.ts", {
    zustand: { create: initializer => {
      let state;
      const set = value => { state = { ...state, ...(typeof value === "function" ? value(state) : value) }; };
      state = initializer(set, () => state);
      return { getState: () => state };
    } },
    "react-native-track-player": { __esModule: true, default: native, State: {}, Event: {}, Capability: {}, AppKilledPlaybackBehavior: {} },
    "../services/streamResolver": { StreamResolver: { getStreamUrl: id => id === "first" ? first.promise : second.promise } },
    "../services/playbackAccess": { PlaybackAccessError: class extends Error {} },
    "./useAuthStore": { useAuthStore: { getState: () => ({ requestSignIn: () => {} }) } },
    "./useCacheStore": { useCacheStore: { getState: () => ({ tracks: [], protect: () => {}, find: async () => undefined, cache: async () => {} }) } },
    "./useLibraryStore": { useLibraryStore: { getState: () => ({ audioQuality: "high", isDownloaded: () => false, getDownloadedTrack: () => null }) } },
  });
  const a = usePlayerStore.getState().playTrack({ id: "first", title: "A" });
  await new Promise(resolve => setImmediate(resolve));
  const b = usePlayerStore.getState().playTrack({ id: "second", title: "B" });
  await new Promise(resolve => setImmediate(resolve));
  second.resolve({ url: "https://example.test/b", userAgent: "test" });
  await b;
  first.resolve({ url: "https://example.test/a", userAgent: "test" });
  await a;
  assert.deepEqual(added, ["second"]);
  assert.equal(usePlayerStore.getState().currentTrack.id, "second");
  assert.equal(usePlayerStore.getState().isBuffering, false);
});
