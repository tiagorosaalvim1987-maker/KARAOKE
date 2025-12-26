
import { Song } from "../types";

const STORAGE_KEYS = {
  SONGS: 'karaoke_pro_cached_songs',
  WORLD_HITS: 'karaoke_pro_world_hits'
};

export const saveSongToOffline = (song: Song) => {
  const cached = getOfflineSongs();
  if (!cached.find(s => s.id === song.id)) {
    const updated = [song, ...cached].slice(0, 50); // Limite de 50 músicas no cache
    localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(updated));
  }
};

export const getOfflineSongs = (): Song[] => {
  const data = localStorage.getItem(STORAGE_KEYS.SONGS);
  return data ? JSON.parse(data) : [];
};

export const saveWorldHitsCache = (hits: Song[]) => {
  localStorage.setItem(STORAGE_KEYS.WORLD_HITS, JSON.stringify(hits));
};

export const getCachedWorldHits = (): Song[] => {
  const data = localStorage.getItem(STORAGE_KEYS.WORLD_HITS);
  return data ? JSON.parse(data) : [];
}
