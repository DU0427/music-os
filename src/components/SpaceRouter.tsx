'use client';

import { useAppStore } from '@/lib/store';
import HomeSpace from './spaces/HomeSpace';
import LibraryGalaxy from './spaces/LibraryGalaxy';
import MoodSpace from './spaces/MoodSpace';
import MemoryField from './spaces/MemoryField';
import VisualizerWorld from './spaces/VisualizerWorld';
import { AnimatePresence, motion } from 'motion/react';

export default function SpaceRouter() {
  const { currentSpace } = useAppStore();

  const renderSpace = () => {
    switch (currentSpace) {
      case 'home': return <HomeSpace key="home" />;
      case 'library': return <LibraryGalaxy key="library" />;
      case 'mood': return <MoodSpace key="mood" />;
      case 'memory': return <MemoryField key="memory" />;
      case 'visualizer': return <VisualizerWorld key="visualizer" />;
      default: return <HomeSpace key="home" />;
    }
  };

  return (
    <div className="absolute inset-0 perspective-[1000px] flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSpace}
          initial={{ opacity: 0, scale: 0.85, z: -200 }}
          animate={{ opacity: 1, scale: 1, z: 0 }}
          exit={{ opacity: 0, scale: 1.15, z: 200 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 flex items-center justify-center w-full h-full transform-style-3d"
        >
          {renderSpace()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
