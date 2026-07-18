'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';

export function useKeyboardShortcuts() {
  const { setCurrentSpace, isPlaying, setIsPlaying } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          setIsPlaying(!isPlaying);
          break;
        case 'm':
          setCurrentSpace('mood');
          break;
        case 'l':
          setCurrentSpace('library');
          break;
        case 'r':
          setCurrentSpace('memory');
          break;
        case 'v':
          setCurrentSpace('visualizer');
          break;
        case 'escape':
          setCurrentSpace('home');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCurrentSpace, isPlaying, setIsPlaying]);
}
