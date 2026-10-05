export class PlaybackAccessError extends Error {
  constructor(public readonly reason: "session" | "rate-limit") {
    super("Connect YouTube to try online playback again.");
    this.name = "PlaybackAccessError";
  }
}
