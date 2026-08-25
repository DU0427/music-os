import { create } from 'zustand';
import type { ListeningHistoryRecord, TrackRecord } from '../../shared/ipc/music';

interface LibraryState {
  tracks: TrackRecord[];
  history: ListeningHistoryRecord[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  refreshTracks: () => Promise<void>;
  refreshHistory: () => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  tracks: [],
  history: [],
  isLoading: false,
  error: null,

  refreshTracks: async () => {
    if (typeof window.musicOS?.listTracks !== 'function') return;
    try {
      const tracks = await window.musicOS.listTracks();
      set({ tracks: Array.isArray(tracks) ? tracks : [] });
    } catch {
      // silent
    }
  },

  refreshHistory: async () => {
    if (typeof window.musicOS?.listListeningHistory !== 'function') return;
    try {
      const history = await window.musicOS.listListeningHistory();
      set({ history: Array.isArray(history) ? history : [] });
    } catch {
      // silent
    }
  },

  refresh: async () => {
    set({ isLoading: true, error: null });
    try {
      const [tracks, history] = await Promise.all([
        typeof window.musicOS?.listTracks === 'function' ? window.musicOS.listTracks() : Promise.resolve([] as TrackRecord[]),
        typeof window.musicOS?.listListeningHistory === 'function' ? window.musicOS.listListeningHistory() : Promise.resolve([] as ListeningHistoryRecord[]),
      ]);
      set({
        tracks: Array.isArray(tracks) ? tracks : [],
        history: Array.isArray(history) ? history : [],
        isLoading: false,
      });
    } catch (e) {
      set({ isLoading: false, error: e instanceof Error ? e.message : String(e) });
    }
  },
}));
