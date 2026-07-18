'use client';

import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '@/lib/store';
import { useState } from 'react';
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import CoreVisual from './CoreVisual';

export default function MusicCore() {
  const { currentSong, isPlaying, setIsPlaying, isDetailOpen, setIsDetailOpen, isImmersive, setIsImmersive } = useAppStore();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className="relative flex flex-col items-center justify-center cursor-pointer group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ 
        scale: isImmersive ? 1.5 : (isDetailOpen ? 1.1 : 1), 
        opacity: 1,
        y: isImmersive ? 50 : 0,
        x: isDetailOpen ? -350 : 0
      }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* --- SPATIAL INFO LABELS (Floating above the core) --- */}
      <AnimatePresence>
        {!isImmersive && !isDetailOpen && (
          <motion.div 
            className="absolute -top-32 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none w-96"
            initial={{ opacity: 0, filter: 'blur(10px)', y: 10 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            exit={{ opacity: 0, filter: 'blur(10px)', y: -10 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex flex-col items-center text-center">
              <div className="font-sans text-2xl text-white/90 font-medium tracking-tight drop-shadow-md">{currentSong.title}</div>
              <div className="font-sans text-[14px] text-white/50 mt-1">{currentSong.artist}</div>
              
              <div className="flex items-center gap-3 mt-4">
                <div className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                  <span className="font-sans text-[10px] text-white/50 tracking-widest uppercase">{currentSong.mood}</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-white/20" />
                <div className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                  <span className="font-sans text-[10px] text-white/50 tracking-widest uppercase">{currentSong.energy}% Energy</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- OUTER ORBITAL PROGRESS RINGS --- */}
      <div className="absolute inset-[-60px] md:inset-[-80px] pointer-events-none">
        {/* Deep outer ring */}
        <motion.div 
          className="absolute inset-[-40px] rounded-full border border-white/[0.03]"
          animate={{ rotate: -360 }}
          transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute top-[15%] left-[15%] w-1 h-1 rounded-full bg-white/20 blur-[1px]" />
          <div className="absolute bottom-[20%] right-[10%] w-1.5 h-1.5 rounded-full bg-primary-blue/30 blur-[2px]" />
        </motion.div>

        {/* Subtle eccentric track */}
        <motion.div 
          className="absolute inset-0 rounded-full border border-white/5"
          style={{ transformOrigin: '48% 52%' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute top-0 left-1/2 w-1.5 h-1.5 rounded-full bg-white/40 shadow-[0_0_10px_rgba(255,255,255,0.5)] -translate-x-1/2 -translate-y-1/2" />
        </motion.div>
        
        {/* Progress arc (simulated) */}
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="50%" cy="50%" r="48%"
            fill="none"
            stroke="rgba(255,255,255,0.03)"
            strokeWidth="1"
          />
          <motion.circle
            cx="50%" cy="50%" r="48%"
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="1.5"
            strokeDasharray="1000"
            initial={{ strokeDashoffset: 1000 }}
            animate={{ strokeDashoffset: isPlaying ? 300 : 800 }}
            transition={{ duration: isPlaying ? 240 : 2, ease: isPlaying ? "linear" : "easeOut" }}
            style={{ filter: isPlaying ? 'drop-shadow(0 0 4px rgba(255,255,255,0.2))' : 'none' }}
          />
        </svg>
        
        {/* Audio response ripples */}
        {isPlaying && (
          <motion.div
            className="absolute inset-8 rounded-full border border-primary-blue/10"
            animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>

      {/* --- THE CORE SPHERE --- */}
      <CoreVisual 
        layoutId="music-core-sphere" 
        onClick={() => !isImmersive && setIsDetailOpen(!isDetailOpen)} 
      />

      {/* Contextual Floating Controls (Vision Pro Style) */}
      <AnimatePresence>
        {isHovered && !isImmersive && !isDetailOpen && (
          <motion.div
            className="absolute -bottom-28 left-1/2 -translate-x-1/2 z-30 flex items-center justify-between px-2 py-1.5 w-72 rounded-full bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] pointer-events-auto"
            initial={{ opacity: 0, y: -10, filter: 'blur(5px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(5px)' }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left Controls */}
            <div className="flex items-center justify-center flex-1 gap-2">
              <button className="text-white/40 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10">
                <SkipBack className="w-4 h-4" fill="currentColor" />
              </button>
              
              <button 
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" fill="currentColor" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
                )}
              </button>
              
              <button className="text-white/40 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10">
                <SkipForward className="w-4 h-4" fill="currentColor" />
              </button>
            </div>

            <div className="w-[1px] h-6 bg-white/10 mx-1" />

            {/* Right Action */}
            <div className="flex items-center justify-center px-4">
              <button
                className="group flex items-center text-white/50 hover:text-white transition-colors"
                onClick={() => setIsImmersive(true)}
              >
                <span className="font-sans text-[11px] font-medium tracking-wide">Enter</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
