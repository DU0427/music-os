'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Library, History, Smile, Globe2 } from 'lucide-react';
import { useState } from 'react';
import { useRuntimeStore } from '../store/runtime';
import { useMoodStore } from '../store/mood';
import { withAlpha } from '../hooks/useDominantColor';

const MOOD_OPTIONS: Array<{ id: string | null; label: string }> = [
  { id: null, label: '无' },
  { id: 'Night', label: '夜晚' },
  { id: 'Energy', label: '能量' },
  { id: 'Calm', label: '平静' },
  { id: 'Nostalgia', label: '怀旧' },
];

function StageOrb({
  icon: Icon,
  label,
  active,
  activeColor,
  onClick,
}: {
  icon: typeof Library;
  label: string;
  active?: boolean;
  activeColor?: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="relative flex flex-col items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <AnimatePresence>
        {hovered && (
          <motion.div
            className="absolute -top-9 whitespace-nowrap pointer-events-none"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18 }}
            style={{
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--mo-ink-muted)',
            }}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        type="button"
        aria-label={label}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        onClick={onClick}
        className="pointer-events-auto grid place-items-center rounded-full"
        style={{
          width: 42,
          height: 42,
          background: active ? withAlpha(activeColor ?? '#f5f5f7', 0.16) : 'var(--mo-bg-elevated)',
          border: `1px solid ${active ? withAlpha(activeColor ?? '#f5f5f7', 0.35) : 'var(--mo-line)'}`,
          backdropFilter: 'blur(22px) saturate(1.15)',
          WebkitBackdropFilter: 'blur(22px) saturate(1.15)',
          boxShadow: active ? `0 0 24px ${withAlpha(activeColor ?? '#f5f5f7', 0.3)}` : 'none',
          color: active ? (activeColor ?? '#f5f5f7') : 'var(--mo-ink-muted)',
          transition: 'color 300ms var(--mo-ease), box-shadow 300ms var(--mo-ease)',
        }}
      >
        <Icon className="w-4 h-4" strokeWidth={1.5} />
      </motion.button>
    </div>
  );
}

/** 左下角常驻入口：曲库 / 记忆 / 情绪滤镜。 */
export default function StageChips() {
  const requestSpace = useRuntimeStore((s) => s.requestSpace);
  const activeMood = useMoodStore((s) => s.activeMood);
  const persistMood = useMoodStore((s) => s.persist);
  const [isMoodMenuOpen, setIsMoodMenuOpen] = useState(false);

  return (
    <div className="absolute bottom-9 left-9 md:left-10 flex items-center gap-4 z-30">
      <StageOrb icon={Library} label="曲库" onClick={() => requestSpace('library')} />
      <StageOrb icon={Globe2} label="地球" onClick={() => requestSpace('globe')} />
      <StageOrb icon={History} label="记忆" onClick={() => requestSpace('memory')} />
      <div className="relative">
        <StageOrb
          icon={Smile}
          label={activeMood ? `情绪 · ${MOOD_OPTIONS.find((m) => m.id === activeMood)?.label ?? activeMood}` : '情绪'}
          active={Boolean(activeMood)}
          activeColor="#e8c28a"
          onClick={() => setIsMoodMenuOpen((v) => !v)}
        />
        <AnimatePresence>
          {isMoodMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="absolute bottom-12 left-0 pointer-events-auto rounded-[14px] p-2"
              style={{
                background: 'var(--mo-bg-elevated-strong)',
                border: '1px solid var(--mo-line)',
                backdropFilter: 'blur(22px) saturate(1.15)',
                WebkitBackdropFilter: 'blur(22px) saturate(1.15)',
                boxShadow: 'var(--mo-shadow-glass), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              {MOOD_OPTIONS.map((m) => {
                const isActive = activeMood === m.id;
                return (
                  <button
                    key={m.id ?? 'none'}
                    type="button"
                    onClick={() => {
                      void persistMood(m.id);
                      setIsMoodMenuOpen(false);
                    }}
                    className="flex items-center gap-2.5 w-full px-3 py-1.5 rounded-[10px] transition-colors"
                    style={{
                      color: isActive ? '#e8c28a' : 'var(--mo-ink-soft)',
                      background: isActive ? 'rgba(232,194,138,0.1)' : 'transparent',
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: isActive ? '#e8c28a' : 'var(--mo-ink-faint)',
                        boxShadow: isActive ? '0 0 8px rgba(232,194,138,0.8)' : 'none',
                      }}
                    />
                    <span style={{ fontSize: 12 }}>{m.label}</span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}