'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import NowPlayingCard from '../ui/NowPlayingCard';
import StageChips from '../ui/StageChips';
import PlaylistPanel, { type PlaylistPanelTarget } from '../ui/PlaylistPanel';
import { useAudioStore } from '../audio/store';
import { useLibraryStore } from '../store/library';
import { useDominantColor, withAlpha } from '../hooks/useDominantColor';
import { useStageScale } from '../hooks/useStageScale';
import type { ProviderHomeContent, ProviderPlaylistSummary } from '../../shared/music/providers';
import type { TrackRecord } from '../../shared/ipc/music';

/* 封面基准尺寸（900px 高窗口下的验收值）：渲染时乘以 useStageScale 的缩放系数。 */
const WAVE_COVER_BASE = 92;
const CHART_BIG_BASE = 126;
const CHART_SMALL_BASE = 84;

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

/** 悬停时浮在封面内部的标题条（不越界，不与底部入口抢位置）。 */
function CoverOverlay({ title, sub, visible, radius = 10 }: { title: string; sub: string; visible: boolean; radius?: number }) {
  const s = useStageScale();
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0"
      style={{
        padding: `${Math.round(22 * s)}px ${Math.round(9 * s)}px ${Math.round(7 * s)}px`,
        borderRadius: `0 0 ${radius}px ${radius}px`,
        background: 'linear-gradient(to top, rgba(0,0,0,0.88), rgba(0,0,0,0.42) 52%, transparent)',
        opacity: visible ? 1 : 0,
        transform: `translateY(${visible ? 0 : 3}px)`,
        transition: 'opacity 240ms var(--mo-ease), transform 240ms var(--mo-ease)',
      }}
    >
      <div style={{ fontSize: Math.max(9, Math.round(10.5 * s)), lineHeight: 1.25, color: 'rgba(255,255,255,0.94)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {title}
      </div>
      {sub ? (
        <div
          style={{
            fontSize: Math.max(8, Math.round(9 * s)),
            lineHeight: 1.3,
            marginTop: 1,
            color: 'rgba(255,255,255,0.55)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
}

/** 波场封面（推荐歌单 / 最近播放）。 */
function WaveCover({
  coverUrl,
  title,
  sub,
  onOpen,
}: {
  coverUrl: string | null;
  title: string;
  sub: string;
  onOpen: () => void;
}) {
  const accent = useDominantColor(coverUrl, '#f5f5f7');
  const [hovered, setHovered] = useState(false);
  const s = useStageScale();
  return (
    <div
      className="group relative cursor-pointer select-none"
      style={{ width: Math.round(WAVE_COVER_BASE * s) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onOpen}
    >
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
          background: coverUrl
            ? `url(${coverUrl}) center / cover no-repeat`
            : 'conic-gradient(from 210deg at 50% 50%, #2a2a2e, transparent 32%, #0a0a0c 56%, #3a3a3e 80%, #2a2a2e)',
          border: `1px solid ${hovered ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.09)'}`,
          boxShadow: hovered
            ? `0 26px 60px rgba(0,0,0,0.7), 0 0 40px ${withAlpha(accent, 0.4)}`
            : '0 16px 40px rgba(0,0,0,0.55)',
          transition: 'box-shadow 380ms var(--mo-ease), border-color 380ms var(--mo-ease)',
          overflow: 'hidden',
        }}
      >
        <CoverOverlay title={title} sub={sub} visible={hovered} />
      </div>
    </div>
  );
}

/** 榜单封面（大号排名数字；前三名更大）。 */
function ChartCover({
  coverUrl,
  title,
  rank,
  big,
  onOpen,
}: {
  coverUrl: string | null;
  title: string;
  rank: number;
  big: boolean;
  onOpen: () => void;
}) {
  const accent = useDominantColor(coverUrl, '#f5f5f7');
  const [hovered, setHovered] = useState(false);
  const s = useStageScale();
  const size = Math.round((big ? CHART_BIG_BASE : CHART_SMALL_BASE) * s);
  return (
    <div
      className="group relative shrink-0 cursor-pointer select-none"
      style={{ width: size }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onOpen}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          inset: '-36%',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${withAlpha(accent, hovered ? 0.46 : 0.18)}, transparent 66%)`,
          filter: 'blur(28px)',
          transition: 'background 400ms var(--mo-ease)',
        }}
      />
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1 / 1',
          borderRadius: 10,
          background: coverUrl
            ? `url(${coverUrl}) center / cover no-repeat`
            : 'conic-gradient(from 210deg at 50% 50%, #2a2a2e, transparent 32%, #0a0a0c 56%, #3a3a3e 80%, #2a2a2e)',
          border: `1px solid ${hovered ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.09)'}`,
          boxShadow: hovered
            ? `0 26px 60px rgba(0,0,0,0.7), 0 0 40px ${withAlpha(accent, 0.4)}`
            : '0 16px 40px rgba(0,0,0,0.55)',
          transition: 'box-shadow 380ms var(--mo-ease), border-color 380ms var(--mo-ease)',
        }}
      />
      {/* 排名数字：压在封面左下角 */}
      <div
        className="pointer-events-none absolute font-mono"
        style={{
          left: big ? -10 : -7,
          bottom: big ? -14 : -10,
          fontSize: big ? 46 : 22,
          fontWeight: 300,
          lineHeight: 1,
          color: hovered ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.42)',
          textShadow: '0 4px 20px rgba(0,0,0,0.9)',
          transition: 'color 300ms var(--mo-ease)',
        }}
      >
        {String(rank).padStart(2, '0')}
      </div>
    </div>
  );
}

/** 最近播放（你自己的曲目）。 */
function TrackCover({
  coverUrl,
  title,
  artist,
  onOpen,
}: {
  coverUrl: string | null;
  title: string;
  artist: string;
  onOpen: () => void;
}) {
  const accent = useDominantColor(coverUrl, '#f5f5f7');
  const [hovered, setHovered] = useState(false);
  const s = useStageScale();
  return (
    <div
      className="group relative cursor-pointer select-none"
      style={{ width: Math.round(WAVE_COVER_BASE * s) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onOpen}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          inset: '-40%',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${withAlpha(accent, hovered ? 0.5 : 0.2)}, transparent 66%)`,
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
          background: coverUrl
            ? `url(${coverUrl}) center / cover no-repeat`
            : 'conic-gradient(from 210deg at 50% 50%, #2a2a2e, transparent 32%, #0a0a0c 56%, #3a3a3e 80%, #2a2a2e)',
          border: `1px solid ${hovered ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.09)'}`,
          boxShadow: hovered
            ? `0 26px 60px rgba(0,0,0,0.7), 0 0 40px ${withAlpha(accent, 0.4)}`
            : '0 16px 40px rgba(0,0,0,0.55)',
          transition: 'box-shadow 380ms var(--mo-ease), border-color 380ms var(--mo-ease)',
          overflow: 'hidden',
        }}
      >
        <CoverOverlay title={title} sub={artist} visible={hovered} />
      </div>
    </div>
  );
}

/** 区块标题（标题 + 计数 + 右侧说明）。 */
function SectionHead({ title, count, hint }: { title: string; count: number; hint?: string }) {
  const s = useStageScale();
  return (
    <div className="flex items-baseline gap-3" style={{ padding: '0 40px', marginBottom: Math.round(14 * s) }}>
      <h2 style={{ fontSize: Math.max(11, Math.round(14 * s)), fontWeight: 500, color: 'var(--mo-ink)', letterSpacing: '0.02em' }}>{title}</h2>
      <span className="font-mono" style={{ fontSize: Math.max(9, Math.round(10 * s)), color: 'var(--mo-ink-faint)' }}>
        {count}
      </span>
      {hint ? <span style={{ fontSize: Math.max(10, Math.round(11 * s)), color: 'var(--mo-ink-faint)', marginLeft: 4 }}>{hint}</span> : null}
    </div>
  );
}

/**
 * 首页：问候语 + 现在播放 + 推荐歌单 + 排行榜（榜单语言）+ 最近播放。
 * 波场（3D 视差 + 起伏 + 音乐律动）保留；不同区块用不同排版语言区分层次。
 */
export default function WaveHome({ onDetail }: { onDetail?: () => void }) {
  const [content, setContent] = useState<ProviderHomeContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelTarget, setPanelTarget] = useState<PlaylistPanelTarget | null>(null);

  const tracks = useLibraryStore((s) => s.tracks);
  const history = useLibraryStore((s) => s.history);

  const stageScale = useStageScale();
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

  /* 最近播放：按时间倒序去重，取最多 12 首真实曲目 */
  const recentTracks = useMemo<TrackRecord[]>(() => {
    if (history.length === 0 || tracks.length === 0) {
      return [];
    }
    const ordered = [...history].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );
    const seen = new Set<string>();
    const result: TrackRecord[] = [];
    for (const record of ordered) {
      if (seen.has(record.trackId)) continue;
      const track = tracks.find((candidate) => candidate.id === record.trackId);
      if (!track) continue;
      seen.add(record.trackId);
      result.push(track);
      if (result.length >= 12) break;
    }
    return result;
  }, [history, tracks]);

  /* 问候语 */
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 6) return '夜深了';
    if (hour < 11) return '早上好';
    if (hour < 14) return '中午好';
    if (hour < 18) return '下午好';
    return '晚上好';
  }, []);
  const greetingSub = recentTracks.length
    ? `上次听到「${recentTracks[0].title}」`
    : '今天想听点什么？';

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

  /* 波场推进（视差 + 起伏 + 音乐律动） */
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
        const bandPhase = band === 'playlist' ? 0.6 : band === 'chart' ? 2.1 : 3.4;
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
  }, [playlists.length, toplists.length, recentTracks.length]);

  const openPlaylist = (playlist: ProviderPlaylistSummary) => {
    setPanelTarget({
      id: playlist.id,
      title: playlist.title,
      coverUrl: playlist.coverUrl,
      kind: playlist.kind,
    });
  };

  const renderWaveBand = (band: string, children: React.ReactNode[]) =>
    children.length === 0 ? null : (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${children.length}, minmax(0, 1fr))`,
          gap: 'clamp(8px, 0.9vw, 14px)',
          padding: '0 40px',
        }}
      >
        {children.map((child, index) => (
          <div
            key={`${band}-${index}`}
            ref={(el) => {
              itemRefs.current.set(`${band}-${index}`, el);
            }}
            style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
          >
            {child}
          </div>
        ))}
      </div>
    );

  return (
    <div className="absolute inset-0 z-10">
      <div className="absolute inset-0 mo-no-scrollbar overflow-y-auto overflow-x-hidden">
        <div style={{ padding: `${Math.round(Math.max(52, 48 * stageScale))}px 0 ${Math.round(26 * stageScale)}px` }}>
          {/* 问候语 */}
          <div style={{ padding: '0 40px', marginBottom: Math.round(18 * stageScale) }}>
            <h1 style={{ fontSize: Math.max(19, Math.round(30 * stageScale)), fontWeight: 300, letterSpacing: '-0.02em', color: 'var(--mo-ink)' }}>
              {greeting}
            </h1>
            <p className="mt-1.5" style={{ fontSize: Math.max(10, Math.round(12 * stageScale)), color: 'var(--mo-ink-faint)' }}>
              {greetingSub}
            </p>
          </div>

          {/* 现在播放 */}
          <div style={{ padding: '0 40px', marginBottom: Math.round(26 * stageScale) }}>
            <NowPlayingCard onDetail={onDetail} />
          </div>

          {/* 波场：推荐歌单 + 榜单 + 最近播放 */}
          <div style={{ perspective: 1300 }}>
            <div ref={stageRef} style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}>
              {/* 推荐歌单 */}
              <div style={{ marginBottom: Math.round(30 * stageScale) }}>
                <SectionHead title="推荐歌单" count={playlists.length} hint="网易云编辑精选" />
                {renderWaveBand(
                  'playlist',
                  playlists.map((playlist) => (
                    <WaveCover
                      key={playlist.id}
                      coverUrl={playlist.coverUrl}
                      title={playlist.title}
                      sub={playlist.trackCount ? `${playlist.trackCount} 首` : ''}
                      onOpen={() => openPlaylist(playlist)}
                    />
                  )),
                )}
              </div>

              {/* 排行榜（榜单语言：前三大 + 大号排名） */}
              {toplists.length > 0 ? (
                <div style={{ marginBottom: Math.round(30 * stageScale) }}>
                  <SectionHead title="排行榜" count={toplists.length} hint="此刻最热" />
                  <div className="flex items-end" style={{ padding: '0 40px', gap: 'clamp(10px, 1.1vw, 18px)' }}>
                    {toplists.map((playlist, index) => (
                      <div
                        key={`chart-${index}`}
                        ref={(el) => {
                          itemRefs.current.set(`chart-${index}`, el);
                        }}
                        style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
                      >
                        <ChartCover
                          coverUrl={playlist.coverUrl}
                          title={playlist.title}
                          rank={index + 1}
                          big={index < 3}
                          onOpen={() => openPlaylist(playlist)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* 最近播放（你自己的曲目） */}
              {recentTracks.length >= 3 ? (
                <div>
                  <SectionHead title="最近播放" count={recentTracks.length} hint="继续听" />
                  {renderWaveBand(
                    'recent',
                    recentTracks.map((track) => (
                      <TrackCover
                        key={track.id}
                        coverUrl={track.artworkUrl}
                        title={track.title}
                        artist={track.artist}
                        onOpen={() => void useAudioStore.getState().playTrack(track)}
                      />
                    )),
                  )}
                </div>
              ) : null}
            </div>
          </div>

          {/* 载入 / 错误 */}
          {isLoading || loadError ? (
            <div className="flex flex-col items-center gap-3" style={{ padding: '28px 40px 0' }}>
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
