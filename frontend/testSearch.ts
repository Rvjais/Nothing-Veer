import { YouTubeService } from "./src/services/youtube";

async function test() {
  console.log("Searching for Dancing on your own...");
  const songs = await YouTubeService.search("Dancing on your own", "songs");
  console.log("SONGS:");
  songs.slice(0, 3).forEach(s => console.log(s.title, "|", s.id, "|", s.contentType, "|", s.artwork));

  const albums = await YouTubeService.search("Dancing on your own", "albums");
  console.log("ALBUMS:");
  albums.slice(0, 3).forEach(s => console.log(s.title, "|", s.id, "|", s.contentType, "|", s.artwork));
}

test();

