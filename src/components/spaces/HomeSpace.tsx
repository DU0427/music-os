'use client';

import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'motion/react';
import MusicCore from '../MusicCore';
import OrbitRing from '../OrbitRing';
import MusicPlanet from '../MusicPlanet';
import { useIsMobile } from '@/hooks/use-mobile';
import { X } from 'lucide-react';

export default function HomeSpace() {
  const { setCurrentSpace, isImmersive, setIsImmersive } = useAppStore();
  const isMobile = useIsMobile();
  
  // Tilted orbit calculations
  const TILT = 60;
  const cosTilt = Math.cos((TILT * Math.PI) / 180);
  
  // Scale down distances and sizes on mobile
  const getDist = (d: number) => isMobile ? d * 0.6 : d;
  const getSize = (s: number) => isMobile ? s * 0.8 : s;

  const getPos = (radius: number, angle: number) => {
    const rad = (angle * Math.PI) / 180;
    const scaledRadius = getDist(radius);
    return {
      x: Math.cos(rad) * scaledRadius,
      y: Math.sin(rad) * scaledRadius * cosTilt
    };
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center pointer-events-none overflow-hidden">
      
      {/* Central Core */}
      <div className="relative z-20 pointer-events-auto">
        <MusicCore />
      </div>

      {/* Orbit Rings & Portals - Hide in immersive */}
      <AnimatePresence>
        {!isImmersive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {/* Orbit Rings */}
            <OrbitRing size={getDist(500)} opacity={0.15} speed={40} reverse tilt={TILT} />
            <OrbitRing size={getDist(700)} opacity={0.08} speed={60} tilt={TILT} />
            <OrbitRing size={getDist(900)} opacity={0.04} speed={80} reverse tilt={TILT} />

            {/* Satellites / Portals */}
            <div className="absolute inset-0 pointer-events-auto flex items-center justify-center">
              {/* Visualizer World Node (Top-Left) */}
              <MusicPlanet 
                id="visualizer"
                title="可视化世界"
                {...getPos(380, -145)}
                color="#6EA8FF" 
                size={getSize(70)}
                onClick={() => setCurrentSpace('visualizer')}
              />

              {/* Library Galaxy Node (Top-Right) */}
              <MusicPlanet 
                id="library"
                title="图书馆"
                {...getPos(320, -35)}
                color="#B58CFF" 
                size={getSize(60)}
                onClick={() => setCurrentSpace('library')}
              />
              
              {/* Memory Field Node (Bottom-Left) */}
              <MusicPlanet 
                id="memory"
                title="记忆场" 
                {...getPos(360, 135)}
                color="#FFD27A" 
                size={getSize(50)}
                onClick={() => setCurrentSpace('memory')}
              />

              {/* Mood Space Node (Bottom-Right) */}
              <MusicPlanet 
                id="mood"
                title="情绪空间" 
                {...getPos(420, 45)}
                color="#B58CFF" 
                size={getSize(80)}
                onClick={() => setCurrentSpace('mood')}
                glowing
              />
            </div>

            {/* Status Message */}
            <motion.div 
              className="absolute top-8 left-8 text-white/30 font-sans tracking-widest text-[9px] font-medium pointer-events-none uppercase"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.5, duration: 2 }}
            >
              正在你的宇宙中启动。
              <br />
              <span className="text-white/20">记忆宇宙 v2</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit Immersive Button */}
      <AnimatePresence>
        {isImmersive && (
          <motion.button
            className="absolute top-8 right-8 z-50 p-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/90 transition-all pointer-events-auto backdrop-blur-md"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setIsImmersive(false)}
          >
            <X className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

    </div>
  );
}
