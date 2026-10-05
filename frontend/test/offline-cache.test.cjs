const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, mocks) {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(js, { exports: module.exports, module, console, require: name => { if (!(name in mocks)) throw new Error(`Unexpected import ${name}`); return mocks[name]; } });
  return module.exports;
}
const zustand = { create: init => {
  let state;
  const set = value => { state = { ...state, ...(typeof value === "function" ? value(state) : value) }; };
  state = init(set, () => state);
  return { getState: () => state };
} };
const stream = { url: "http://backend.test/stream", userAgent: "test" };

test("cache prunes old files, survives restart, and protects the song in use", async () => {
  let data = null;
  const files = new Map();
  let time = 1;
  const mocks = {
    zustand,
    "@react-native-async-storage/async-storage": { getItem: async () => data, setItem: async (_key, value) => { data = value; } },
    "../services/audioCache": { AudioCache: {
      prepare: async () => {}, reconcile: async () => {}, cancel: async () => {},
      exists: async track => files.has(track.localUri), remove: async track => { files.delete(track.localUri); },
      save: async track => {
        const saved = { ...track, localUri: `file://cache/${track.id}.audio`, fileSize: 30 * 1024 * 1024, cachedAt: time, lastPlayedAt: time++ };
        files.set(saved.localUri, saved);
        return saved;
      },
    } },
  };
  let store = load("src/store/useCacheStore.ts", mocks).useCacheStore;
  await store.getState().load();
  await store.getState().setLimit(50);
  await store.getState().cache({ id: "first" }, stream);
  store.getState().protect("second");
  await store.getState().cache({ id: "second" }, stream);
  assert.deepEqual(Array.from(store.getState().tracks, track => track.id), ["second"]);
  assert.equal(files.size, 1);
  await assert.rejects(store.getState().remove("second"), /song in use/);
  await store.getState().clear();
  assert.equal(store.getState().tracks.length, 1);
  store = load("src/store/useCacheStore.ts", mocks).useCacheStore;
  await store.getState().load();
  assert.equal((await store.getState().find("second")).id, "second");
  files.clear(); // The OS may remove temporary cache storage.
  assert.equal(await store.getState().find("second"), undefined);
  assert.equal(store.getState().tracks.length, 0);
});

test("turning caching off discards an in-flight result", async () => {
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  const removed = [];
  const { useCacheStore: store } = load("src/store/useCacheStore.ts", {
    zustand, "@react-native-async-storage/async-storage": { getItem: async () => null, setItem: async () => {} },
    "../services/audioCache": { AudioCache: { prepare: async () => {}, reconcile: async () => {}, cancel: async () => {}, save: async () => pending, remove: async track => removed.push(track.id) } },
  });
  const job = store.getState().cache({ id: "pending" }, stream);
  await new Promise(resolve => setImmediate(resolve));
  store.getState().setEnabled(false);
  finish({ id: "pending", fileSize: 12, localUri: "file://cache/pending" });
  await job;
  assert.deepEqual(removed, ["pending"]);
  assert.equal(store.getState().tracks.length, 0);
});

function playerHarness({ cached, accessError }) {
  const added = [];
  const requests = [];
  let signInReason;
  const AccessError = load("src/services/playbackAccess.ts", {}).PlaybackAccessError;
  const { usePlayerStore: player } = load("src/store/usePlayerStore.ts", {
    zustand,
    "react-native-track-player": { __esModule: true, default: { setupPlayer: async () => {}, updateOptions: async () => {}, addEventListener: () => {}, pause: async () => {}, reset: async () => {}, play: async () => {}, add: async track => added.push(track) }, State: {}, Event: {}, Capability: {}, AppKilledPlaybackBehavior: {} },
    "../services/playbackAccess": { PlaybackAccessError: AccessError },
    "./useCacheStore": { useCacheStore: { getState: () => ({ tracks: cached ? [cached] : [], protect: () => {}, find: async () => cached, cache: async () => {} }) } },
    "./useAuthStore": { useAuthStore: { getState: () => ({ requestSignIn: reason => { signInReason = reason; } }) } },
    "./useLibraryStore": { useLibraryStore: { getState: () => ({ audioQuality: "high", isDownloaded: () => false, getDownloadedTrack: () => undefined }) } },
    "../services/streamResolver": { StreamResolver: { getStreamUrl: async id => { requests.push(id); if (accessError) throw new AccessError("rate-limit"); throw new Error("No internet"); } } },
  });
  return { player, added, requests, reason: () => signInReason };
}

test("a cached song plays offline without contacting the stream resolver", async () => {
  const cached = { id: "cached", title: "Offline song", localUri: "file://cache/nothing-audio/cached.audio", fileSize: 123 };
  const harness = playerHarness({ cached });
  await harness.player.getState().playTrack({ id: "cached", title: "Offline song" });
  assert.deepEqual(harness.requests, []);
  assert.equal(harness.added[0].url, cached.localUri);
  assert.equal(harness.player.getState().currentTrack.localUri, cached.localUri);
});

test("a YouTube rate limit requests sign-in instead of a generic playback error", async () => {
  const harness = playerHarness({ accessError: true });
  await harness.player.getState().playTrack({ id: "online", title: "Online song" });
  assert.equal(harness.reason(), "rate-limit");
  assert.equal(harness.player.getState().playbackError, null);
  assert.equal(harness.player.getState().isBuffering, false);
});

test("only complete audio reaches the cache; Keep copies it to permanent storage", async () => {
  const files = new Map();
  let incomplete = false;
  let receivedHeaders;
  const native = {
    cacheDirectory: "file://cache/", documentDirectory: "file://documents/",
    makeDirectoryAsync: async () => {}, readDirectoryAsync: async () => [],
    getInfoAsync: async uri => files.has(uri) ? { exists: true, isDirectory: false, size: files.get(uri) } : { exists: false },
    deleteAsync: async uri => files.delete(uri),
    moveAsync: async ({ from, to }) => { files.set(to, files.get(from)); files.delete(from); },
    copyAsync: async ({ from, to }) => { files.set(to, files.get(from)); },
    createDownloadResumable: (_url, temporary, options) => {
      receivedHeaders = options.headers;
      return { pauseAsync: async () => {}, downloadAsync: async () => {
        files.set(temporary, incomplete ? 256 : 1024);
        return { status: 200, mimeType: "audio/webm", headers: { "Content-Length": "1024" } };
      } };
    },
  };
  const { AudioCache } = load("src/services/audioCache.ts", { "expo-file-system/legacy": native });
  const track = { id: "abcdefghijk", title: "Test" };
  const saved = await AudioCache.save(track, { ...stream, cookie: "SID=synthetic" }, 10000, () => {});
  assert.equal(receivedHeaders["x-youtube-cookie"], "SID=synthetic");
  assert.equal(await AudioCache.exists(saved), true);
  const kept = await AudioCache.keep(saved);
  assert.equal(kept.localUri, "file://documents/downloads/abcdefghijk.audio");
  assert.equal(files.get(kept.localUri), 1024);
  incomplete = true;
  await assert.rejects(AudioCache.save({ ...track, id: "bbbbbbbbbbb" }, stream, 10000, () => {}), /incomplete/);
  assert.equal(files.has("file://cache/nothing-audio/bbbbbbbbbbb.audio"), false);
  assert.equal(files.has("file://cache/nothing-audio/bbbbbbbbbbb.partial"), false);
});
