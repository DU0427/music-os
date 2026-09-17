'use client';

import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRuntimeStore } from '../store/runtime';
import { useLibraryStore } from '../store/library';
import { useAudioStore } from '../audio/store';

const WARM = '#e8c28a';
const MAX_POINTS = 10;

const COVER_FALLBACK =
  'conic-gradient(from 210deg at 50% 50%, #2a2a2e, transparent 32%, #0a0a0c 56%, #3a3a3e 80%, #2a2a2e)';

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return iso.slice(0, 10);
  }
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return sameDay ? `今天 ${time}` : `${formatDate(iso)} ${time}`;
  } catch {
    return iso.slice(0, 16);
  }
}

interface MemoryPoint {
  id: string;
  time: string;
  title: string;
  coverUrl: string | null;
  plays: number;
  weight: number; // 0-1，点亮度/大小
  trackId?: string;
  isNow?: boolean;
}

/** 记忆轨迹：一条暖金细光时间线，每个节点是一次聆听；最常听的点更亮，now 带脉冲环。 */
export default function MemoryFieldWorld() {
  const requestSpace = useRuntimeStore((s) => s.requestSpace);
  const tracks = useLibraryStore((s) => s.tracks);
  const history = useLibraryStore((s) => s.history);
  const refresh = useLibraryStore((s) => s.refresh);
  const trackMap = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks]);
  const currentTrackId = useAudioStore((s) => s.track?.id ?? null);
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const points = useMemo<MemoryPoint[]>(() => {
    if (history.length === 0) {
      return [];
    }
    const counts = new Map<string, number>();
    history.forEach((record) => counts.set(record.trackId, (counts.get(record.trackId) ?? 0) + 1));
    const maxPlays = Math.max(...counts.values());

    const sorted = [...history].sort(
      (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
    );
    // 最近的放在最左：进入空间立刻看到"刚听过"，往右回溯更早
    const recent = sorted.slice(-MAX_POINTS).reverse();

    const items: MemoryPoint[] = recent.map((record) => {
      const track = trackMap.get(record.trackId);
      const plays = counts.get(record.trackId) ?? 1;
      return {
        id: record.id,
        time: formatTime(record.startedAt),
        title: track?.title ?? '未知曲目',
        coverUrl: track?.artworkUrl ?? null,
        plays,
        weight: 0.45 + (plays / maxPlays) * 0.55,
        trackId: track?.id,
      };
    });

    const nowTrack = useAudioStore.getState().track;
    if (nowTrack) {
      items.unshift({
        id: 'now',
        time: '此刻',
        title: nowTrack.title,
        coverUrl: nowTrack.artworkUrl,
        plays: counts.get(nowTrack.id) ?? 0,
        weight: 1,
        trackId: nowTrack.id,
        isNow: true,
      });
    }

    return items;
  }, [history, trackMap]);

  const handleRestore = async (point: MemoryPoint) => {
    if (point.isNow || !point.trackId) {
      return;
    }
    const track = trackMap.get(point.trackId);
    if (!track) {
      return;
    }
    await useAudioStore.getState().playTrack(track);
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

      {/* 头部：与首页区块标题同一套排版 */}
      <div
        className="absolute left-10 right-10 flex items-baseline"
        style={{ top: 124, justifyContent: 'space-between' }}
      >
        <span className="flex items-baseline" style={{ gap: 10 }}>
          <h2 style={{ fontSize: 15, fontWeight: 500, color: 'var(--mo-ink)', letterSpacing: '0.02em' }}>记忆轨迹</h2>
          <span className="font-mono mo-tabular" style={{ fontSize: 11, color: 'var(--mo-ink-faint)' }}>
            {history.length}
          </span>
        </span>
        <span style={{ fontSize: 11.5, color: 'var(--mo-ink-faint)' }}>回溯你的聆听旅程 · 点击节点重播</span>
      </div>

      {points.length === 0 ? (
        <div className="absolute inset-0 grid place-items-center">
          <p className="text-[12px] tracking-wide" style={{ color: 'var(--mo-ink-faint)' }}>
            播放一首歌来点亮轨迹
          </p>
        </div>
      ) : (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2">
          <div className="mo-no-scrollbar overflow-x-auto pointer-events-auto">
            <div className="flex items-center gap-16 md:gap-24 px-20" style={{ minWidth: 'min-content', paddingTop: 60, paddingBottom: 60 }}>
              <div className="relative flex items-center gap-16 md:gap-24">
                {/* 暖金细光时间线 + 顶部刻度 */}
                <div
                  aria-hidden
                  className="absolute top-1/2 left-0 right-0"
                  style={{ height: 1, background: `linear-gradient(90deg, transparent, ${WARM}55, ${WARM}cc, ${WARM}55, transparent)`, boxShadow: `0 0 26px ${WARM}44` }}
                />
                {points.map((point, idx) => {
                  const hovered = hoveredId === point.id;
                  const isCurrent = Boolean(point.trackId) && point.trackId === currentTrackId;
                  const dotSize = 6 + point.weight * 7;
                  return (
                    <motion.button
                      key={point.id}
                      type="button"
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx, 8) * 0.06, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                      onMouseEnter={() => setHoveredId(point.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => void handleRestore(point)}
                      className="relative flex cursor-pointer flex-col items-center"
                      style={{ marginTop: idx % 2 === 1 ? 30 : -30 }}
                    >
                      {/* 节点：now 带脉冲环 */}
                      <span className="relative mb-4 grid place-items-center" style={{ width: 22, height: 22 }}>
                        {point.isNow ? (
                          <span
                            aria-hidden
                            className="absolute inset-0 rounded-full"
                            style={{ border: `1px solid ${WARM}88`, animation: 'mo-node-pulse 2.6s ease-in-out infinite' }}
                          />
                        ) : null}
                        <span
                          className="rounded-full transition-transform duration-300"
                          style={{
                            width: dotSize,
                            height: dotSize,
                            background: WARM,
                            transform: hovered ? 'scale(1.35)' : 'scale(1)',
                            boxShadow: isCurrent
                              ? `0 0 0 2px ${WARM}66, 0 0 ${10 + point.weight * 18}px ${WARM}`
                              : `0 0 ${6 + point.weight * 16}px ${WARM}`,
                          }}
                        />
                      </span>

                      {/* 标签卡：封面缩略图 + 曲名 + 时间 + 播放次数 */}
                      <span
                        className="flex items-center rounded-[12px] transition-colors duration-300"
                        style={{
                          gap: 9,
                          padding: '8px 11px',
                          minWidth: 132,
                          background: 'var(--mo-bg-elevated)',
                          border: `1px solid ${isCurrent || point.weight >= 0.85 || hovered ? 'rgba(232,194,138,0.4)' : 'var(--mo-line)'}`,
                          boxShadow: isCurrent ? `0 0 0 2px ${WARM}33, 0 0 30px ${WARM}26` : point.weight >= 0.85 ? `0 0 30px ${WARM}1f` : 'var(--mo-shadow-soft)',
                        }}
                      >
                        <span
                          aria-hidden
                          style={{
                            width: 26,
                            height: 26,
                            flexShrink: 0,
                            borderRadius: 7,
                            background: point.coverUrl ? `url("${point.coverUrl}") center / cover no-repeat` : COVER_FALLBACK,
                            border: '1px solid rgba(255,255,255,0.09)',
                          }}
                        />
                        <span className="min-w-0" style={{ display: 'block', textAlign: 'left' }}>
                          <span
                            style={{
                              display: 'block',
                              maxWidth: 132,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontSize: 12,
                              color: point.isNow ? WARM : 'var(--mo-ink-soft)',
                            }}
                          >
                            {point.title}
                          </span>
                          <span
                            className="font-mono mo-tabular"
                            style={{ display: 'block', marginTop: 2, fontSize: 9.5, color: 'var(--mo-ink-faint)', whiteSpace: 'nowrap' }}
                          >
                            {point.time}
                            {point.plays > 0 ? ` · ${point.plays} 次` : ''}
                          </span>
                        </span>
                        {isCurrent ? (
                          <span
                            className="mo-bars"
                            data-paused={isPlaying ? 'false' : 'true'}
                            style={{ marginLeft: 2, ...({ '--mo-accent-strong': WARM } as React.CSSProperties) }}
                          >
                            <span />
                            <span />
                            <span />
                          </span>
                        ) : null}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
