'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Loader2, RefreshCw } from 'lucide-react';
import { useDominantColor, withAlpha } from '../hooks/useDominantColor';
import StageChips from '../ui/StageChips';
import StageHero from '../ui/StageHero';
import PlaylistPanel, { type PlaylistPanelTarget } from '../ui/PlaylistPanel';
import type { ProviderHomeContent, ProviderPlaylistSummary } from '../../shared/music/providers';

/* ——— 走廊参数（手动透视投影：P/(P+dist)，避免滚动容器扁平化 3D） ——— */
const PERSPECTIVE = 1100;
const ITEM_SPACING_Z = 900;
const SECTION_GAP = 1500;
const SCROLL_TO_Z = 2.2;
const FAR_CULL = 5600;
const NEAR_CULL = -320;

const PLAYLIST_POSITIONS: Array<{ x: number; y: number }> = [
  { x: -300, y: -70 },
  { x: 320, y: 50 },
  { x: -230, y: -140 },
  { x: 280, y: 110 },
  { x: -340, y: -20 },
  { x: 240, y: 130 },
  { x: -270, y: -110 },
  { x: 310, y: 30 },
  { x: -210, y: -160 },
  { x: 330, y: 90 },
  { x: -290, y: -40 },
  { x: 260, y: 140 },
];

const TOPLIST_POSITIONS: Array<{ x: number; y: number }> = [
  { x: 300, y: 110 },
  { x: -320, y: -60 },
  { x: 250, y: -130 },
  { x: -270, y: 100 },
  { x: 330, y: -30 },
  { x: -240, y: 140 },
  { x: 280, y: -110 },
  { x: -310, y: 40 },
  { x: 220, y: 150 },
  { x: -330, y: -90 },
  { x: 290, y: 20 },
  { x: -250, y: -150 },
];

interface CorridorItem {
  key: string;
  kind: 'hero' | 'label' | 'playlist' | 'toplist';
  z: number;
  x: number;
  y: number;
  label?: string;
  rank?: number;
  playlist?: ProviderPlaylistSummary;
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const date = `${now.getMonth() + 1}月${now.getDate()}日`;
  return (
    <div className="absolute bottom-10 right-10 text-right pointer-events-none select-none z-30">
      <div className="font-mono tracking-[0.08em]" style={{ fontSize: 15, color: 'var(--mo-ink-faint)' }}>
        {time}
      </div>
      <div className="font-mono tracking-[0.12em] mt-1" style={{ fontSize: 10, color: 'var(--mo-ink-faint)', opacity: 0.7 }}>
        {date}
      </div>
    </div>
  );
}

/** 走廊卡片：封面（自己的封面色作光晕）+ 标题；榜单带排名。 */
function CorridorCard({
  item,
  onOpen,
}: {
  item: CorridorItem;
  onOpen: (playlist: ProviderPlaylistSummary) => void;
}) {
  const coverUrl = item.playlist?.coverUrl ?? null;
  const accent = useDominantColor(coverUrl, '#f5f5f7');
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="group cursor-pointer select-none"
      style={{ width: 210 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => {
        if (item.playlist) onOpen(item.playlist);
      }}
    >
      <div className="relative">
        {/* 封面光晕：走廊由封面自己照亮 */}
        <div
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            inset: '-18%',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${withAlpha(accent, hovered ? 0.4 : 0.22)}, transparent 68%)`,
            filter: 'blur(38px)',
            transition: 'background 400ms var(--mo-ease)',
          }}
        />
        <div
          style={{
            position: 'relative',
            width: 210,
            height: 210,
            borderRadius: 12,
            background: coverUrl
              ? `url(${coverUrl}) center / cover no-repeat`
              : 'conic-gradient(from 210deg at 50% 50%, #2a2a2e, transparent 32%, #0a0a0c 56%, #3a3a3e 80%, #2a2a2e)',
            border: `1px solid ${hovered ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)'}`,
            boxShadow: hovered ? `0 30px 80px rgba(0,0,0,0.7), 0 0 40px ${withAlpha(accent, 0.28)}` : '0 24px 60px rgba(0,0,0,0.6)',
            transition: 'box-shadow 400ms var(--mo-ease), border-color 400ms var(--mo-ease)',
          }}
        />
        {item.rank ? (
          <div
            className="absolute font-mono"
            style={{
              top: -10,
              left: -10,
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--mo-ink)',
              background: 'rgba(10,10,12,0.7)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 999,
              padding: '2px 8px',
              backdropFilter: 'blur(10px)',
            }}
          >
            {item.rank}
          </div>
        ) : null}
      </div>

      <div className="mt-3.5 px-0.5">
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: hovered ? 'var(--mo-ink)' : 'var(--mo-ink-soft)',
            lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            transition: 'color 300ms var(--mo-ease)',
          }}
        >
          {item.playlist?.title ?? ''}
        </div>
        <div className="mt-1" style={{ fontSize: 10, color: 'var(--mo-ink-faint)' }}>
          {item.playlist?.trackCount ? `${item.playlist.trackCount} 首` : ''}
          {item.playlist?.kind === 'toplist' ? ' · 榜单' : ''}
        </div>
      </div>
    </div>
  );
}

export default function CorridorHome({ onDetail }: { onDetail?: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement | null>());
  const [content, setContent] = useState<ProviderHomeContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelTarget, setPanelTarget] = useState<PlaylistPanelTarget | null>(null);

  const loadContent = useCallback(async () => {
    if (typeof window.musicOS?.getNeteaseHomeContent !== 'function') {
      setLoadError('当前版本未提供平台内容能力。');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await window.musicOS.getNeteaseHomeContent();
      const hasAny = (data?.playlists?.length ?? 0) + (data?.toplists?.length ?? 0) > 0;
      setContent(data ?? null);
      setLoadError(hasAny ? null : '暂时没有可展示的内容。');
    } catch {
      setLoadError('内容加载失败，请检查网络后重试。');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContent();
  }, [loadContent]);

  /* ——— 组装走廊：英雄 → 推荐歌单 → 排行榜 ——— */
  const { items, totalZ } = useMemo(() => {
    const list: CorridorItem[] = [{ key: 'hero', kind: 'hero', z: 0, x: 0, y: 0 }];
    let cursor = -SECTION_GAP;

    const playlists = (content?.playlists ?? []).slice(0, 12);
    if (playlists.length > 0) {
      list.push({ key: 'label-playlist', kind: 'label', z: cursor, x: 0, y: -40, label: '推荐歌单' });
      cursor -= 700;
      playlists.forEach((playlist, index) => {
        const pos = PLAYLIST_POSITIONS[index % PLAYLIST_POSITIONS.length];
        list.push({
          key: `playlist-${playlist.id}`,
          kind: 'playlist',
          z: cursor,
          x: pos.x,
          y: pos.y,
          playlist,
        });
        cursor -= ITEM_SPACING_Z;
      });
    }

    const toplists = (content?.toplists ?? []).slice(0, 12);
    if (toplists.length > 0) {
      cursor -= SECTION_GAP;
      list.push({ key: 'label-toplist', kind: 'label', z: cursor, x: 0, y: -40, label: '排行榜' });
      cursor -= 700;
      toplists.forEach((playlist, index) => {
        const pos = TOPLIST_POSITIONS[index % TOPLIST_POSITIONS.length];
        list.push({
          key: `toplist-${playlist.id}`,
          kind: 'toplist',
          z: cursor,
          x: pos.x,
          y: pos.y,
          rank: index + 1,
          playlist,
        });
        cursor -= ITEM_SPACING_Z;
      });
    }

    return { items: list, totalZ: Math.abs(cursor) + 2000 };
  }, [content]);

  const scrollHeight = Math.round(totalZ / SCROLL_TO_Z);

  /* ——— 滚动驱动的走廊推进（rAF + lerp，直接写 style，不触发 React 重渲染） ——— */
  useEffect(() => {
    let raf = 0;
    let camZ = 0;
    const tick = () => {
      const scrollTop = scrollRef.current?.scrollTop ?? 0;
      const target = scrollTop * SCROLL_TO_Z;
      camZ += (target - camZ) * 0.12;

      for (const item of items) {
        const el = itemRefs.current.get(item.key);
        if (!el) continue;
        const dist = -(item.z + camZ);
        if (dist < NEAR_CULL || dist > FAR_CULL) {
          if (el.style.visibility !== 'hidden') {
            el.style.visibility = 'hidden';
            el.style.opacity = '0';
          }
          continue;
        }
        const scale = PERSPECTIVE / (PERSPECTIVE + Math.max(dist, 0));
        const x = item.x * scale;
        const y = item.y * scale;
        const farFade = Math.min(1, Math.max(0, (FAR_CULL - dist) / 1600));
        const nearFade = Math.min(1, Math.max(0, (dist - NEAR_CULL) / 420));
        const opacity = Math.min(farFade, nearFade);
        el.style.visibility = 'visible';
        el.style.opacity = String(opacity);
        el.style.zIndex = String(Math.max(1, Math.round(2000 - dist)));
        el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [items]);

  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 0 ? Math.min(1, el.scrollTop / max) : 0);
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollHeight]);

  return (
    <div className="absolute inset-0 z-10">
      {/* 走廊滚动层 */}
      <div
        ref={scrollRef}
        className="absolute inset-0 overflow-y-auto overflow-x-hidden"
        style={{ overscrollBehavior: 'contain' }}
      >
        {/* 固定视口的走廊世界（sticky 钉住，滚动只驱动推进） */}
        <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
          {items.map((item) => {
            const isHero = item.kind === 'hero';
            const isLabel = item.kind === 'label';
            return (
              <div
                key={item.key}
                ref={(el) => {
                  itemRefs.current.set(item.key, el);
                }}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '45%',
                  transform: 'translate(-50%, -50%)',
                  willChange: 'transform, opacity',
                }}
                className={isHero ? 'pointer-events-auto' : 'pointer-events-auto'}
              >
                {isHero ? (
                  <StageHero onDetail={onDetail} />
                ) : isLabel ? (
                  <div
                    className="pointer-events-none text-center whitespace-nowrap"
                    style={{
                      fontSize: 'clamp(40px, 5.6vw, 64px)',
                      fontWeight: 300,
                      letterSpacing: '-0.02em',
                      color: 'var(--mo-ink)',
                      opacity: 0.85,
                      textShadow: '0 2px 40px rgba(0,0,0,0.6)',
                    }}
                  >
                    {item.label}
                  </div>
                ) : (
                  <CorridorCard
                    item={item}
                    onOpen={(playlist) =>
                      setPanelTarget({
                        id: playlist.id,
                        title: playlist.title,
                        coverUrl: playlist.coverUrl,
                        kind: playlist.kind,
                      })
                    }
                  />
                )}
              </div>
            );
          })}

          {/* 载入 / 错误提示（钉在视口内） */}
          {isLoading || loadError ? (
            <div className="absolute inset-x-0 bottom-24 flex flex-col items-center gap-3 pointer-events-auto">
              {isLoading ? (
                <div className="flex items-center gap-2" style={{ color: 'var(--mo-ink-faint)' }}>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span style={{ fontSize: 12 }}>正在连接网易云…</span>
                </div>
              ) : (
                <>
                  <span style={{ fontSize: 12, color: 'var(--mo-ink-faint)' }}>{loadError}</span>
                  <button
                    type="button"
                    onClick={() => void loadContent()}
                    className="flex items-center gap-2 rounded-full px-4 py-2"
                    style={{
                      fontSize: 12,
                      color: 'var(--mo-ink)',
                      background: 'var(--mo-bg-elevated)',
                      border: '1px solid var(--mo-line)',
                    }}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    重试
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>

        {/* 滚动高度占位 */}
        <div style={{ height: Math.max(0, scrollHeight - 100) }} aria-hidden />
      </div>

      {/* 右侧进度轨 */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 h-40 w-px z-20 pointer-events-none" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div
          style={{
            position: 'absolute',
            left: -1.5,
            width: 4,
            height: 4,
            borderRadius: 999,
            background: 'var(--mo-ink)',
            boxShadow: '0 0 10px rgba(255,255,255,0.6)',
            top: `${progress * 100}%`,
            transform: 'translateY(-50%)',
            transition: 'top 120ms linear',
          }}
        />
      </div>

      <StageChips />
      <Clock />

      <PlaylistPanel target={panelTarget} onClose={() => setPanelTarget(null)} />
    </div>
  );
}