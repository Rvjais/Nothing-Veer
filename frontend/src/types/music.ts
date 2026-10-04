export interface Track {
  id: string; // YouTube Video ID
  title: string;
  artist: string;
  album?: string;
  albumId?: string;
  artwork: string;
  duration: number; // in seconds
  streamUrl?: string;
  localUri?: string;
  fileSize?: number;
  downloadedAt?: number;
}

export interface Album {
  browseId: string;
  title: string;
  artist: string;
  artwork: string;
  year?: string;
}

export interface Artist {
  browseId: string;
  name: string;
  artwork: string;
  subscribers?: string;
}

export interface Playlist {
  browseId: string;
  title: string;
  author?: string;
  itemCount?: string;
  artwork: string;
}

export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export interface LyricsData {
  synced: boolean;
  lines: LyricLine[];
  plain?: string;
}

export interface HomeFeedSection {
  title: string;
  subtitle?: string;
  items: Track[];
}

