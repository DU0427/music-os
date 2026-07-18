import { create } from 'zustand';
import type { SpaceType } from '../../shared/types/world';

interface RuntimeSlice {
  currentSpace: SpaceType;
  isTransitioning: boolean;
  requestSpace: (space: SpaceType) => void;
  setCurrentSpace: (space: SpaceType) => void;
  setTransitioning: (isTransitioning: boolean) => void;
}

export const useRuntimeStore = create<RuntimeSlice>((set) => ({
  currentSpace: 'home',
  isTransitioning: false,
  requestSpace: (space) =>
    set((state) => {
      if (state.isTransitioning || state.currentSpace === space) {
        return state;
      }
      return {
        currentSpace: space,
        isTransitioning: true,
      };
    }),
  setCurrentSpace: (space) =>
    set((state) => {
      if (state.currentSpace === space) {
        return state;
      }
      return { currentSpace: space };
    }),
  setTransitioning: (isTransitioning) => set({ isTransitioning }),
}));

