'use client';

import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useGlobeStore } from '../store/globe';
import { useRuntimeStore } from '../store/runtime';
import { REGION_POINTS } from '../worlds/globe-regions';
import PlaylistPanel, { type PlaylistPanelTarget } from './PlaylistPanel';
import { withAlpha } from '../hooks/useDominantColor';
import type { ProviderPlaylistSummary } from '../../shared/music/providers';

/** 音乐地球的 DOM 覆盖层：标题、地区图例、地区歌单面板。 */
export default function GlobeOverlay() {
  const requestSpace = useRuntimeStore((s) => s.requestSpace);
  const selectedRegionId = useGlobeStore((s) => s.selectedRegionId);
  const setSelectedRegion = useGlobeStore((s) => s.setSelectedRegion);
  const [density, setDensity] = useState<Record<string, number>>({});
  const [playlists, setPlaylists] = useState<ProviderPlaylistSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [panelTarget, setPanelTarget] = useState<PlaylistPanelTarget | null>(null);

  /* 图例密度 */
  useEffect(() => {
    if (typeof window.musicOS?.getNeteaseRegionDensity !== 'function') {
      return undefined;
    }
    let cancelled = false;
    window.musicOS
      .getNeteaseRegionDensity()
      .then((list) => {
        if (cancelled) return;
        const map: Record<string, number> = {};
        for (const item of list ?? []) {
          map[item.id] = item.playlistTotal;
        }
        setDensity(map);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  /* 选中地区的歌单 */
  useEffect(() => {
    if (!selectedRegionId || typeof window.musicOS?.getNeteaseRegionPlaylists !== 'function') {
      setPlaylists([]);
      return undefined;
    }
    let cancelled = false;
    setIsLoading(true);
    window.musicOS
      .getNeteaseRegionPlaylists(selectedRegionId)
      .then((list) => {
        if (!cancelled) {
          setPlaylists(Array.isArray(list) ? list : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPlaylists([]);
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
  }, [selectedRegionId]);

  const region = REGION_POINTS.find((candidate) => candidate.id === selectedRegionId) ?? null;

  return (
    <>
      {/* 返回 */}
      <button
        type="button"
        onClick={() => requestSpace('home')}
        className="absolute top-24 left-10 z-30 flex items-center gap-2 text-white/50 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="tracking-[0.14em] text-[11px] uppercase">返回</span>
      </button>

      {/* 标题 */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 text-center pointer-events-none">
        <h1 style={{ fontSize: 22, fontWeight: 300, letterSpacing: '-0.01em', color: 'var(--mo-ink)' }}>
          音乐地球
        </h1>
        <p className="mt-2" style={{ fontSize: 11, color: 'var(--mo-ink-faint)' }}>
          点击地区查看歌单 · 你听过的地区会亮起光环（按歌手名称近似）
        </p>
      </div>

      {/* 地区图例 */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 flex flex-wrap items-center justify-center gap-2"
        style={{ maxWidth: 'min(760px, calc(100vw - 80px))' }}
      >
        {REGION_POINTS.map((item) => {
          const isActive = selectedRegionId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedRegion(isActive ? null : item.id)}
              className="flex items-center gap-2 rounded-full px-3.5 py-2 transition-colors"
              style={{
                background: isActive ? withAlpha(item.color, 0.18) : 'rgba(12, 12, 15, 0.72)',
                border: `1px solid ${isActive ? withAlpha(item.color, 0.42) : 'var(--mo-line)'}`,
                color: isActive ? item.color : 'var(--mo-ink-muted)',
              }}
            >
              <span
                className="rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  background: item.color,
                  boxShadow: `0 0 10px ${withAlpha(item.color, 0.8)}`,
                }}
              />
              <span style={{ fontSize: 12 }}>{item.label}</span>
              {density[item.id] ? (
                <span className="font-mono" style={{ fontSize: 10, opacity: 0.6 }}>
                  {density[item.id]}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* 地区歌单面板 */}
      <AnimatePresence>
        {region ? (
          <motion.aside
            key={region.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-0 right-0 bottom-0 z-40 flex flex-col"
            style={{
              width: 'min(400px, 92vw)',
              background: 'rgba(11, 11, 14, 0.92)',
              borderLeft: '1px solid var(--mo-line)',
            }}
          >
            <div className="flex items-start justify-between p-7 pb-4">
              <div>
                <div className="font-mono tracking-[0.16em] uppercase" style={{ fontSize: 10, color: 'var(--mo-ink-faint)' }}>
                  地区歌单
                </div>
                <div className="mt-1.5 flex items-center gap-2.5">
                  <span
                    className="rounded-full"
                    style={{ width: 8, height: 8, background: region.color, boxShadow: `0 0 12px ${withAlpha(region.color, 0.9)}` }}
                  />
                  <span style={{ fontSize: 19, fontWeight: 400, color: 'var(--mo-ink)' }}>{region.label}</span>
                </div>
                <div className="mt-1.5" style={{ fontSize: 11, color: 'var(--mo-ink-muted)' }}>
                  {isLoading ? '载入中…' : `${playlists.length} 个歌单${density[region.id] ? ` · 共 ${density[region.id]} 个` : ''}`}
                </div>
              </div>
              <button
                type="button"
                aria-label="关闭"
                onClick={() => setSelectedRegion(null)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-6 mo-no-scrollbar">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-10" style={{ color: 'var(--mo-ink-faint)' }}>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span style={{ fontSize: 12 }}>正在载入歌单…</span>
                </div>
              ) : playlists.length === 0 ? (
                <div className="px-3 py-8 text-center" style={{ fontSize: 12, color: 'var(--mo-ink-faint)' }}>
                  该地区暂无歌单
                </div>
              ) : (
                <div className="grid gap-1.5">
                  {playlists.map((playlist) => (
                    <button
                      key={playlist.id}
                      type="button"
                      onClick={() =>
                        setPanelTarget({
                          id: playlist.id,
                          title: playlist.title,
                          coverUrl: playlist.coverUrl,
                          kind: playlist.kind,
                        })
                      }
                      className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
                    >
                      <div
                        className="shrink-0"
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 8,
                          background: playlist.coverUrl
                            ? `url(${playlist.coverUrl}) center / cover no-repeat`
                            : 'conic-gradient(from 210deg at 50% 50%, #2a2a2e, transparent 32%, #0a0a0c 56%, #3a3a3e 80%, #2a2a2e)',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate" style={{ fontSize: 13, color: 'var(--mo-ink)' }}>
                          {playlist.title}
                        </div>
                        <div className="truncate" style={{ fontSize: 11, color: 'var(--mo-ink-faint)' }}>
                          {playlist.trackCount ? `${playlist.trackCount} 首` : ''}
                          {playlist.playCount ? ` · ${Math.round(playlist.playCount / 10000)} 万播放` : ''}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>

      <PlaylistPanel target={panelTarget} onClose={() => setPanelTarget(null)} />
    </>
  );
}
