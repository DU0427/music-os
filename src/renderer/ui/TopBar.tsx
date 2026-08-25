import { motion, AnimatePresence } from 'motion/react';
import { Search, AudioLines, User } from 'lucide-react';
import { useState } from 'react';
import { useRuntimeStore } from '../store/runtime';
import { useAudioStore } from '../audio/store';
import { useMoodStore } from '../store/mood';
import { useEffect } from 'react';

function NavIcon({ icon: Icon, label, onClick }: { icon: typeof Search; label: string; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="relative flex items-center justify-center pointer-events-auto"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <button className="text-white/40 hover:text-white/90 transition-colors p-2.5 relative group">
        <Icon className="w-4 h-4 stroke-[1.5]" />
        <div className="absolute inset-0 rounded-full border border-white/0 group-hover:border-white/5 group-hover:bg-white/5 transition-all" />
      </button>
      <AnimatePresence>
        {hovered && (
          <motion.div
            className="absolute top-12 pointer-events-none text-[11px] font-sans text-white/50 whitespace-nowrap"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TopBar({ onSearch }: { onSearch?: () => void }) {
  const currentSpace = useRuntimeStore((s) => s.currentSpace);
  const canEnterMidnight = useAudioStore((s) => Boolean(s.canPlay && s.track));
  const track = useAudioStore((s) => s.track);
  const activeMood = useMoodStore((s) => s.activeMood);
  const loadMood = useMoodStore((s) => s.load);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    void loadMood();
  }, [loadMood]);

  const spaceTitle =
    currentSpace === 'home' ? 'home' : currentSpace === 'midnight' ? 'midnight city' : currentSpace;
  const statusHint = canEnterMidnight ? 'core ready' : 'core locked';

  return (
    <motion.header
      className="fixed top-0 left-0 w-full px-10 py-8 flex items-start justify-between pointer-events-none z-20"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Brand — now "music os" lowercase */}
      <div className="flex items-center gap-3 pointer-events-auto group">
        <div className="relative w-6 h-6 flex items-center justify-center">
          <motion.div
            className="absolute inset-[-2px] rounded-full border border-white/10"
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
        </div>
        <div className="font-sans font-medium text-[13px] text-white/80 group-hover:text-white transition-colors tracking-wide">
          music os
        </div>
      </div>

      {/* Center space title + breathing dot */}
      <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSpace}
            initial={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="flex flex-col items-center"
          >
            <div className="font-sans text-[13px] font-medium text-white/80 tracking-wide lowercase">
              {spaceTitle} {activeMood ? `· ${activeMood}` : ''}
            </div>
            <motion.div
              className="mt-3 w-1.5 h-1.5 rounded-full bg-[var(--mo-accent)] shadow-[0_0_12px_rgba(110,168,255,0.8)]"
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="mt-1 text-[10px] tracking-[0.12em] uppercase text-white/30 font-sans">{statusHint}</div>
          </motion.div>
        </AnimatePresence>
        {/* track hint below center */}
        {track ? (
          <div className="mt-2 text-[10px] text-white/25 font-sans tracking-wide max-w-[260px] truncate">
            {track.title} — {track.artist}
          </div>
        ) : null}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1 relative">
        <NavIcon icon={Search} label="search" onClick={onSearch} />
        <div className="relative">
          <NavIcon icon={AudioLines} label="audio" onClick={() => setShowHistory((v) => !v)} />
          {showHistory && (
            <div className="absolute right-0 top-12 w-64 rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-3 pointer-events-auto shadow-xl">
              <div className="text-[10px] tracking-[0.12em] uppercase text-white/30 mb-2">recent plays</div>
              <div className="text-[11px] text-white/50">open memory field for full history →</div>
              <button
                onClick={() => {
                  setShowHistory(false);
                  useRuntimeStore.getState().requestSpace('memory');
                }}
                className="mt-2 w-full py-2 rounded-full bg-white/10 hover:bg-white/15 text-white/80 text-[11px] transition-colors"
              >
                go to memory
              </button>
            </div>
          )}
        </div>
        <NavIcon icon={User} label="profile" />
      </div>
    </motion.header>
  );
}
