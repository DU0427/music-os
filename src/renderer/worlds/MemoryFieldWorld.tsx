'use client';

import { motion } from 'motion/react';
import { useEffect, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRuntimeStore } from '../store/runtime';
import { useLibraryStore } from '../store/library';
import { useAudioStore } from '../audio/store';
import type { ProviderTrackReference } from '../../shared/music/providers';

const WARM = '#e8c28a';

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return iso.slice(0, 10);
  }
}

interface MemoryPoint {
  id: string;
  label: string;
  sub: string;
  trackTitle?: string;
  trackId?: string;
  weight: number; // 0-1，点亮度/大小
  startedAt: string;
}

export default function MemoryFieldWorld() {
  const requestSpace = useRuntimeStore((s) => s.requestSpace);
  const tracks = useLibraryStore((s) => s.tracks);
  const history = useLibraryStore((s) => s.history);
  const refresh = useLibraryStore((s) => s.refresh);
  const trackMap = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const points = useMemo<MemoryPoint[]>(() => {
    const sorted = [...history].sort(
      (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
    );
    const items: MemoryPoint[] = [];

    if (sorted.length > 0) {
      const first = sorted[0];
      const firstTrack = trackMap.get(first.trackId);
      items.push({
        id: `first-${first.id}`,
        label: formatDate(first.startedAt),
        sub: 'first encounter',
        trackTitle: firstTrack?.title,
        trackId: firstTrack?.id,
        weight: 0.7,
        startedAt: first.startedAt,
      });
    }

    if (sorted.length > 1) {
      const counts = new Map<string, number>();
      sorted.forEach((h) => counts.set(h.trackId, (counts.get(h.trackId) ?? 0) + 1));
      const topId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      const topTrack = topId ? trackMap.get(topId) : null;
      const topEntry = sorted.find((h) => h.trackId === topId);
      if (topTrack && topEntry) {
        items.push({
          id: `top-${topId}`,
          label: topTrack.title.slice(0, 16),
          sub: `${counts.get(topId!) ?? 0} plays`,
          trackTitle: topTrack.title,
          trackId: topTrack.id,
          weight: 1,
          startedAt: topEntry.startedAt,
        });
      }
    }

    const nowTrack = useAudioStore.getState().track;
    items.push({
      id: 'now',
      label: 'now',
      sub: nowTrack ? `${nowTrack.title} — ${nowTrack.artist}` : '此刻',
      trackTitle: nowTrack?.title,
      trackId: nowTrack?.id,
      weight: 0.85,
      startedAt: new Date().toISOString(),
    });

    return items.slice(0, 5);
  }, [history, trackMap]);

  const handleRestore = async (point: MemoryPoint) => {
    if (!point.trackId) return;
    const track = trackMap.get(point.trackId);
    if (!track) return;
    const audio = useAudioStore.getState();
    if (track.providerId !== 'local-file' && track.providerTrackId) {
      await audio.loadProviderTrack({
        providerId: track.providerId as ProviderTrackReference['providerId'],
        platformTrackId: track.providerTrackId,
      });
    } else if (audio.track?.id === track.id && audio.canPlay) {
      void audio.play();
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

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {points.length <= 1 && history.length === 0 ? (
          <p className="text-[12px] tracking-wide" style={{ color: 'var(--mo-ink-faint)' }}>
            播放一首歌来点亮轨迹
          </p>
        ) : (
          <div className="relative flex items-center gap-14 md:gap-24 pointer-events-auto">
            {/* 细光时间线 */}
            <div
              aria-hidden
              className="absolute top-1/2 left-0 right-0 h-px"
              style={{
                background: `linear-gradient(90deg, transparent, ${WARM}55, ${WARM}66, ${WARM}55, transparent)`,
                boxShadow: `0 0 18px ${WARM}22`,
              }}
            />
            {points.map((point, idx) => (
              <motion.button
                key={point.id}
                type="button"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="relative flex flex-col items-center group cursor-pointer"
                onClick={() => void handleRestore(point)}
                style={{ marginTop: idx % 2 === 1 ? 28 : -28 }}
              >
                {/* 发光节点 */}
                <div
                  className="rounded-full mb-4 transition-transform duration-300 group-hover:scale-125"
                  style={{
                    width: point.weight >= 1 ? 10 : 7,
                    height: point.weight >= 1 ? 10 : 7,
                    background: WARM,
                    boxShadow: `0 0 ${8 + point.weight * 14}px ${WARM}`,
                  }}
                />
                {/* 玻璃小签 */}
                <div
                  className="rounded-[12px] px-4 py-3 text-center min-w-[120px] transition-colors duration-300"
                  style={{
                    background: 'var(--mo-bg-elevated)',
                    border: `1px solid ${point.weight >= 1 ? 'rgba(232,194,138,0.35)' : 'var(--mo-line)'}`,
                    backdropFilter: 'blur(22px) saturate(1.15)',
                    WebkitBackdropFilter: 'blur(22px) saturate(1.15)',
                    boxShadow: point.weight >= 1 ? `0 0 28px ${WARM}18` : 'var(--mo-shadow-soft)',
                  }}
                >
                  <div className="font-mono mb-1 tracking-wide" style={{ fontSize: 9, color: 'var(--mo-ink-faint)' }}>
                    {point.label}
                  </div>
                  <div className="truncate" style={{ fontSize: 12, color: point.weight >= 1 ? WARM : 'var(--mo-ink-soft)' }}>
                    {point.sub}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      <div className="absolute bottom-28 right-10 text-right pointer-events-none hidden md:block">
        <h3 className="font-sans tracking-[0.14em] text-[11px] uppercase" style={{ color: 'var(--mo-ink-muted)' }}>记忆轨迹</h3>
        <p className="mt-1 text-[11px]" style={{ color: 'var(--mo-ink-faint)' }}>回溯你的聆听旅程</p>
      </div>

      <div id="memory-field-world" data-testid="memory-world" style={{ display: 'none' }} />
    </div>
  );
}