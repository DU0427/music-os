'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { SpaceType, Song, MOCK_SONGS, MOCK_SPACES } from '@/lib/mock-data';

interface AppState {
  currentSpace: SpaceType;
  setCurrentSpace: (space: SpaceType) => void;
  currentSong: Song;
  setCurrentSong: (song: Song) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  isSearching: boolean;
  setIsSearching: (searching: boolean) => void;
  activeMood: string | null;
  setActiveMood: (mood: string | null) => void;
  isDetailOpen: boolean;
  setIsDetailOpen: (open: boolean) => void;
  isImmersive: boolean;
  setIsImmersive: (immersive: boolean) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentSpace, setCurrentSpace] = useState<SpaceType>('home');
  const [currentSong, setCurrentSong] = useState<Song>(MOCK_SONGS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeMood, setActiveMood] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isImmersive, setIsImmersive] = useState(false);

  return (
    <AppContext.Provider
      value={{
        currentSpace,
        setCurrentSpace,
        currentSong,
        setCurrentSong,
        isPlaying,
        setIsPlaying,
        isSearching,
        setIsSearching,
        activeMood,
        setActiveMood,
        isDetailOpen,
        setIsDetailOpen,
        isImmersive,
        setIsImmersive
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
}
