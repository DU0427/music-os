'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import NowPlayingCard from '../ui/NowPlayingCard';
import StageChips from '../ui/StageChips';
import PlaylistPanel, { type PlaylistPanelTarget } from '../ui/PlaylistPanel';
import { useAudioStore } from '../audio/store';
import { useDominantColor, withAlpha } from '../hooks/useDominantColor';
import type { ProviderHomeContent, ProviderPlaylistSummary } from '../../shared/music/providers';

const PERSPECTIVE = 1300;

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

/** 单张波场封面：自己的封面色作辉光，悬停浮起并浮现标题。 */
function WaveCover({
  item,
  onOpen,
}: {
  item: ProviderPlaylistSummary;
  onOpen: (playlist: ProviderPlaylistSummary) => void;
}) {
  const accent = useDominantColor(item.coverUrl, '#f5f5f7');
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="group relative cursor-pointer select-none"
      style={{ pointerEvents: 'auto' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onOpen(item)}
    >
      {/* 封面自己的辉光 */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          inset: '-40%',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${withAlpha(accent, hovered ? 0.5 : 0.22)}, transparent 66%)`,
          filter: 'blur(26px)',
          transition: 'background 400ms var(--mo-ease)',
        }}
      />
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1 / 1',
          borderRadius: 10,
          background: item.coverUrl
            ? `url(${item.coverUrl}) center / cover no-repeat`
            : 'conic-gradient(from 210deg at 50% 50%, #2a2a2e, transparent 32%, #0a0a0c 56%, #3a3a3e 80%, #2a2a2e)',
          border: `1px solid ${hovered ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.09)'}`,
          boxShadow: hovered
            ? `0 26px 60px rgba(0,0,0,0.7), 0 0 40px ${withAlpha(accent, 0.4)}`
            : '0 16px 40px rgba(0,0,0,0.55)',
          transition: 'box-shadow 380ms var(--mo-ease), border-color 380ms var(--mo-ease)',
          WebkitBoxReflect: 'below 7px linear-gradient(transparent 58%, rgba(0,0,0,0.42))',
        }}
      />
      {/* 悬停标题 */}
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap"
        style={{
          bottom: -34,
          opacity: hovered ? 1 : 0,
          transform: `translate(-50%, ${hovered ? 0 : 4}px)`,
          transition: 'opacity 260ms var(--mo-ease), transform 260ms var(--mo-ease)',
        }}
      >
        <div
          className="rounded-full px-3 py-1.5"
          style={{
            background: 'var(--mo-bg-elevated-strong)',
            border: '1px solid var(--mo-line)',
            backdropFilter: 'blur(18px) saturate(1.15)',
            WebkitBackdropFilter: 'blur(18px) saturate(1.15)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--mo-ink)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.title}
          </div>
          <div style={{ fontSize: 9, color: 'var(--mo-ink-faint)', marginTop: 1 }}>
            {item.trackCount ? `${item.trackCount} 首` : ''}
            {item.kind === 'toplist' ? ' · 榜单' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 封面波场：两条 3D 封面带（推荐歌单 / 排行榜）在黑色舞台上起伏。
 * 鼠标移动产生视差；播放时波幅与涟漪由 bass/beat 驱动；封面自带辉光与地板倒影。
 */
export default function WaveHome({ onDetail }: { onDetail?: () => void }) {
  const [content, setContent] = useState<ProviderHomeContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelTarget, setPanelTarget] = useState<PlaylistPanelTarget | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement | null>());
  const pointerRef = useRef({ x: 0.5, y: 0.5 });

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

  const playlists = (content?.playlists ?? []).slice(0, 12);
  const toplists = (content?.toplists ?? []).slice(0, 12);

  /* 鼠标视差 */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const onMove = (event: MouseEvent) => {
      const rect = stage.getBoundingClientRect();
      pointerRef.current = {
        x: (event.clientX - rect.left) / Math.max(rect.width, 1),
        y: (event.clientY - rect.top) / Math.max(rect.height, 1),
      };
    };
    stage.addEventListener('mousemove', onMove);
    return () => stage.removeEventListener('mousemove', onMove);
  }, []);

  /* 波场推进：rAF 直接写 transform（视差 + 起伏 + 音乐律动 + 景深） */
  useEffect(() => {
    let raf = 0;
    let tiltX = 0;
    let tiltY = 0;
    const started = performance.now();

    const tick = (now: number) => {
      const stage = stageRef.current;
      const metrics = useAudioStore.getState().metrics;
      const isPlaying = useAudioStore.getState().isPlaying;
      const t = (now - started) / 1000;

      // 视角倾斜（向鼠标方向，lerp 平滑）
      const targetTiltY = (pointerRef.current.x - 0.5) * 9;
      const targetTiltX = -(pointerRef.current.y - 0.5) * 5.5;
      tiltY += (targetTiltY - tiltY) * 0.06;
      tiltX += (targetTiltX - tiltX) * 0.06;
      if (stage) {
        stage.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
      }

      const amp = 14 + metrics.bass * 90 + metrics.beatPulse * 44;
      const speed = 0.55 + metrics.energy * 1.5;

      for (const [key, el] of itemRefs.current) {
        if (!el) continue;
        const [band, colText] = key.split('-');
        const col = Number(colText) || 0;
        const bandPhase = band === 'top' ? 0.6 : 2.1;
        const wave = Math.sin(col * 0.72 + t * speed + bandPhase);
        const ripple = Math.sin(col * 0.5 - t * 3.4) * metrics.beatPulse;
        const z = wave * amp + ripple * 34;
        const bob = Math.cos(col * 0.5 + t * speed * 0.8 + bandPhase) * (isPlaying ? 5 : 2.5);
        const depthScale = 1 + z / 1400;
        const ry = Math.sin(col * 0.4 + t * 0.25) * 3.2;
        el.style.transform = `translate3d(0, ${bob}px, ${z}px) rotateY(${ry}deg) scale(${depthScale})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playlists.length, toplists.length]);

  const openPlaylist = (playlist: ProviderPlaylistSummary) => {
    setPanelTarget({
      id: playlist.id,
      title: playlist.title,
      coverUrl: playlist.coverUrl,
      kind: playlist.kind,
    });
  };

  const renderBand = (kind: 'top' | 'bottom', items: ProviderPlaylistSummary[]) =>
    items.length === 0 ? null : (
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
          gap: 'clamp(8px, 0.9vw, 14px)',
          padding: '0 40px',
        }}
      >
        {items.map((item, index) => (
          <div
            key={`${kind}-${index}`}
            ref={(el) => {
              itemRefs.current.set(`${kind}-${index}`, el);
            }}
            style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
          >
            <WaveCover item={item} onOpen={openPlaylist} />
          </div>
        ))}
      </div>
    );

  return (
    <div className="absolute inset-0 z-10">
      <div className="absolute inset-0 mo-no-scrollbar overflow-y-auto overflow-x-hidden">
        <div style={{ padding: '72px 0 48px' }}>
          {/* 现在播放 */}
          <div style={{ padding: '0 40px', marginBottom: 34 }}>
            <NowPlayingCard onDetail={onDetail} />
          </div>

          {/* 封面波场 */}
          <div style={{ perspective: PERSPECTIVE }}>
            <div ref={stageRef} style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}>
              <div className="flex items-baseline gap-3" style={{ padding: '0 40px', marginBottom: 14 }}>
                <h2 style={{ fontSize: 13, fontWeight: 500, color: 'var(--mo-ink-muted)', letterSpacing: '0.08em' }}>
                  推荐歌单
                </h2>
                <span className="font-mono" style={{ fontSize: 10, color: 'var(--mo-ink-faint)' }}>
                  {playlists.length}
                </span>
              </div>
              {renderBand('top', playlists)}

              <div className="flex items-baseline gap-3" style={{ padding: '0 40px', margin: '46px 0 14px' }}>
                <h2 style={{ fontSize: 13, fontWeight: 500, color: 'var(--mo-ink-muted)', letterSpacing: '0.08em' }}>
                  排行榜
                </h2>
                <span className="font-mono" style={{ fontSize: 10, color: 'var(--mo-ink-faint)' }}>
                  {toplists.length}
                </span>
              </div>
              {renderBand('bottom', toplists)}
            </div>
          </div>

          {/* 载入 / 错误 */}
          {isLoading || loadError ? (
            <div className="flex flex-col items-center gap-3" style={{ padding: '32px 40px 0' }}>
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
      </div>

      <StageChips />
      <Clock />
      <PlaylistPanel target={panelTarget} onClose={() => setPanelTarget(null)} />
    </div>
  );
}