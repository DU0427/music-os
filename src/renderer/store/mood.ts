import { create } from 'zustand';

interface MoodState {
  activeMood: string | null;
  setActiveMood: (mood: string | null) => void;
  load: () => Promise<void>;
  persist: (mood: string | null) => Promise<void>;
}

export const useMoodStore = create<MoodState>((set) => ({
  activeMood: null,
  setActiveMood: (activeMood) => set({ activeMood }),
  load: async () => {
    if (typeof window.musicOS?.getWorldSetting !== 'function') return;
    try {
      const rec = await window.musicOS.getWorldSetting('activeMood');
      if (rec?.value) set({ activeMood: rec.value || null });
    } catch {}
  },
  persist: async (mood) => {
    set({ activeMood: mood });
    if (typeof window.musicOS?.setWorldSetting !== 'function') return;
    try {
      await window.musicOS.setWorldSetting({ key: 'activeMood', value: mood ?? '', updatedAt: new Date().toISOString() });
    } catch {}
  },
}));
