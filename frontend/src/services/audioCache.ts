import * as FileSystem from "expo-file-system/legacy";
import { Track } from "../types/music";
import { ResolvedStream } from "./streamResolver";

export interface CachedTrack extends Track {
  localUri: string;
  fileSize: number;
  cachedAt: number;
  lastPlayedAt: number;
}

const directory = () => {
  if (!FileSystem.cacheDirectory) throw new Error("Audio cache storage is unavailable.");
  return FileSystem.cacheDirectory + "nothing-audio/";
};
const owns = (track: CachedTrack) => /^[A-Za-z0-9_-]{11}$/.test(track.id) && track.localUri === directory() + track.id + ".audio";
let activeDownload: FileSystem.DownloadResumable | null = null;

export const AudioCache = {
  async cancel(): Promise<void> {
    if (activeDownload) await activeDownload.pauseAsync().catch(() => {});
  },
  async prepare(): Promise<void> {
    const root = directory();
    await FileSystem.makeDirectoryAsync(root, { intermediates: true });
    const files = await FileSystem.readDirectoryAsync(root);
    await Promise.all(files.filter(name => name.endsWith(".partial")).map(name => FileSystem.deleteAsync(root + name, { idempotent: true })));
  },
  async exists(track: CachedTrack): Promise<boolean> {
    if (!owns(track)) return false;
    const file = await FileSystem.getInfoAsync(track.localUri);
    return file.exists && !file.isDirectory && file.size > 0 && file.size === track.fileSize;
  },
  async reconcile(tracks: CachedTrack[]): Promise<void> {
    const root = directory();
    const keep = new Set(tracks.map(track => track.localUri));
    const files = await FileSystem.readDirectoryAsync(root);
    await Promise.all(files.filter(name => name.endsWith(".audio") && !keep.has(root + name)).map(name => FileSystem.deleteAsync(root + name, { idempotent: true })));
  },
  async remove(track: CachedTrack): Promise<void> {
    if (owns(track)) await FileSystem.deleteAsync(track.localUri, { idempotent: true });
  },
  async save(track: Track, stream: ResolvedStream, budget: number, onProgress: (progress: number) => void): Promise<CachedTrack> {
    if (!/^[A-Za-z0-9_-]{11}$/.test(track.id)) throw new Error("This track cannot be cached.");
    const root = directory();
    await FileSystem.makeDirectoryAsync(root, { intermediates: true });
    const temporary = root + track.id + ".partial";
    const finalUri = root + track.id + ".audio";
    let exceedsBudget = false;
    let lastProgressUpdate = 0;
    const download = FileSystem.createDownloadResumable(stream.url, temporary, {
      headers: { "User-Agent": stream.userAgent, ...(stream.cookie ? { "x-youtube-cookie": stream.cookie } : {}) },
    }, (event) => {
      if (event.totalBytesWritten > budget || event.totalBytesExpectedToWrite > budget) {
        exceedsBudget = true;
        void download.pauseAsync().catch(() => {});
      }
      if (event.totalBytesExpectedToWrite > 0) {
        const progress = Math.min(1, event.totalBytesWritten / event.totalBytesExpectedToWrite);
        const now = Date.now();
        if (now - lastProgressUpdate >= 250 || progress === 1) { lastProgressUpdate = now; onProgress(progress); }
      }
    });
    activeDownload = download;
    try {
      const result = await download.downloadAsync();
      if (!result || result.status < 200 || result.status >= 300 || exceedsBudget) throw new Error("This song could not fit in the audio cache.");
      const info = await FileSystem.getInfoAsync(temporary);
      if (!info.exists || info.isDirectory || !info.size || info.size > budget) throw new Error("Audio cache file is incomplete or too large.");
      const expectedSize = Number(result.headers?.["Content-Length"] || result.headers?.["content-length"]);
      const range = result.headers?.["Content-Range"] || result.headers?.["content-range"];
      if (expectedSize > 0 && info.size !== expectedSize) throw new Error("Audio cache file is incomplete.");
      if (range) {
        const complete = range.match(/^bytes 0-(\d+)\/(\d+)$/);
        if (!complete || Number(complete[1]) + 1 !== Number(complete[2])) throw new Error("Partial audio cannot be used offline.");
      }
      await FileSystem.moveAsync({ from: temporary, to: finalUri });
      const now = Date.now();
      return { ...track, streamUrl: undefined, localUri: finalUri, fileSize: info.size, contentType: result.mimeType || result.headers?.["Content-Type"] || result.headers?.["content-type"], cachedAt: now, lastPlayedAt: now };
    } catch (error) {
      await FileSystem.deleteAsync(temporary, { idempotent: true }).catch(() => {});
      throw error;
    } finally {
      if (activeDownload === download) activeDownload = null;
    }
  },
  async keep(track: CachedTrack): Promise<Track> {
    if (!FileSystem.documentDirectory || !await this.exists(track)) throw new Error("This cached song is no longer available.");
    const root = FileSystem.documentDirectory + "downloads/";
    await FileSystem.makeDirectoryAsync(root, { intermediates: true });
    const localUri = root + track.id + ".audio";
    await FileSystem.copyAsync({ from: track.localUri, to: localUri });
    return { ...track, localUri, downloadedAt: Date.now() };
  },
};
