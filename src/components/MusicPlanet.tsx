'use client';

import { motion } from 'motion/react';
import { useState } from 'react';
import { useAppStore } from '@/lib/store';

interface MusicPlanetProps {
  id?: string;
  title: string;
  x: number;
  y: number;
  color: string;
  size: number;
  onClick: () => void;
  glowing?: boolean;
}

export default function MusicPlanet({ id = '', title, x, y, color, size, onClick, glowing }: MusicPlanetProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { isPlaying } = useAppStore();

  return (
    <motion.div
      className="absolute top-1/2 left-1/2 flex items-center justify-center group cursor-pointer z-10"
      initial={{ x: 0, y: 0, opacity: 0 }}
      animate={{ x, y, opacity: 1 }}
      transition={{ duration: 2, ease: "easeOut", delay: 0.5 }}
      style={{ width: size, height: size, marginLeft: -size/2, marginTop: -size/2 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Slow orbit container */}
      <motion.div 
        className="relative w-full h-full flex items-center justify-center"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        
        {/* The Planet / Portal */}
        <div 
          className="relative transition-transform duration-500 ease-out group-hover:scale-105 flex items-center justify-center"
          style={{ width: '100%', height: '100%' }}
        >
          {/* Subtle interaction bounds */}
          <div className="absolute inset-0 rounded-full bg-white/[0.01] group-hover:bg-white/[0.03] transition-colors" />

          {/* VISUALIZER WORLD */}
          {id === 'visualizer' && (
            <>
              <div className="absolute inset-0 bg-black/50 rounded-full backdrop-blur-md border border-white/10" />
              <motion.div 
                className="absolute inset-[10%] opacity-60 blur-[6px] rounded-full mix-blend-screen"
                style={{ background: `conic-gradient(from 0deg at 50% 50%, transparent, ${color}, transparent)` }}
                animate={{ rotate: 360 }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              />
              <motion.div 
                className="absolute inset-[25%] rounded-full border border-white/20 mix-blend-screen"
                style={{ boxShadow: `inset 0 0 10px ${color}, 0 0 20px ${color}` }}
                animate={{ scale: isHovered ? [1, 1.3, 1] : [1, 1.1, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="absolute inset-[35%] bg-white rounded-full blur-[4px]" />
            </>
          )}

          {/* LIBRARY GALAXY */}
          {id === 'library' && (
            <>
              <div className="absolute inset-0 bg-black/40 rounded-full backdrop-blur-md border border-white/10 overflow-hidden">
                <div className="absolute inset-[-50%] bg-[url('https://picsum.photos/seed/library/200/200')] opacity-20 mix-blend-overlay" />
              </div>
              <div className="absolute inset-[30%] rounded-full bg-white shadow-[0_0_20px_#B58CFF]" />
              <div className="absolute inset-[20%] rounded-full bg-primary-blue/30 blur-[15px] mix-blend-screen" />
              
              <motion.div className="absolute inset-[-20%]" animate={{ rotate: 360 }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }}>
                <div className="absolute top-[10%] left-[50%] w-1.5 h-1.5 bg-white/90 rounded-full shadow-[0_0_5px_#fff]" />
                <div className="absolute top-[25%] left-[15%] w-1 h-1 bg-primary-blue rounded-full shadow-[0_0_5px_#6EA8FF]" />
              </motion.div>
              <motion.div className="absolute inset-[10%]" animate={{ rotate: -360 }} transition={{ duration: 35, repeat: Infinity, ease: "linear" }}>
                <div className="absolute bottom-[10%] right-[30%] w-1 h-1 bg-accent-violet rounded-full shadow-[0_0_5px_#B58CFF]" />
              </motion.div>
              
              <div className="absolute inset-[15%] rounded-full border border-primary-blue/20" />
            </>
          )}

          {/* MUSIC MEMORY */}
          {id === 'memory' && (
            <>
              <div className="absolute inset-0 bg-black/40 rounded-full backdrop-blur-md border border-white/10" />
              <div className="absolute inset-[20%] bg-warm-gold/20 mix-blend-screen blur-[15px] rounded-full" />
              
              <motion.div className="absolute inset-0" animate={{ rotate: 360 }} transition={{ duration: 50, repeat: Infinity, ease: "linear" }}>
                <div className="absolute top-[25%] left-[30%] w-1.5 h-1.5 rounded-full bg-warm-gold shadow-[0_0_10px_#FFD27A]" />
                <div className="absolute top-[50%] left-[70%] w-1 h-1 rounded-full bg-white shadow-[0_0_5px_#fff]" />
                <div className="absolute top-[65%] left-[30%] w-1.5 h-1.5 rounded-full bg-warm-gold shadow-[0_0_12px_#FFD27A]" />
                
                <div className="absolute top-[37.5%] left-[50%] w-[30%] h-[1px] bg-warm-gold/30 origin-left rotate-[-30deg]" />
                <div className="absolute top-[50%] left-[70%] w-[45%] h-[1px] bg-warm-gold/20 origin-left rotate-[145deg]" />
              </motion.div>
            </>
          )}

          {/* MOOD SPACE */}
          {id === 'mood' && (
            <>
              <div className="absolute inset-0 bg-black/40 rounded-full backdrop-blur-md border border-white/10 overflow-hidden" />
              <motion.div 
                className="absolute inset-[-10%] opacity-60 mix-blend-screen blur-[15px] rounded-full"
                style={{ background: `radial-gradient(circle at 30% 30%, ${color}, transparent 60%)` }}
                animate={{ scale: isHovered ? [1, 1.2, 1] : [1, 1.05, 1], rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              />
              <motion.div 
                className="absolute inset-[-10%] opacity-50 mix-blend-screen blur-[12px] rounded-full"
                style={{ background: `radial-gradient(circle at 70% 70%, #B58CFF, transparent 60%)` }}
                animate={{ scale: [1, 1.1, 1], rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              />
              <div className="absolute inset-[35%] bg-white/40 rounded-full blur-[6px]" />
            </>
          )}

        </div>

        {/* Label */}
        <div className="absolute top-[120%] whitespace-nowrap opacity-60 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-30">
          <div className="flex flex-col items-center">
            {!isHovered && (
              <span className="font-sans text-[13px] text-white/70 drop-shadow-sm font-medium">
                {title}
              </span>
            )}
            {isHovered && (
              <motion.div 
                className="flex flex-col items-center text-center"
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <span className="font-sans text-[11px] text-white/50 mb-1 tracking-wide">
                  {id === 'visualizer' && '进入'}
                  {id === 'library' && '探索'}
                  {id === 'memory' && '回到记忆'}
                  {id === 'mood' && '切换情绪'}
                </span>
                <span className="font-sans text-[13px] font-medium text-white/90 drop-shadow-sm">
                  {id === 'visualizer' && '可视化世界'}
                  {id === 'library' && '图书馆'}
                  {id === 'memory' && '记忆 2019'}
                  {id === 'mood' && '梦境、夜晚、宁静'}
                </span>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
