import { motion, AnimatePresence } from 'motion/react';
import { Search, AudioLines, User } from 'lucide-react';
import { useState } from 'react';
import { useRuntimeStore } from '../store/runtime';
import { useAudioStore } from '../audio/store';
import { useMoodStore } from '../store/mood';
import { useLibraryStore } from '../store/library';
import { useEffect } from 'react';

const MOOD_LABEL: Record<string, string> = {
  Night: '夜晚',
  Energy: '能量',
  Calm: '平静',
  Nostalgia: '怀旧',
};

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
  const tracks = useLibraryStore((s) => s.tracks);
  const history = useLibraryStore((s) => s.history);
  const refreshLib = useLibraryStore((s) => s.refresh);
  const [showHistory, setShowHistory] = useState(false);
  const [showUser, setShowUser] = useState(false);

  useEffect(() => {
    void loadMood();
    void refreshLib();
  }, [loadMood, refreshLib]);

  const spaceTitle =
    currentSpace === 'home' ? 'home' : currentSpace === 'midnight' ? 'midnight city' : currentSpace;
  const statusHint = canEnterMidnight ? '核心就绪' : '核心锁定';

  return (
    <motion.header
      className="fixed top-0 left-0 w-full px-8 py-6 flex items-start justify-between pointer-events-none z-20"
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
              {spaceTitle} {activeMood ? ` · ${MOOD_LABEL[activeMood] ?? activeMood}` : ''}
            </div>
            <motion.div
              className="mt-3 w-1.5 h-1.5 rounded-full bg-[var(--mo-accent)] shadow-[0_0_12px_rgba(110,168,255,0.8)]"
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="mt-1 text-[10px] tracking-[0.12em] uppercase text-white/30 font-sans">{statusHint}</div>
          </motion.div>
        </AnimatePresence>
        {/* mood/space hint — single source, no track duplication */}
        {activeMood && currentSpace === 'home' ? (
          <div className="mt-1.5 text-[10px] tracking-[0.14em] uppercase text-white/30 font-sans">{MOOD_LABEL[activeMood] ?? activeMood}</div>
        ) : null}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1 relative">
        <NavIcon icon={Search} label="搜索" onClick={onSearch} />
        <div className="relative">
          <NavIcon icon={AudioLines} label="音频" onClick={() => setShowHistory((v) => !v)} />
          {showHistory && (
            <div className="absolute right-0 top-12 w-72 rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-3 pointer-events-auto shadow-xl">
              <div className="text-[10px] tracking-[0.12em] uppercase text-white/30 mb-2">音频 · 最近播放</div>
              {history.length === 0 ? (
                <div className="text-[11px] text-white/40 py-2">暂无播放记录</div>
              ) : (
                <div className="grid gap-1.5">
                  {history.slice(0, 3).map((h) => {
                    const t = tracks.find((tr) => tr.id === h.trackId);
                    return (
                      <div key={h.id} className="flex items-center gap-2 text-[11px] text-white/60 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#7DE7E2] flex-shrink-0" />
                        <span className="truncate">{t?.title ?? h.trackId.slice(0, 8)}</span>
                        <span className="text-white/25 ml-auto">{Math.round(h.durationSeconds)}s</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <button
                onClick={() => {
                  setShowHistory(false);
                  useRuntimeStore.getState().requestSpace('memory');
                }}
                className="mt-2.5 w-full py-2 rounded-full bg-white/10 hover:bg-white/15 text-white/80 text-[11px] transition-colors"
              >
                进入记忆田野 →
              </button>
            </div>
          )}
        </div>
        <div className="relative">
          <NavIcon icon={User} label="我的" onClick={() => setShowUser((v) => !v)} />
          {showUser && (
            <div className="absolute right-0 top-12 w-64 rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-3 pointer-events-auto shadow-xl">
              <div className="text-[10px] tracking-[0.12em] uppercase text-white/30 mb-2">我的</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-white/5 py-2">
                  <div className="text-[14px] font-medium text-white/80">{tracks.length}</div>
                  <div className="text-[9px] tracking-wide text-white/30 uppercase">曲目</div>
                </div>
                <div className="rounded-xl bg-white/5 py-2">
                  <div className="text-[14px] font-medium text-white/80">{history.length}</div>
                  <div className="text-[9px] tracking-wide text-white/30 uppercase">播放</div>
                </div>
                <div className="rounded-xl bg-white/5 py-2">
                  <div className="text-[14px] font-medium text-white/80">{MOOD_LABEL[activeMood ?? ''] ?? (activeMood ?? '—')}</div>
                  <div className="text-[9px] tracking-wide text-white/30 uppercase">情绪</div>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-white/25 text-center">music os v0.1 · 本地优先</div>
            </div>
          )}
        </div>
      </div>
    </motion.header>
  );
}
