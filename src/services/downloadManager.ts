import * as FileSystem from "expo-file-system/legacy";
import { Track } from "../types/music";
import { StreamResolver } from "./streamResolver";

const DOWNLOADS_DIR = `${FileSystem.documentDirectory}downloads/`;

export class DownloadManager {
  private static async ensureDirExists(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(DOWNLOADS_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(DOWNLOADS_DIR, { intermediates: true });
    }
  }

  public static async downloadTrack(
    track: Track,
    onProgress?: (progress: number) => void
  ): Promise<Track> {
    await this.ensureDirExists();

    const localFileUri = `${DOWNLOADS_DIR}${track.id}.mp3`;

    // Check if already downloaded and exists
    const fileInfo = await FileSystem.getInfoAsync(localFileUri);
    if (fileInfo.exists && !fileInfo.isDirectory) {
      return {
        ...track,
        localUri: localFileUri,
        fileSize: (fileInfo as any).size || 0,
        downloadedAt: Date.now(),
      };
    }

    // Resolve remote audio stream
    let streamUrl = track.streamUrl;
    if (!streamUrl) {
      const resolved = await StreamResolver.getStreamUrl(track.id);
      if (!resolved) {
        throw new Error("Could not resolve stream URL for offline download");
      }
      streamUrl = resolved;
    }

    const isGoogleVideo = streamUrl.includes("googlevideo.com");
    const downloadResumable = FileSystem.createDownloadResumable(
      streamUrl,
      localFileUri,
      isGoogleVideo
        ? {
            headers: {
              "User-Agent":
                "com.google.ios.youtube/21.03.1 (iPhone16,2; U; CPU iOS 18_2 like Mac OS X;)",
              Referer: "https://www.youtube.com/",
            },
          }
        : {},
      (downloadProgress) => {
        const total = downloadProgress.totalBytesExpectedToWrite;
        if (total > 0 && onProgress) {
          const progress = downloadProgress.totalBytesWritten / total;
          onProgress(Math.min(1, Math.max(0, progress)));
        }
      }
    );

    const result = await downloadResumable.downloadAsync();
    if (!result || !result.uri) {
      throw new Error("Download failed");
    }

    const downloadedInfo = await FileSystem.getInfoAsync(result.uri);
    const fileSize = (downloadedInfo as any).size || 0;

    return {
      ...track,
      localUri: result.uri,
      fileSize,
      downloadedAt: Date.now(),
    };
  }

  public static async deleteTrack(localUri: string): Promise<void> {
    try {
      const info = await FileSystem.getInfoAsync(localUri);
      if (info.exists) {
        await FileSystem.deleteAsync(localUri, { idempotent: true });
      }
    } catch (e) {
      console.warn("Failed to delete local file:", e);
    }
  }

  public static async getStorageUsedBytes(): Promise<number> {
    try {
      await this.ensureDirExists();
      const files = await FileSystem.readDirectoryAsync(DOWNLOADS_DIR);
      let totalSize = 0;
      for (const fileName of files) {
        const fileInfo = await FileSystem.getInfoAsync(`${DOWNLOADS_DIR}${fileName}`);
        if (fileInfo.exists && !fileInfo.isDirectory) {
          totalSize += (fileInfo as any).size || 0;
        }
      }
      return totalSize;
    } catch {
      return 0;
    }
  }

  public static formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return "0 MB";
    const mb = bytes / (1024 * 1024);
    if (mb < 1000) {
      return `${mb.toFixed(1)} MB`;
    }
    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
  }
}
