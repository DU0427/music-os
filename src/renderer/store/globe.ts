import { create } from 'zustand';

interface GlobeSlice {
  /** 当前选中的地区（语种）id；null 表示未选中。 */
  selectedRegionId: string | null;
  setSelectedRegion: (id: string | null) => void;
}

export const useGlobeStore = create<GlobeSlice>((set) => ({
  selectedRegionId: null,
  setSelectedRegion: (id) => set({ selectedRegionId: id }),
}));
