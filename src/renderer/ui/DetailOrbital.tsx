'use client';

import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Pause, ExternalLink, BookmarkPlus, Plus, Mic2 } from 'lucide-react';
import { useAudioStore } from '../audio/store';
import { useLibraryStore } from '../store/library';
import { useRuntimeStore } from '../store/runtime';
import CoreVisualDom from './CoreVisualDom';
import { useMemo } from 'react';

export default function DetailOrbital({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const track = useAudioStore((s) => s.track);
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const play = useAudioStore((s) => s.play);
  const pause = useAudioStore((s) => s.pause);
  const requestSpace = useRuntimeStore((s) => s.requestSpace);
  const history = useLibraryStore((s) => s.history);

  const stats = useMemo(() => {
    if (!track) return null;
    const related = history.filter((h) => h.trackId === track.id);
    const playCount = related.length || 1;
    const first = related[0]?.startedAt ? new Date(related[0].startedAt) : null;
    return {
      playCount,
      firstPlayed: first ? `${first.getFullYear()}.${String(first.getMonth() + 1).padStart(2, '0')}.${String(first.getDate()).padStart(2, '0')}` : '—',
      mostPlayed: '00:00 - 02:00',
      energy: track.worldContext?.energyTarget === 'calm' ? 42 : track.worldContext?.energyTarget === 'electric' ? 88 : 68,
      bpm: 105,
      mood: track.worldContext?.moodTags?.[0] ?? 'night',
    };
  }, [track, history]);

  if (!track) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="absolute inset-0 z-30 flex items-center justify-center pointer-events-auto"
          initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          animate={{ opacity: 1, backdropFilter: 'blur(10px)' }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          transition={{ duration: 0.5 }}
        >
          <div className="absolute inset-0 bg-black/55" onClick={onClose} />

          <button
            className="absolute top-8 right-10 text-white/40 hover:text-white transition-colors flex items-center gap-2 group pointer-events-auto z-10"
            onClick={onClose}
          >
            <span className="font-mono text-[10px] tracking-[0.16em] opacity-0 group-hover:opacity-100 transition-opacity">关闭 (esc)</span>
            <div className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center group-hover:border-white/20 group-hover:bg-white/5 transition-all">
              <X className="w-4 h-4" />
            </div>
          </button>

          <div className="relative z-10 w-full max-w-5xl px-8 md:px-12 flex flex-col md:flex-row gap-10 md:gap-16 items-center">
            {/* sphere */}
            <div className="flex-shrink-0 flex flex-col items-center">
              <CoreVisualDom size={280} onClick={() => (isPlaying ? pause() : void play())} />
              <motion.div
                className="mt-8 flex flex-col items-center text-center pointer-events-none"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="font-mono text-[9px] text-white/40 mb-2 tracking-[0.24em] uppercase">{isPlaying ? '播放中' : '已暂停'}</div>
                <div className="font-sans text-xl text-white/90 tracking-wide">{track.title}</div>
                <div className="font-sans text-[13px] text-white/45 mt-1">{track.artist}</div>
              </motion.div>
            </div>

            {/* details */}
            <motion.div className="flex-1 flex flex-col justify-center" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <div className="space-y-6 relative">
                <div className="absolute left-[3px] top-3 bottom-3 w-px bg-gradient-to-b from-white/10 via-[#7DE7E2]/20 to-transparent" />

                <div className="relative pl-6">
                  <div className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-[#7DE7E2] shadow-[0_0_8px_#7DE7E2]" />
                  <h3 className="font-mono text-[10px] tracking-[0.16em] text-white/35 mb-1 uppercase">专辑</h3>
                  <p className="font-sans tracking-wide text-[13px] text-white/80">{track.album ?? '—'}</p>
                </div>

                <div className="relative pl-6">
                  <div className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-white/20" />
                  <h3 className="font-mono text-[10px] tracking-[0.16em] text-white/35 mb-1 uppercase">首次播放</h3>
                  <p className="font-mono tracking-wide text-[13px] text-white/80">{stats?.firstPlayed ?? '—'}</p>
                </div>

                <div className="relative pl-6">
                  <div className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-[#F0B56A] shadow-[0_0_8px_#F0B56A]" />
                  <h3 className="font-mono text-[10px] tracking-[0.16em] text-white/35 mb-1 uppercase">能量 / bpm</h3>
                  <div className="flex items-center gap-3">
                    <p className="font-mono tracking-wide text-[13px] text-white/80">{stats?.energy ?? 68}% / {stats?.bpm ?? 105}</p>
                    <div className="w-28 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-[#F0B56A]" style={{ width: `${stats?.energy ?? 68}%` }} />
                    </div>
                  </div>
                </div>

                <div className="relative pl-6">
                  <div className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-[#EA8E83] shadow-[0_0_8px_#EA8E83]" />
                  <h3 className="font-mono text-[10px] tracking-[0.16em] text-white/35 mb-1 uppercase">情绪</h3>
                  <p className="font-sans tracking-wide text-[13px] text-white/80 lowercase">{stats?.mood ?? 'night'}</p>
                </div>

                <div className="relative pl-6 pt-4 border-t border-white/5">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-mono text-[10px] tracking-[0.16em] text-white/35 mb-1 uppercase">常听段落</h3>
                      <p className="font-mono tracking-wide text-[13px] text-white/80">{stats?.mostPlayed ?? '—'}</p>
                    </div>
                    <div>
                      <h3 className="font-mono text-[10px] tracking-[0.16em] text-white/35 mb-1 uppercase">播放次数</h3>
                      <p className="font-mono tracking-wide text-[13px] text-white/80">{stats?.playCount ?? 1}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <div className="flex items-center gap-3">
                  <button
                    className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-white/90 text-black py-3 px-5 rounded-full transition-all"
                    onClick={() => (isPlaying ? pause() : void play())}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4 ml-0.5" fill="currentColor" />}
                    <span className="font-sans tracking-wide text-[12px] font-semibold">{isPlaying ? '暂停' : '播放'}</span>
                  </button>
                  <button
                    className="flex-[1.6] flex items-center justify-between border border-[#7DE7E2]/25 bg-[#7DE7E2]/5 hover:bg-[#7DE7E2]/10 hover:border-[#7DE7E2]/40 text-[#7DE7E2] py-3 px-5 rounded-full transition-all"
                    onClick={() => {
                      onClose();
                      requestSpace('visualizer');
                    }}
                  >
                    <span className="font-mono tracking-wide text-[11px]">打开可视化世界</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full border border-white/10 hover:bg-white/5 text-white/45 hover:text-white/80 transition-all">
                    <Mic2 className="w-3 h-3" />
                    <span className="font-mono text-[10px] tracking-wide">人声</span>
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full border border-white/10 hover:border-[#F0B56A]/40 hover:bg-[#F0B56A]/5 hover:text-[#F0B56A] text-white/45 transition-all">
                    <BookmarkPlus className="w-3 h-3" />
                    <span className="font-mono text-[10px] tracking-wide">收藏</span>
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full border border-white/10 hover:bg-white/5 text-white/45 hover:text-white/80 transition-all">
                    <Plus className="w-3 h-3" />
                    <span className="font-mono text-[10px] tracking-wide">队列</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
