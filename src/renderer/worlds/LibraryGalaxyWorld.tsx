'use client';

import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Play, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRuntimeStore } from '../store/runtime';
import { useLibraryStore } from '../store/library';
import { useAudioStore } from '../audio/store';
import type { TrackRecord } from '../../shared/ipc/music';
import type { ProviderTrackReference } from '../../shared/music/providers';

const VINYL_GRADIENT =
  'conic-gradient(from 210deg at 50% 50%, #2a2a2e, transparent 32%, #0a0a0c 56%, #3a3a3e 80%, #2a2a2e)';

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

export default function LibraryGalaxyWorld() {
  const requestSpace = useRuntimeStore((s) => s.requestSpace);
  const tracks = useLibraryStore((s) => s.tracks);
  const refresh = useLibraryStore((s) => s.refresh);
  const [selected, setSelected] = useState<TrackRecord | null>(null);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handlePlay = async (track: TrackRecord) => {
    const audio = useAudioStore.getState();
    if (audio.track?.id === track.id && audio.canPlay) {
      void audio.play();
      return;
    }
    if (track.providerId !== 'local-file' && track.providerTrackId) {
      await audio.loadProviderTrack({
        providerId: track.providerId as ProviderTrackReference['providerId'],
        platformTrackId: track.providerTrackId,
      });
    }
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

      {/* 封面场：真实封面网格 */}
      <div className="absolute inset-0 overflow-y-auto pointer-events-auto">
        <div className="min-h-full flex items-center justify-center">
          {tracks.length === 0 ? (
            <p className="text-[12px] tracking-wide" style={{ color: 'var(--mo-ink-faint)' }}>
              载入歌曲以点亮封面场
            </p>
          ) : (
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(124px, 1fr))',
                width: 'min(920px, calc(100vw - 96px))',
                padding: '120px 0 140px',
              }}
            >
              {tracks.map((track) => (
                <motion.button
                  key={track.id}
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.05 * Math.min(tracks.indexOf(track), 10) }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelected(track)}
                  className="relative aspect-square rounded-[12px] overflow-hidden group cursor-pointer"
                  style={{
                    background: track.artworkUrl
                      ? `url(${track.artworkUrl}) center / cover no-repeat`
                      : VINYL_GRADIENT,
                    border: '1px solid var(--mo-line-subtle)',
                    boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
                  }}
                >
                  {/* hover 微亮 + 曲名浮现 */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-300" />
                  <div className="absolute inset-x-0 bottom-0 px-2.5 pb-2 pt-6 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="text-[11px] text-white/90 truncate text-left">{track.title}</div>
                    <div className="text-[9px] text-white/50 truncate text-left mt-0.5">{track.artist}</div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 详情玻璃面板 */}
      <AnimatePresence>
        {selected && (
          <motion.aside
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-0 right-0 bottom-0 w-[340px] z-20 pointer-events-auto flex flex-col p-8"
            style={{
              background: 'var(--mo-bg-elevated-strong)',
              borderLeft: '1px solid var(--mo-line)',
              backdropFilter: 'blur(22px) saturate(1.15)',
              WebkitBackdropFilter: 'blur(22px) saturate(1.15)',
            }}
          >
            <button
              onClick={() => setSelected(null)}
              className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors"
              aria-label="关闭"
            >
              <X className="w-4 h-4" />
            </button>

            <div
              className="mt-10 aspect-square w-full rounded-[14px] mb-8"
              style={{
                background: selected.artworkUrl
                  ? `url(${selected.artworkUrl}) center / cover no-repeat`
                  : VINYL_GRADIENT,
                border: '1px solid var(--mo-line-subtle)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
              }}
            />

            <div className="font-mono tracking-[0.18em] uppercase" style={{ fontSize: 10, color: 'var(--mo-ink-muted)' }}>
              曲库
            </div>
            <h2 className="mt-2" style={{ fontSize: 22, fontWeight: 300, letterSpacing: '-0.02em', color: 'var(--mo-ink)', lineHeight: 1.2 }}>
              {selected.title}
            </h2>
            <div className="mt-2" style={{ fontSize: 13, color: 'var(--mo-ink-muted)' }}>
              {selected.artist}{selected.album ? ` · ${selected.album}` : ''}
            </div>

            <div className="mt-8 space-y-3" style={{ fontSize: 12, color: 'var(--mo-ink-faint)' }}>
              <div className="flex items-center gap-2">
                <span className="font-mono tracking-[0.14em] uppercase" style={{ fontSize: 10 }}>时长</span>
                <span>{formatDuration(selected.durationSeconds)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono tracking-[0.14em] uppercase" style={{ fontSize: 10 }}>来源</span>
                <span>{selected.providerId === 'local-file' ? '本地文件' : selected.providerId}</span>
              </div>
              {selected.worldContext?.moodTags?.length ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono tracking-[0.14em] uppercase" style={{ fontSize: 10 }}>氛围</span>
                  {selected.worldContext.moodTags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-full" style={{ background: 'var(--mo-accent-ghost)', color: 'var(--mo-accent)' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => void handlePlay(selected)}
              className="mt-auto flex items-center justify-center gap-2 rounded-full py-3"
              style={{
                background: 'var(--mo-accent)',
                color: 'var(--mo-accent-contrast)',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <Play className="w-3.5 h-3.5" fill="currentColor" strokeWidth={0} />
              播放
            </button>
          </motion.aside>
        )}
      </AnimatePresence>

      <div id="library-galaxy-world" data-testid="library-world" style={{ display: 'none' }} />
    </div>
  );
}