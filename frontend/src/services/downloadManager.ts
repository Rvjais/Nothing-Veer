import * as FileSystem from "expo-file-system/legacy";
import { AudioQuality, Track } from "../types/music";
import { StreamResolver } from "./streamResolver";

const DOWNLOADS_DIR = (FileSystem.documentDirectory || "") + "downloads/";

function extensionForMimeType(mimeType: string | null | undefined): string {
  const mime = mimeType?.split(";")[0].trim().toLowerCase();
  switch (mime) {
    case "audio/mp4":
    case "audio/x-m4a":
    case "video/mp4":
      return "m4a";
    case "audio/mpeg":
    case "audio/mp3":
      return "mp3";
    case "audio/webm":
    case "video/webm":
      return "webm";
    case "audio/ogg":
    case "application/ogg":
      return "ogg";
    case "audio/aac":
      return "aac";
    case "audio/opus":
      return "opus";
    default:
      return "audio";
  }
}

export class DownloadManager {
  private static async ensureDirExists(): Promise<void> {
    if (!DOWNLOADS_DIR) throw new Error("App storage is unavailable.");
    const dirInfo = await FileSystem.getInfoAsync(DOWNLOADS_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(DOWNLOADS_DIR, { intermediates: true });
    }
  }

  public static async downloadTrack(
    track: Track,
    onProgress?: (progress: number) => void,
    quality: AudioQuality = "high"
  ): Promise<Track> {
    await this.ensureDirExists();

    const tempUri = DOWNLOADS_DIR + track.id + ".download";
    const fileInfo = await FileSystem.getInfoAsync(tempUri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(tempUri, { idempotent: true });
    }

    let sourceUrl = track.streamUrl;
    let userAgent: string | undefined;
    if (!sourceUrl) {
      const resolved = await StreamResolver.getStreamUrl(track.id, quality);
      if (!resolved) throw new Error("Could not resolve an audio stream for this track.");
      sourceUrl = resolved.url;
      userAgent = resolved.userAgent;
    }

    const download = FileSystem.createDownloadResumable(
      sourceUrl,
      tempUri,
      userAgent ? { headers: { "User-Agent": userAgent } } : undefined,
      (progress) => {
        const total = progress.totalBytesExpectedToWrite;
        if (total > 0 && onProgress) {
          onProgress(
            Math.min(1, Math.max(0, progress.totalBytesWritten / total))
          );
        }
      }
    );

    let finalUri: string | undefined;
    try {
      const result = await download.downloadAsync();
      if (!result || !result.uri) throw new Error("Download was cancelled.");
      if (result.status < 200 || result.status >= 300) {
        throw new Error("Audio server returned HTTP " + result.status + ".");
      }

      const contentType =
        result.mimeType ||
        result.headers?.["content-type"] ||
        result.headers?.["Content-Type"] ||
        undefined;
      finalUri =
        DOWNLOADS_DIR + track.id + "." + extensionForMimeType(contentType);
      await FileSystem.deleteAsync(finalUri, { idempotent: true });
      await FileSystem.moveAsync({ from: result.uri, to: finalUri });

      const downloadedInfo = await FileSystem.getInfoAsync(finalUri);
      if (!downloadedInfo.exists || downloadedInfo.isDirectory) {
        throw new Error("Downloaded audio file could not be saved.");
      }

      return {
        ...track,
        localUri: finalUri,
        contentType: contentType || undefined,
        fileSize: "size" in downloadedInfo ? downloadedInfo.size || 0 : 0,
        downloadedAt: Date.now(),
      };
    } catch (error) {
      await FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => {});
      if (finalUri) {
        await FileSystem.deleteAsync(finalUri, { idempotent: true }).catch(() => {});
      }
      throw error;
    }
  }

  public static async deleteTrack(localUri: string): Promise<void> {
    try {
      const info = await FileSystem.getInfoAsync(localUri);
      if (info.exists) {
        await FileSystem.deleteAsync(localUri, { idempotent: true });
      }
    } catch (error) {
      console.warn("Failed to delete local file:", error);
    }
  }

  public static async getStorageUsedBytes(): Promise<number> {
    try {
      await this.ensureDirExists();
      const files = await FileSystem.readDirectoryAsync(DOWNLOADS_DIR);
      let totalSize = 0;
      for (const fileName of files) {
        const fileInfo = await FileSystem.getInfoAsync(DOWNLOADS_DIR + fileName);
        if (fileInfo.exists && !fileInfo.isDirectory) {
          totalSize += "size" in fileInfo ? fileInfo.size || 0 : 0;
        }
      }
      return totalSize;
    } catch {
      return 0;
    }
  }

  public static async clearTemporaryFiles(): Promise<void> {
    await this.ensureDirExists();
    const files = await FileSystem.readDirectoryAsync(DOWNLOADS_DIR);
    for (const fileName of files) {
      if (fileName.endsWith(".download")) {
        await FileSystem.deleteAsync(DOWNLOADS_DIR + fileName, { idempotent: true });
      }
    }
  }

  public static formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return "0 MB";
    const mb = bytes / (1024 * 1024);
    if (mb < 1000) return mb.toFixed(1) + " MB";
    return (mb / 1024).toFixed(2) + " GB";
  }
}
