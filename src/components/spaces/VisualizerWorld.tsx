'use client';

import { useAppStore } from '@/lib/store';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

export default function VisualizerWorld() {
  const { setCurrentSpace, currentSong } = useAppStore();

  return (
    <div className="relative w-full h-full">
      <button 
        onClick={() => setCurrentSpace('home')}
        className="absolute top-8 left-8 z-50 flex items-center gap-2 text-white/50 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-display tracking-[0.2em] text-sm">EXIT WORLD</span>
      </button>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        
        {/* Large World Visualizer */}
        <motion.div 
          className="absolute inset-0 opacity-40 mix-blend-screen"
          style={{ 
            background: `radial-gradient(ellipse at bottom, ${currentSong.coverGradient[0]} 0%, transparent 80%)` 
          }}
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.05, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        
        <motion.div 
          className="absolute inset-0 opacity-20 mix-blend-color-dodge"
          style={{ 
            background: `radial-gradient(ellipse at top, ${currentSong.coverGradient[1]} 0%, transparent 80%)` 
          }}
          animate={{ opacity: [0.1, 0.4, 0.1], scale: [1.1, 1, 1.1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Abstract Geometry to simulate a "world" */}
        <div className="absolute bottom-0 w-full h-[40%] bg-gradient-to-t from-[#0B1621] to-transparent pointer-events-none" />
        <div className="absolute bottom-0 w-full h-px bg-electric-cyan/20 shadow-[0_0_20px_#7DE7E2]" />
        
        {/* Perspective grid lines */}
        <div className="absolute bottom-0 w-full h-[30%] perspective-[500px] flex justify-center opacity-10">
          <div className="w-[200%] h-full border-t border-electric-cyan" style={{ transform: 'rotateX(60deg)' }}>
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="absolute h-full border-l border-electric-cyan" style={{ left: `${(i / 20) * 100}%` }} />
            ))}
          </div>
        </div>

      </div>

      <div className="absolute bottom-32 left-12 z-50 pointer-events-auto">
        <h2 className="font-display text-4xl text-white/90 tracking-widest mb-2 drop-shadow-lg">
          NEON METROPOLIS
        </h2>
        <div className="flex gap-2 text-xs font-mono text-electric-cyan">
          <span className="border border-electric-cyan/30 px-2 py-1 rounded">DREAMY</span>
          <span className="border border-electric-cyan/30 px-2 py-1 rounded">URBAN</span>
        </div>
      </div>
    </div>
  );
}
