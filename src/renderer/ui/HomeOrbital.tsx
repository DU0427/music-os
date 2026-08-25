'use client';

import { motion, AnimatePresence } from 'motion/react';
import { useAudioStore } from '../audio/store';
import { useRuntimeStore } from '../store/runtime';
import CoreVisualDom from './CoreVisualDom';
import { useState, useEffect } from 'react';

function OrbitRing({ size, opacity = 0.1, speed = 20, reverse = false, tilt = 60 }: { size: number; opacity?: number; speed?: number; reverse?: boolean; tilt?: number }) {
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const actualSpeed = isPlaying ? speed : speed * 3;
  return (
    <motion.div
      className="absolute top-1/2 left-1/2 pointer-events-none rounded-full border border-white/5"
      initial={{ width: 0, height: 0, opacity: 0, x: '-50%', y: '-50%', rotateX: tilt }}
      animate={{ width: size, height: size, opacity: opacity * 0.5, x: '-50%', y: '-50%', rotateX: tilt }}
      transition={{ duration: 2, ease: 'easeOut', delay: 0.5 }}
      style={{ borderColor: `rgba(255,255,255,${opacity * 0.5})` }}
    >
      <motion.div
        className="w-full h-full rounded-full"
        animate={{ rotateZ: reverse ? -360 : 360 }}
        transition={{ duration: actualSpeed, repeat: Infinity, ease: 'linear' }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-[2px] bg-white/40 rounded-full shadow-[0_0_5px_rgba(255,255,255,0.3)]"
          style={{ transform: `rotateX(${-tilt}deg)` }}
        />
      </motion.div>
    </motion.div>
  );
}

function Planet({
  title,
  subtitle,
  x,
  y,
  color,
  size,
  onClick,
  id,
}: {
  title: string;
  subtitle: string;
  x: number;
  y: number;
  color: string;
  size: number;
  onClick: () => void;
  id: string;
}) {
  const [hovered, setHovered] = useState(false);
  const isPlaying = useAudioStore((s) => s.isPlaying);

  return (
    <motion.div
      className="absolute top-1/2 left-1/2 flex items-center justify-center group cursor-pointer z-10"
      initial={{ x: 0, y: 0, opacity: 0 }}
      animate={{ x, y, opacity: 1 }}
      transition={{ duration: 2, ease: 'easeOut', delay: 0.5 }}
      style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <motion.div className="relative w-full h-full flex items-center justify-center" animate={{ y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
        <div className="relative transition-transform duration-500 ease-out group-hover:scale-105 flex items-center justify-center w-full h-full">
          <div className="absolute inset-0 rounded-full bg-white/[0.01] group-hover:bg-white/[0.04] transition-colors" />
          {/* visual per id */}
          {id === 'visualizer' && (
            <>
              <div className="absolute inset-0 bg-black/50 rounded-full backdrop-blur-md border border-white/10" />
              <motion.div
                className="absolute inset-[10%] opacity-60 blur-[6px] rounded-full mix-blend-screen"
                style={{ background: `conic-gradient(from 0deg at 50% 50%, transparent, ${color}, transparent)` }}
                animate={{ rotate: 360 }}
                transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute inset-[25%] rounded-full border border-white/20 mix-blend-screen"
                style={{ boxShadow: `inset 0 0 10px ${color}, 0 0 20px ${color}` }}
                animate={{ scale: hovered ? [1, 1.3, 1] : [1, 1.1, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="absolute inset-[35%] bg-white rounded-full blur-[3px]" />
            </>
          )}
          {id === 'library' && (
            <>
              <div className="absolute inset-0 bg-black/40 rounded-full backdrop-blur-md border border-white/10 overflow-hidden" />
              <div className="absolute inset-[30%] rounded-full bg-white shadow-[0_0_20px_#B58CFF]" />
              <div className="absolute inset-[20%] rounded-full bg-[#6EA8FF]/30 blur-[15px] mix-blend-screen" />
              <motion.div className="absolute inset-[-20%]" animate={{ rotate: 360 }} transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}>
                <div className="absolute top-[10%] left-[50%] w-1.5 h-1.5 bg-white/90 rounded-full shadow-[0_0_5px_#fff]" />
                <div className="absolute top-[25%] left-[15%] w-1 h-1 bg-[#6EA8FF] rounded-full" />
              </motion.div>
              <motion.div className="absolute inset-[10%]" animate={{ rotate: -360 }} transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}>
                <div className="absolute bottom-[10%] right-[30%] w-1 h-1 bg-[#B58CFF] rounded-full" />
              </motion.div>
            </>
          )}
          {id === 'memory' && (
            <>
              <div className="absolute inset-0 bg-black/40 rounded-full backdrop-blur-md border border-white/10" />
              <div className="absolute inset-[20%] bg-[#FFD27A]/20 mix-blend-screen blur-[15px] rounded-full" />
              <motion.div className="absolute inset-0" animate={{ rotate: 360 }} transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}>
                <div className="absolute top-[25%] left-[30%] w-1.5 h-1.5 rounded-full bg-[#FFD27A] shadow-[0_0_10px_#FFD27A]" />
                <div className="absolute top-[50%] left-[70%] w-1 h-1 rounded-full bg-white" />
                <div className="absolute top-[65%] left-[30%] w-1.5 h-1.5 rounded-full bg-[#FFD27A]" />
                <div className="absolute top-[37.5%] left-[50%] w-[30%] h-[1px] bg-[#FFD27A]/30 origin-left rotate-[-30deg]" />
                <div className="absolute top-[50%] left-[70%] w-[45%] h-[1px] bg-[#FFD27A]/20 origin-left rotate-[145deg]" />
              </motion.div>
            </>
          )}
          {id === 'mood' && (
            <>
              <div className="absolute inset-0 bg-black/40 rounded-full backdrop-blur-md border border-white/10 overflow-hidden" />
              <motion.div
                className="absolute inset-[-10%] opacity-60 mix-blend-screen blur-[15px] rounded-full"
                style={{ background: `radial-gradient(circle at 30% 30%, ${color}, transparent 60%)` }}
                animate={{ scale: hovered ? [1, 1.2, 1] : [1, 1.05, 1], rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute inset-[-10%] opacity-50 mix-blend-screen blur-[12px] rounded-full"
                style={{ background: `radial-gradient(circle at 70% 70%, #B58CFF, transparent 60%)` }}
                animate={{ scale: [1, 1.1, 1], rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
              />
              <div className="absolute inset-[35%] bg-white/40 rounded-full blur-[6px]" />
            </>
          )}
        </div>

        {/* label */}
        <div className="absolute top-[120%] whitespace-nowrap opacity-60 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-30">
          <div className="flex flex-col items-center">
            {!hovered ? (
              <span className="font-sans text-[13px] text-white/70 drop-shadow-sm font-medium">{title}</span>
            ) : (
              <motion.div className="flex flex-col items-center text-center" initial={{ opacity: 0, y: -2 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <span className="font-sans text-[11px] text-white/50 mb-1 tracking-wide">{subtitle}</span>
                <span className="font-sans text-[13px] font-medium text-white/90 drop-shadow-sm">{title}</span>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function HomeOrbital({ onCoreClick }: { onCoreClick?: () => void }) {
  const requestSpace = useRuntimeStore((s) => s.requestSpace);
  const canEnterMidnight = useAudioStore((s) => Boolean(s.canPlay && s.track));
  const isPlaying = useAudioStore((s) => s.isPlaying);

  // responsive sizing
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const TILT = 60;
  const cosTilt = Math.cos((TILT * Math.PI) / 180);
  const getDist = (d: number) => (isMobile ? d * 0.55 : d);
  const getSize = (s: number) => (isMobile ? s * 0.75 : s);
  const getPos = (radius: number, angle: number) => {
    const rad = (angle * Math.PI) / 180;
    const r = getDist(radius);
    return { x: Math.cos(rad) * r, y: Math.sin(rad) * r * cosTilt };
  };

  const handleEnter = () => {
    if (canEnterMidnight) requestSpace('midnight');
  };

  const handleCoreClick = () => {
    if (onCoreClick && canEnterMidnight) onCoreClick();
    else handleEnter();
  };

  const handlePlanetClick = (id: string) => {
    if (id === 'library') requestSpace('library');
    else if (id === 'memory') requestSpace('memory');
    else if (id === 'mood') requestSpace('mood');
    else if (id === 'visualizer') handleEnter();
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-10">
      {/* Central core */}
      <div className="relative z-20 pointer-events-auto">
        <CoreVisualDom size={isMobile ? 180 : 260} onClick={handleCoreClick} />
        {/* floating control pill on hover is handled inside CoreVisualDom+HomeOrbital interaction below */}
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-14 flex items-center justify-center pointer-events-none">
          <motion.div
            className="px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md pointer-events-auto cursor-pointer"
            whileHover={{ scale: 1.05 }}
            onClick={() => (isPlaying ? useAudioStore.getState().pause() : void useAudioStore.getState().play())}
          >
            <span className="text-[10px] tracking-[0.14em] uppercase text-white/60 font-sans">
              {canEnterMidnight ? (isPlaying ? 'playing — click core to enter' : 'click core to enter') : 'load a song to enter'}
            </span>
          </motion.div>
        </div>
      </div>

      {/* Orbit rings + planets */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <OrbitRing size={getDist(500)} opacity={0.15} speed={40} tilt={TILT} />
        <OrbitRing size={getDist(700)} opacity={0.08} speed={60} tilt={TILT} />
        <OrbitRing size={getDist(900)} opacity={0.04} speed={80} reverse tilt={TILT} />

        <div className="absolute inset-0 pointer-events-auto flex items-center justify-center">
          <Planet id="visualizer" title="visualizer" subtitle="enter" {...getPos(380, -145)} color="#6EA8FF" size={getSize(70)} onClick={() => handlePlanetClick('visualizer')} />
          <Planet id="library" title="library" subtitle="explore" {...getPos(320, -35)} color="#B58CFF" size={getSize(60)} onClick={() => handlePlanetClick('library')} />
          <Planet id="memory" title="memory" subtitle="revisit" {...getPos(360, 135)} color="#FFD27A" size={getSize(50)} onClick={() => handlePlanetClick('memory')} />
          <Planet id="mood" title="mood space" subtitle="shift" {...getPos(420, 45)} color="#B58CFF" size={getSize(80)} onClick={() => handlePlanetClick('mood')} />
        </div>

        <motion.div
          className="absolute top-8 left-8 text-white/30 font-sans tracking-widest text-[9px] font-medium pointer-events-none uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5, duration: 2 }}
        >
          booting your universe.
          <br />
          <span className="text-white/20">music os v0.1</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
