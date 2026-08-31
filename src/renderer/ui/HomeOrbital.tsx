'use client';

import { motion, AnimatePresence } from 'motion/react';
import { useAudioStore } from '../audio/store';
import { useRuntimeStore } from '../store/runtime';
import { useLibraryStore } from '../store/library';
import { useMoodStore } from '../store/mood';
import CoreVisualDom from './CoreVisualDom';
import { useState, useEffect, useRef } from 'react';

function OrbitRing({ size, opacity = 0.12, speed = 20, reverse = false, tilt = 60 }: { size: number; opacity?: number; speed?: number; reverse?: boolean; tilt?: number }) {
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const actualSpeed = isPlaying ? speed : speed * 3;
  return (
    <motion.div
      className="absolute top-1/2 left-1/2 pointer-events-none rounded-full"
      initial={{ width: 0, height: 0, opacity: 0, x: '-50%', y: '-50%', rotateX: tilt }}
      animate={{ width: size, height: size, opacity: 1, x: '-50%', y: '-50%', rotateX: tilt }}
      transition={{ duration: 2, ease: 'easeOut', delay: 0.5 }}
      style={{ border: `1px solid rgba(255,255,255,${opacity})` }}
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
  hint,
  x,
  y,
  color,
  size,
  onClick,
  id,
}: {
  title: string;
  subtitle: string;
  hint?: string;
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

        {/* label — higher contrast, tighter tracking */}
        <div className="absolute top-[122%] whitespace-nowrap opacity-90 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-30">
          <div className="flex flex-col items-center">
            {!hovered ? (
              <span className="font-sans text-[12.5px] text-white/85 drop-shadow-sm font-medium tracking-wide">{title}</span>
            ) : (
              <motion.div className="flex flex-col items-center text-center" initial={{ opacity: 0, y: -2 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <span className="font-sans text-[10px] text-white/55 mb-1 tracking-[0.12em] uppercase">{subtitle}</span>
                <span className="font-sans text-[12.5px] font-medium text-white drop-shadow-sm tracking-wide">{title}</span>
              </motion.div>
            )}
            {hint ? <span className="font-sans text-[10px] text-white/40 tracking-wide mt-0.5">{hint}</span> : null}
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
  const track = useAudioStore((s) => s.track);
  const canPlay = useAudioStore((s) => s.canPlay);
  const play = useAudioStore((s) => s.play);
  const pause = useAudioStore((s) => s.pause);
  const tracks = useLibraryStore((s) => s.tracks);
  const history = useLibraryStore((s) => s.history);
  const activeMood = useMoodStore((s) => s.activeMood);
  const inputRef = useRef<HTMLInputElement>(null);

  const MOOD_LABEL: Record<string, string> = { Night: '夜晚', Energy: '能量', Calm: '平静', Nostalgia: '怀旧' };

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
    else if (id === 'visualizer') requestSpace('visualizer');
  };

  const worldColor =
    track?.worldContext?.energyTarget === 'calm'
      ? '#78AFFF'
      : track?.worldContext?.energyTarget === 'electric'
        ? '#EA8E83'
        : '#1A2980';

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-10">
      {track && canPlay && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none mix-blend-screen"
          style={{
            background: `radial-gradient(ellipse at 50% 60%, ${worldColor} 0%, transparent 70%)`,
            opacity: isPlaying ? 0.16 : 0.10,
            transition: 'opacity 700ms ease',
          }}
        />
      )}
      {/* Central core — scaled down for breathing room */}
      <div className="relative z-20 pointer-events-auto">
        <CoreVisualDom size={isMobile ? 170 : 220} onClick={handleCoreClick} />
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-11 flex items-center justify-center pointer-events-none">
          <motion.div
            className="px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-md pointer-events-auto cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
            whileHover={{ scale: 1.04 }}
            onClick={() => {
              if (track && canPlay) {
                if (isPlaying) pause();
                else void play();
              } else {
                inputRef.current?.click();
              }
            }}
          >
            <span className="text-[10px] tracking-[0.14em] text-white/70 font-sans font-medium">
              {track && canPlay
                ? isPlaying
                  ? `‖ ${track.title}`
                  : `▶ ${track.title} — ${track.artist}`
                : track
                  ? '已恢复会话 · 请重新载入'
                  : '载入歌曲以进入'}
            </span>
          </motion.div>
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) await useAudioStore.getState().loadFile(f);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {/* Orbit rings + planets */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <OrbitRing size={getDist(420)} opacity={0.18} speed={40} tilt={TILT} />
        <OrbitRing size={getDist(580)} opacity={0.10} speed={60} tilt={TILT} />
        <OrbitRing size={getDist(740)} opacity={0.06} speed={80} reverse tilt={TILT} />

        <div className="absolute inset-0 pointer-events-auto flex items-center justify-center">
          <Planet id="visualizer" title="visualizer" subtitle="enter" hint="进入" {...getPos(300, -145)} color="#6EA8FF" size={getSize(68)} onClick={() => handlePlanetClick('visualizer')} />
          <Planet id="library" title="library" subtitle="explore" hint={tracks.length ? `${tracks.length} 首曲目` : '暂无曲目'} {...getPos(260, -35)} color="#B58CFF" size={getSize(58)} onClick={() => handlePlanetClick('library')} />
          <Planet id="memory" title="memory" subtitle="revisit" hint={history.length ? `${history.length} 次聆听` : '暂无记录'} {...getPos(290, 135)} color="#FFD27A" size={getSize(48)} onClick={() => handlePlanetClick('memory')} />
          <Planet id="mood" title="mood space" subtitle="shift" hint={activeMood ? `当前 · ${MOOD_LABEL[activeMood] ?? activeMood}` : undefined} {...getPos(340, 45)} color="#B58CFF" size={getSize(74)} onClick={() => handlePlanetClick('mood')} />
        </div>
      </motion.div>
    </div>
  );
}
