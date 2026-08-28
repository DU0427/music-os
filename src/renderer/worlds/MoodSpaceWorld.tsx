'use client';

import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { useRuntimeStore } from '../store/runtime';
import { useMoodStore } from '../store/mood';

const MOODS = [
  { id: 'Night', label: '夜晚', color: '#1A2980', angle: -90, radius: 230, size: 90 },
  { id: 'Energy', label: '能量', angle: 0, radius: 230, size: 100, color: '#F0B56A' },
  { id: 'Calm', label: '平静', angle: 90, radius: 230, size: 80, color: '#78AFFF' },
  { id: 'Nostalgia', label: '怀旧', angle: 180, radius: 230, size: 85, color: '#EA8E83' },
];

const MOOD_LABEL: Record<string, string> = {
  Night: '夜晚',
  Energy: '能量',
  Calm: '平静',
  Nostalgia: '怀旧',
};

export default function MoodSpaceWorld() {
  const requestSpace = useRuntimeStore((s) => s.requestSpace);
  const activeMood = useMoodStore((s) => s.activeMood);
  const persist = useMoodStore((s) => s.persist);

  const selectMood = async (mood: string) => {
    const next = activeMood === mood ? null : mood;
    void persist(next);
  };

  const getPos = (radius: number, angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius };
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      <button
        onClick={() => requestSpace('home')}
        className="absolute top-24 left-10 z-20 flex items-center gap-2 text-white/50 hover:text-white transition-colors pointer-events-auto"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="font-sans tracking-[0.14em] text-[11px] uppercase">返回</span>
      </button>

      {/* atmospheric tint */}
      <motion.div
        className="absolute inset-0 mix-blend-screen pointer-events-none transition-colors duration-700"
        style={{
          background:
            activeMood === 'Night'
              ? 'radial-gradient(circle at 50% 50%, rgba(26,41,128,0.28) 0%, transparent 75%)'
              : activeMood === 'Energy'
                ? 'radial-gradient(circle at 50% 50%, rgba(240,181,106,0.18) 0%, transparent 75%)'
                : activeMood === 'Calm'
                  ? 'radial-gradient(circle at 50% 50%, rgba(120,175,255,0.18) 0%, transparent 75%)'
                  : activeMood === 'Nostalgia'
                    ? 'radial-gradient(circle at 50% 50%, rgba(234,142,131,0.18) 0%, transparent 75%)'
                    : 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.02) 0%, transparent 75%)',
        }}
      />

      <div className="absolute inset-0 pointer-events-auto flex items-center justify-center">
        {MOODS.map((m) => {
          const pos = getPos(m.radius, m.angle);
          const isActive = activeMood === m.id;
          return (
            <motion.div
              key={m.id}
              className="absolute flex items-center justify-center group cursor-pointer"
              style={{ width: m.size, height: m.size, x: pos.x, y: pos.y }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: isActive ? 1.14 : 1 }}
              transition={{ duration: 0.8 }}
              onClick={() => void selectMood(m.id)}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <div
                  className="absolute inset-0 rounded-full backdrop-blur-md border transition-all"
                  style={{
                    background: isActive ? `${m.color}22` : 'rgba(0,0,0,0.35)',
                    borderColor: isActive ? `${m.color}66` : 'rgba(255,255,255,0.08)',
                    boxShadow: isActive ? `0 0 28px ${m.color}50, inset 0 0 18px ${m.color}20` : 'none',
                  }}
                />
                <div className="absolute inset-[28%] rounded-full blur-[12px] opacity-60" style={{ background: m.color }} />
                <div className="absolute inset-[38%] bg-white/80 rounded-full blur-[1px]" />
                {isActive && <motion.div className="absolute inset-[-8%] rounded-full border border-white/15" animate={{ scale: [1, 1.06, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2, repeat: Infinity }} />}
              </div>
              <div className="absolute top-[115%] left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className={`font-sans text-[11px] tracking-wide ${isActive ? 'text-white/90' : 'text-white/55'}`}>{m.label}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {activeMood && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none text-center z-20"
          >
            <div className="font-mono text-[10px] tracking-[0.32em] text-white/40 mb-2 uppercase">当前情绪</div>
            <h2 className="font-sans text-3xl text-white/90 tracking-wide mb-4">{MOOD_LABEL[activeMood] ?? activeMood}</h2>
            <button
              className="px-7 py-2.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-md text-white/85 font-sans tracking-wide text-[11px] hover:bg-white/10 hover:border-white/30 transition-all pointer-events-auto"
              onClick={() => requestSpace('midnight')}
            >
              带着此情绪进入 →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!activeMood && (
        <div className="absolute bottom-28 right-12 text-right pointer-events-none hidden md:block">
          <h3 className="font-sans text-white/60 tracking-[0.14em] text-[11px] uppercase">情绪空间</h3>
          <p className="font-sans text-white/25 text-[11px] mt-1">选择一个情绪 — 让世界随之染色</p>
        </div>
      )}

      <div id="mood-space-world" data-testid="mood-world" style={{ display: 'none' }} />
    </div>
  );
}
