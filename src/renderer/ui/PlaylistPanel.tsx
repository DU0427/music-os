'use client';

import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAudioStore } from '../audio/store';
import type { ProviderTrack } from '../../shared/music/providers';

export interface PlaylistPanelTarget {
  id: string;
  title: string;
  coverUrl: string | null;
  kind: 'playlist' | 'toplist';
}

interface PlaylistPanelProps {
  target: PlaylistPanelTarget | null;
  onClose: () => void;
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '--:--';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

/** 歌单/榜单曲目面板：玻璃侧栏，点击曲目直接播放（provider 路径）。 */
export default function PlaylistPanel({ target, onClose }: PlaylistPanelProps) {
  const [tracks, setTracks] = useState<ProviderTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);

  useEffect(() => {
    if (!target) {
      return undefined;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setTracks([]);
    if (typeof window.musicOS?.getNeteasePlaylistTracks !== 'function') {
      setError('当前版本未提供歌单能力。');
      setIsLoading(false);
      return undefined;
    }
    window.musicOS
      .getNeteasePlaylistTracks(target.id)
      .then((list) => {
        if (!cancelled) {
          setTracks(Array.isArray(list) ? list : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('曲目加载失败，请稍后重试。');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [target]);

  const handlePlay = async (track: ProviderTrack) => {
    setLoadingTrackId(track.reference.platformTrackId);
    try {
      await useAudioStore.getState().loadProviderTrack(track.reference);
    } finally {
      setLoadingTrackId(null);
    }
  };

  return (
    <AnimatePresence>
      {target ? (
        <motion.aside
          key={target.id}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="fixed top-0 right-0 bottom-0 z-40 flex flex-col"
          style={{
            width: 'min(400px, 92vw)',
            background: 'var(--mo-bg-elevated-strong)',
            borderLeft: '1px solid var(--mo-line)',
            backdropFilter: 'blur(24px) saturate(1.15)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.15)',
          }}
        >
          {/* 头部 */}
          <div className="flex items-start gap-4 p-7 pb-5">
            <div
              className="shrink-0"
              style={{
                width: 84,
                height: 84,
                borderRadius: 12,
                background: target.coverUrl
                  ? `url(${target.coverUrl}) center / cover no-repeat`
                  : 'conic-gradient(from 210deg at 50% 50%, #2a2a2e, transparent 32%, #0a0a0c 56%, #3a3a3e 80%, #2a2a2e)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 16px 44px rgba(0,0,0,0.55)',
              }}
            />
            <div className="min-w-0 flex-1">
              <div
                className="font-mono tracking-[0.16em] uppercase"
                style={{ fontSize: 10, color: 'var(--mo-ink-faint)' }}
              >
                {target.kind === 'toplist' ? '排行榜' : '歌单'}
              </div>
              <div
                className="mt-1.5"
                style={{
                  fontSize: 17,
                  fontWeight: 500,
                  color: 'var(--mo-ink)',
                  lineHeight: 1.3,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {target.title}
              </div>
              <div className="mt-1.5" style={{ fontSize: 11, color: 'var(--mo-ink-muted)' }}>
                {isLoading ? '载入中…' : `${tracks.length} 首曲目`}
              </div>
            </div>
            <button
              type="button"
              aria-label="关闭"
              onClick={onClose}
              className="shrink-0 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 曲目列表 */}
          <div className="flex-1 overflow-y-auto px-4 pb-6">
            {error ? (
              <div className="px-3 py-6 text-center" style={{ fontSize: 12, color: 'var(--mo-ink-faint)' }}>
                {error}
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center gap-2 py-10" style={{ color: 'var(--mo-ink-faint)' }}>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span style={{ fontSize: 12 }}>正在载入曲目…</span>
              </div>
            ) : (
              <div className="grid gap-1">
                {tracks.map((track, index) => {
                  const isTrackLoading = loadingTrackId === track.reference.platformTrackId;
                  return (
                    <button
                      key={track.reference.platformTrackId}
                      type="button"
                      onClick={() => void handlePlay(track)}
                      className="group flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
                    >
                      <span
                        className="w-5 shrink-0 text-center font-mono"
                        style={{ fontSize: 11, color: 'var(--mo-ink-faint)' }}
                      >
                        {isTrackLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <div
                        className="shrink-0"
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: track.artworkUrl
                            ? `url(${track.artworkUrl}) center / cover no-repeat`
                            : 'conic-gradient(from 210deg at 50% 50%, #2a2a2e, transparent 32%, #0a0a0c 56%, #3a3a3e 80%, #2a2a2e)',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate" style={{ fontSize: 13, color: 'var(--mo-ink)' }}>
                          {track.title}
                        </div>
                        <div className="truncate" style={{ fontSize: 11, color: 'var(--mo-ink-faint)' }}>
                          {track.artist.name}
                        </div>
                      </div>
                      <span
                        className="shrink-0 font-mono"
                        style={{ fontSize: 10, color: 'var(--mo-ink-faint)' }}
                      >
                        {formatDuration(track.durationSeconds)}
                      </span>
                      <Play
                        className="w-3.5 h-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                        style={{ color: 'var(--mo-ink-muted)' }}
                        fill="currentColor"
                        strokeWidth={0}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}