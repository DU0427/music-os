'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Pause, Play, RefreshCw, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAudioStore } from '../audio/store';
import { contrastText, useDominantColor, withAlpha } from '../hooks/useDominantColor';
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

const COVER_FALLBACK =
  'conic-gradient(from 210deg at 50% 50%, #2a2a2e, transparent 32%, #0a0a0c 56%, #3a3a3e 80%, #2a2a2e)';

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '--:--';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

/** 歌单/榜单曲目面板：玻璃侧栏，曲目行点击直接播放（provider 路径），正在播放行接管样式。 */
export default function PlaylistPanel({ target, onClose }: PlaylistPanelProps) {
  const [tracks, setTracks] = useState<ProviderTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const accent = useDominantColor(target?.coverUrl ?? null, '#f5f5f7');
  const currentProviderTrackId = useAudioStore((s) => s.track?.providerTrackId ?? null);
  const isPlaying = useAudioStore((s) => s.isPlaying);

  const load = useCallback(async () => {
    if (!target) {
      return;
    }
    if (typeof window.musicOS?.getNeteasePlaylistTracks !== 'function') {
      setError('当前版本未提供歌单能力。');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    setTracks([]);
    try {
      const list = await window.musicOS.getNeteasePlaylistTracks(target.id);
      setTracks(Array.isArray(list) ? list : []);
    } catch {
      setError('曲目加载失败，请稍后重试。');
    } finally {
      setIsLoading(false);
    }
  }, [target]);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePlay = async (track: ProviderTrack) => {
    const platformTrackId = track.reference.platformTrackId;
    if (currentProviderTrackId === platformTrackId) {
      const audio = useAudioStore.getState();
      if (audio.isPlaying) {
        audio.pause();
      } else {
        void audio.play();
      }
      return;
    }
    setLoadingTrackId(platformTrackId);
    try {
      await useAudioStore.getState().loadProviderTrack(track.reference);
    } finally {
      setLoadingTrackId(null);
    }
  };

  const firstTrack = tracks.length > 0 ? tracks[0] : null;
  const metaText = useMemo(() => {
    if (isLoading) {
      return '载入中…';
    }
    if (error) {
      return '—';
    }
    return `${tracks.length} 首曲目`;
  }, [error, isLoading, tracks.length]);

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
            backdropFilter: 'blur(22px) saturate(1.15)',
            WebkitBackdropFilter: 'blur(22px) saturate(1.15)',
            boxShadow: '-24px 0 60px rgba(0,0,0,0.55)',
          }}
        >
          {/* 头部：封面（带主色光晕）+ 眉标 + 标题 + 全部播放 */}
          <div className="relative" style={{ padding: '26px 26px 18px' }}>
            <div
              aria-hidden
              className="pointer-events-none absolute"
              style={{
                left: -60,
                top: -80,
                width: 260,
                height: 260,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${withAlpha(accent, 0.22)}, transparent 66%)`,
                filter: 'blur(46px)',
                opacity: 'calc(0.7 + var(--mo-beat, 0) * 0.4)',
              }}
            />
            <button
              type="button"
              aria-label="关闭"
              onClick={onClose}
              className="absolute grid place-items-center rounded-full transition-colors"
              style={{
                top: 18,
                right: 18,
                width: 28,
                height: 28,
                color: 'var(--mo-ink-muted)',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--mo-line)',
                cursor: 'pointer',
                zIndex: 2,
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div className="relative flex items-start" style={{ gap: 16 }}>
              <motion.div
                layoutId={`cover-${target.id}`}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                className="shrink-0"
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 14,
                  background: target.coverUrl ? `url("${target.coverUrl}") center / cover no-repeat` : COVER_FALLBACK,
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 18px 44px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.14)',
                }}
              />
              <div className="min-w-0 flex-1" style={{ paddingRight: 30 }}>
                <span
                  className="font-mono"
                  style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: withAlpha(accent, 0.95) }}
                >
                  {target.kind === 'toplist' ? '排行榜' : '歌单'}
                </span>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 17,
                    fontWeight: 500,
                    lineHeight: 1.32,
                    color: 'var(--mo-ink)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {target.title}
                </div>
                <div className="mo-tabular" style={{ marginTop: 6, fontSize: 11.5, color: 'var(--mo-ink-faint)' }}>
                  {metaText}
                </div>
                {firstTrack ? (
                  <button
                    type="button"
                    onClick={() => void handlePlay(firstTrack)}
                    className="flex items-center rounded-full"
                    style={{
                      marginTop: 12,
                      gap: 7,
                      padding: '7px 14px',
                      fontSize: 12,
                      color: contrastText(accent),
                      background: accent,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Play className="h-3 w-3" fill="currentColor" strokeWidth={0} />
                    全部播放
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {/* 曲目列表 */}
          <div className="mo-no-scrollbar flex-1 overflow-y-auto" style={{ padding: '2px 16px 22px' }}>
            {error ? (
              <div
                className="flex flex-col items-center text-center"
                style={{ gap: 10, margin: '18px 8px', padding: '18px 16px', borderRadius: 14, border: '1px solid var(--mo-line)', background: 'rgba(255,255,255,0.02)' }}
              >
                <span style={{ fontSize: 12, color: 'var(--mo-ink-faint)' }}>{error}</span>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="flex items-center rounded-full"
                  style={{
                    gap: 6,
                    padding: '6px 13px',
                    fontSize: 11.5,
                    color: 'var(--mo-ink-soft)',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--mo-line)',
                    cursor: 'pointer',
                  }}
                >
                  <RefreshCw className="h-3 w-3" />
                  重试
                </button>
              </div>
            ) : isLoading ? (
              <div className="grid" style={{ gap: 6 }}>
                {Array.from({ length: 7 }, (_, index) => (
                  <div key={`skeleton-${index}`} className="flex items-center" style={{ gap: 12, padding: '8px 10px' }}>
                    <div className="mo-skeleton" style={{ width: 40, height: 40, borderRadius: 9 }} />
                    <div className="min-w-0 flex-1">
                      <div className="mo-skeleton" style={{ width: '62%', height: 11, borderRadius: 4 }} />
                      <div className="mo-skeleton" style={{ width: '38%', height: 9, borderRadius: 4, marginTop: 7 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid" style={{ gap: 2 }}>
                {tracks.map((track, index) => {
                  const platformTrackId = track.reference.platformTrackId;
                  const isTrackLoading = loadingTrackId === platformTrackId;
                  const isCurrent = currentProviderTrackId === platformTrackId;
                  const hovered = hoveredRow === platformTrackId;
                  return (
                    <button
                      key={platformTrackId}
                      type="button"
                      onClick={() => void handlePlay(track)}
                      onMouseEnter={() => setHoveredRow(platformTrackId)}
                      onMouseLeave={() => setHoveredRow(null)}
                      className="flex items-center text-left"
                      style={{
                        gap: 12,
                        padding: '7px 10px',
                        borderRadius: 10,
                        border: `1px solid ${isCurrent ? withAlpha(accent, 0.42) : 'transparent'}`,
                        background: isCurrent ? withAlpha(accent, 0.09) : hovered ? 'rgba(255,255,255,0.05)' : 'transparent',
                        transition: 'background 200ms var(--mo-ease), border-color 200ms var(--mo-ease)',
                        cursor: 'pointer',
                      }}
                    >
                      <span
                        className="mo-tabular shrink-0 font-mono"
                        style={{ width: 18, textAlign: 'center', fontSize: 10.5, color: isCurrent ? accent : 'var(--mo-ink-faint)' }}
                      >
                        {isTrackLoading ? <Loader2 className="mx-auto h-3 w-3 animate-spin" /> : isCurrent ? '♪' : index + 1}
                      </span>
                      <span
                        aria-hidden
                        style={{
                          width: 40,
                          height: 40,
                          flexShrink: 0,
                          borderRadius: 9,
                          background: track.artworkUrl ? `url("${track.artworkUrl}") center / cover no-repeat` : COVER_FALLBACK,
                          border: '1px solid rgba(255,255,255,0.08)',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
                        }}
                      />
                      <span className="min-w-0 flex-1" style={{ display: 'block' }}>
                        <span
                          style={{
                            display: 'block',
                            fontSize: 13,
                            color: isCurrent ? accent : 'var(--mo-ink)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {track.title}
                        </span>
                        <span
                          style={{
                            display: 'block',
                            marginTop: 2,
                            fontSize: 11,
                            color: 'var(--mo-ink-faint)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {track.artist.name}
                        </span>
                      </span>
                      {isCurrent ? (
                        <span
                          className="mo-bars shrink-0"
                          data-paused={isPlaying ? 'false' : 'true'}
                          style={{ ...({ '--mo-accent-strong': accent } as React.CSSProperties) }}
                        >
                          <span />
                          <span />
                          <span />
                        </span>
                      ) : null}
                      {track.requiresVip ? (
                        <span
                          className="font-mono shrink-0"
                          style={{
                            padding: '1px 5px',
                            borderRadius: 6,
                            fontSize: 9.5,
                            letterSpacing: '0.06em',
                            color: 'var(--mo-ink-muted)',
                            border: '1px solid var(--mo-line-strong)',
                          }}
                        >
                          VIP
                        </span>
                      ) : null}
                      <span className="mo-tabular shrink-0 font-mono" style={{ fontSize: 10.5, color: 'var(--mo-ink-faint)' }}>
                        {formatDuration(track.durationSeconds)}
                      </span>
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
