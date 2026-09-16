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

/* 底部固定预留：左下入口（曲库/记忆/情绪）区域高度，保证末行文字不压入口。 */
const HOME_BOTTOM_RESERVE = 94;

/* 卡面基准尺寸（900px 高窗口下的验收值）：渲染时乘以 useStageScale 的缩放系数。 */
const PLAYLIST_CARD_BASE = 124;
const CHART_COVER_BASE = 78;
const TRACK_COVER_BASE = 56;

/** 播放量压缩显示（12345 → 1.2万）。 */
function compactCount(value: number | null): string {
  if (!value || value <= 0) {
    return '';
  }
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(1)}亿`;
  }
  if (value >= 10000) {
    return `${(value / 10000).toFixed(1)}万`;
  }
  return String(value);
}

/** 歌单元信息：N 首 · X 播放。 */
function playlistMeta(playlist: ProviderPlaylistSummary): string {
  const parts: string[] = [];
  if (playlist.trackCount) {
    parts.push(`${playlist.trackCount} 首`);
  }
  const plays = compactCount(playlist.playCount);
  if (plays) {
    parts.push(`${plays} 播放`);
  }
  return parts.length > 0 ? parts.join(' · ') : '网易云歌单';
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

/* 卡片文字层级（结构借鉴 Mineradio 的 label / title / sub，配色沿用黑场三段灰） */
const CARD_TITLE_COLOR = 'rgba(255,255,255,0.94)';
const CARD_META_COLOR = 'rgba(255,255,255,0.46)';

/** 无封面时的兜底封面纹理。 */
const COVER_FALLBACK =
  'conic-gradient(from 210deg at 50% 50%, #2a2a2e, transparent 32%, #0a0a0c 56%, #3a3a3e 80%, #2a2a2e)';

/** 封面背后的主色光晕：播放时随 --mo-beat 呼吸（该变量由首页 rAF 每帧只写一次）。 */
function CoverGlow({
  accent,
  hovered,
  inset = '-32%',
  blur = 24,
  base = 0.68,
}: {
  accent: string;
  hovered: boolean;
  inset?: string;
  blur?: number;
  base?: number;
}) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        inset,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${withAlpha(accent, hovered ? 0.5 : 0.24)}, transparent 66%)`,
        filter: `blur(${blur}px)`,
        opacity: `calc(${base} + var(--mo-beat, 0) * 0.42)`,
        transition: 'background 400ms var(--mo-ease)',
      }}
    />
  );
}

/** 载入骨架块：与真实卡面同尺寸，数据到达后不产生跳动。 */
function SkeletonBlock({ width, height, radius = 10 }: { width: number | string; height: number; radius?: number }) {
  return <div aria-hidden className="mo-skeleton" style={{ width, height, borderRadius: radius }} />;
}

/**
 * 推荐歌单卡：左侧文字层级（label / 标题 / 元信息），右下封面。
 * 结构借鉴 Mineradio 的 home-card（文字在左、封面在右下），视觉沿用黑场：细边 + 封面光晕。
 */
function PlaylistCard({
  coverUrl,
  title,
  sub,
  label,
  onOpen,
  waveRef,
}: {
  coverUrl: string | null;
  title: string;
  sub: string;
  label: string;
  onOpen: () => void;
  waveRef?: (el: HTMLSpanElement | null) => void;
}) {
  const accent = useDominantColor(coverUrl, '#f5f5f7');
  const [hovered, setHovered] = useState(false);
  const s = useStageScale();
  const artSize = Math.round(94 * s);
  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative w-full overflow-hidden text-left"
      style={{
        minHeight: Math.round(PLAYLIST_CARD_BASE * s),
        padding: Math.round(16 * s),
        borderRadius: 18,
        border: `1px solid ${hovered ? withAlpha(accent, 0.4) : 'rgba(255,255,255,0.075)'}`,
        background: hovered
          ? `linear-gradient(140deg, ${withAlpha(accent, 0.13)}, rgba(9,9,12,0.72))`
          : 'linear-gradient(140deg, rgba(20,22,28,0.58), rgba(9,9,12,0.7))',
        boxShadow: hovered
          ? `0 24px 60px rgba(0,0,0,0.55), 0 0 34px ${withAlpha(accent, 0.16)}`
          : '0 16px 44px rgba(0,0,0,0.4)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        transition:
          'transform 320ms var(--mo-ease), border-color 320ms var(--mo-ease), box-shadow 320ms var(--mo-ease), background 320ms var(--mo-ease)',
        cursor: 'pointer',
      }}
    >
      <span
        className="font-mono"
        style={{ display: 'block', fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: withAlpha(accent, 0.92) }}
      >
        {label}
      </span>
      <div
        style={{
          marginTop: Math.round(7 * s),
          fontSize: Math.max(13, Math.round(16 * s)),
          fontWeight: 500,
          lineHeight: 1.26,
          color: CARD_TITLE_COLOR,
          maxWidth: '62%',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: Math.round(7 * s),
          fontSize: Math.max(10, Math.round(11.5 * s)),
          color: CARD_META_COLOR,
          maxWidth: '62%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {sub}
      </div>
      <span
        aria-hidden
        style={{
          position: 'absolute',
          right: Math.round(13 * s),
          bottom: Math.round(13 * s),
          width: artSize,
          height: artSize,
          transform: `rotate(${hovered ? 1.5 : 3.5}deg)`,
          transition: 'transform 320ms var(--mo-ease)',
          perspective: 700,
        }}
      >
        <CoverGlow accent={accent} hovered={hovered} inset="-26%" blur={20} />
        <span
          ref={waveRef}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 20,
            background: coverUrl ? `url(${coverUrl}) center / cover no-repeat` : COVER_FALLBACK,
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 18px 44px rgba(0,0,0,0.55)',
            willChange: 'transform',
          }}
        />
      </span>
    </button>
  );
}

/** 榜单卡：等尺寸封面 + 封面内左上角名次徽章 + 下方标题与说明。 */
function ChartCard({
  coverUrl,
  title,
  meta,
  rank,
  onOpen,
  waveRef,
}: {
  coverUrl: string | null;
  title: string;
  meta: string;
  rank: number;
  onOpen: () => void;
  waveRef?: (el: HTMLSpanElement | null) => void;
}) {
  const accent = useDominantColor(coverUrl, '#f5f5f7');
  const [hovered, setHovered] = useState(false);
  const s = useStageScale();
  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative w-full text-left"
      style={{ cursor: 'pointer' }}
    >
      <span style={{ position: 'relative', display: 'block', width: '100%', aspectRatio: '1 / 1' }}>
        <span style={{ position: 'absolute', inset: 0, perspective: 700 }}>
          <CoverGlow accent={accent} hovered={hovered} inset="-30%" blur={22} base={0.64} />
          <span
            ref={waveRef}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 16,
              background: coverUrl ? `url(${coverUrl}) center / cover no-repeat` : COVER_FALLBACK,
              border: `1px solid ${hovered ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.09)'}`,
              boxShadow: hovered
                ? `0 22px 52px rgba(0,0,0,0.62), 0 0 32px ${withAlpha(accent, 0.34)}`
                : '0 14px 36px rgba(0,0,0,0.5)',
              transition: 'box-shadow 340ms var(--mo-ease), border-color 340ms var(--mo-ease)',
              willChange: 'transform',
            }}
          />
        </span>
        {/* 名次：封面左上角徽章，放在 3D 变换之外保持清晰，播放时随节拍提亮 */}
        <span
          className="font-mono"
          style={{
            position: 'absolute',
            top: 6,
            left: 6,
            padding: '1px 7px',
            borderRadius: 999,
            fontSize: Math.max(9, Math.round(11 * s)),
            lineHeight: 1.5,
            color: 'rgba(255,255,255,0.94)',
            background: 'rgba(6,6,9,0.62)',
            border: '1px solid rgba(255,255,255,0.16)',
            opacity: 'calc(0.72 + var(--mo-beat, 0) * 0.5)',
          }}
        >
          {String(rank).padStart(2, '0')}
        </span>
      </span>
      <span
        style={{
          display: 'block',
          marginTop: Math.round(9 * s),
          fontSize: Math.max(11, Math.round(12.5 * s)),
          color: CARD_TITLE_COLOR,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </span>
      <span
        style={{
          display: 'block',
          marginTop: 2,
          fontSize: Math.max(9.5, Math.round(10.5 * s)),
          color: CARD_META_COLOR,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {meta}
      </span>
    </button>
  );
}

/** 最近播放卡：封面 + 标题 + 艺术家（你自己的曲目）。 */
function TrackCard({
  coverUrl,
  title,
  artist,
  onOpen,
  waveRef,
}: {
  coverUrl: string | null;
  title: string;
  artist: string;
  onOpen: () => void;
  waveRef?: (el: HTMLSpanElement | null) => void;
}) {
  const accent = useDominantColor(coverUrl, '#f5f5f7');
  const [hovered, setHovered] = useState(false);
  const s = useStageScale();
  const artSize = Math.round(TRACK_COVER_BASE * s);
  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex w-full items-center text-left"
      style={{
        gap: Math.round(11 * s),
        padding: `${Math.round(7 * s)}px ${Math.round(9 * s)}px`,
        borderRadius: 12,
        border: '1px solid transparent',
        background: hovered ? 'rgba(255,255,255,0.045)' : 'transparent',
        transition: 'background 260ms var(--mo-ease)',
        cursor: 'pointer',
      }}
    >
      <span style={{ position: 'relative', width: artSize, height: artSize, flexShrink: 0, perspective: 700 }}>
        <CoverGlow accent={accent} hovered={hovered} inset="-30%" blur={16} base={0.5} />
        <span
          ref={waveRef}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 12,
            background: coverUrl ? `url(${coverUrl}) center / cover no-repeat` : COVER_FALLBACK,
            border: `1px solid ${hovered ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.09)'}`,
            boxShadow: '0 10px 26px rgba(0,0,0,0.5)',
            willChange: 'transform',
          }}
        />
      </span>
      <span className="min-w-0" style={{ display: 'block' }}>
        <span
          style={{
            display: 'block',
            fontSize: Math.max(11, Math.round(12.5 * s)),
            color: CARD_TITLE_COLOR,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </span>
        <span
          style={{
            display: 'block',
            marginTop: 2,
            fontSize: Math.max(9.5, Math.round(10.5 * s)),
            color: CARD_META_COLOR,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {artist}
        </span>
      </span>
    </button>
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
  const itemRefs = useRef(new Map<string, HTMLElement | null>());
  const pointerRef = useRef({ x: 0.5, y: 0.5 });

  /* 入场编排：内容就位后一次性分级入场（respect prefers-reduced-motion） */
  const [entranceReady, setEntranceReady] = useState(false);
  const [entranceSettled, setEntranceSettled] = useState(false);
  const prefersReducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  useEffect(() => {
    if (isLoading) {
      return undefined;
    }
    const id = requestAnimationFrame(() => setEntranceReady(true));
    return () => cancelAnimationFrame(id);
  }, [isLoading]);

  useEffect(() => {
    if (!entranceReady) {
      return undefined;
    }
    // 入场结束后移除全部 reveal 样式：合成层的 filter/transform 会让文字被重新光栅化而发虚
    const timer = setTimeout(() => setEntranceSettled(true), 900);
    return () => clearTimeout(timer);
  }, [entranceReady]);

  /** 区块入场：淡入 + 轻微模糊收束 + 上浮（问候语 / hero / 各带标题行）。 */
  const sectionReveal = (delay: number): React.CSSProperties => {
    if (prefersReducedMotion || entranceSettled) {
      return {};
    }
    return {
      opacity: entranceReady ? 1 : 0,
      filter: entranceReady ? 'blur(0px)' : 'blur(6px)',
      transform: entranceReady ? 'translateY(0)' : 'translateY(8px)',
      transition: `opacity 520ms var(--mo-ease) ${delay}ms, transform 520ms var(--mo-ease) ${delay}ms, filter 520ms var(--mo-ease) ${delay}ms`,
    };
  };

  /** 封面入场：只做上浮 + 淡入，作用在波场 rAF 不触碰的外层。 */
  const coverReveal = (delay: number): React.CSSProperties => {
    if (prefersReducedMotion || entranceSettled) {
      return {};
    }
    return {
      opacity: entranceReady ? 1 : 0,
      transform: entranceReady ? 'translateY(0)' : 'translateY(12px)',
      transition: `opacity 520ms var(--mo-ease) ${delay}ms, transform 520ms var(--mo-ease) ${delay}ms`,
    };
  };

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

  /* 波场推进（指针视差 + 起伏 + 音乐律动）：只驱动卡面封面，文字层不做 3D 变换以保持清晰 */
  useEffect(() => {
    let raf = 0;
    let lastBeat = -1;
    const started = performance.now();

    const tick = (now: number) => {
      const stage = stageRef.current;
      const metrics = useAudioStore.getState().metrics;
      const isPlaying = useAudioStore.getState().isPlaying;
      const t = (now - started) / 1000;

      // 指针视差：位移只加在封面层，不移动文字
      const parallaxX = (pointerRef.current.x - 0.5) * 14;
      const parallaxY = (pointerRef.current.y - 0.5) * 10;

      if (stage) {
        // 节拍接管：每帧只写一次 CSS 变量，封面光晕 / 名次徽章由 CSS 读取，避免逐元素写 style
        const beat = isPlaying ? metrics.beatPulse : 0;
        if (Math.abs(beat - lastBeat) > 0.008) {
          lastBeat = beat;
          stage.style.setProperty('--mo-beat', beat.toFixed(3));
        }
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
        el.style.transform = `translate3d(${parallaxX}px, ${bob + parallaxY}px, ${z}px) rotateY(${ry}deg) scale(${depthScale})`;
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

  /** 波场只驱动卡面封面（文字保持稳定），key 必须保持 `band-index` 形式供 rAF 取相位。 */
  const waveRefFor = (band: string, index: number) => (el: HTMLElement | null) => {
    const key = `${band}-${index}`;
    if (el) {
      itemRefs.current.set(key, el);
    } else {
      itemRefs.current.delete(key);
    }
  };

  /** 卡片行：columns > 0 用等宽网格（卡片填满列），否则等距铺满整行。 */
  const renderCardRow = (band: string, children: React.ReactNode[], revealBase = 0, columns = 0) =>
    children.length === 0 ? null : (
      <div
        style={{
          display: columns > 0 ? 'grid' : 'flex',
          gridTemplateColumns: columns > 0 ? `repeat(${columns}, minmax(0, 1fr))` : undefined,
          justifyContent: columns > 0 ? undefined : 'space-between',
          alignItems: 'flex-start',
          gap: columns > 0 ? 'clamp(10px, 1.1vw, 18px)' : 'clamp(10px, 1.4vw, 26px)',
          padding: '0 40px',
        }}
      >
        {children.map((child, index) => (
          <div key={`${band}-${index}`} style={coverReveal(revealBase + index * 26)}>
            {child}
          </div>
        ))}
      </div>
    );

  return (
    <div className="absolute inset-0 z-10">
      <div className="absolute inset-0 mo-no-scrollbar overflow-y-auto overflow-x-hidden">
        <div style={{ padding: `${Math.round(Math.max(52, 48 * stageScale))}px 0 ${HOME_BOTTOM_RESERVE}px` }}>
          {/* 问候语 */}
          <div style={{ ...sectionReveal(0), padding: '0 40px', marginBottom: Math.round(18 * stageScale) }}>
            <h1 style={{ fontSize: Math.max(19, Math.round(30 * stageScale)), fontWeight: 300, letterSpacing: '-0.02em', color: 'var(--mo-ink)' }}>
              {greeting}
            </h1>
            <p className="mt-1.5" style={{ fontSize: Math.max(10, Math.round(12 * stageScale)), color: 'var(--mo-ink-faint)' }}>
              {greetingSub}
            </p>
          </div>

          {/* 现在播放 */}
          <div style={{ ...sectionReveal(80), padding: '0 40px', marginBottom: Math.round(26 * stageScale) }}>
            <NowPlayingCard onDetail={onDetail} />
          </div>

          {/* 卡片区：3D 只作用在封面层（各自 perspective），文字层保持 2D 以保证清晰 */}
          <div>
            <div ref={stageRef}>
              {/* 推荐歌单：4 张内容卡（label / 标题 / 元信息 + 右下封面） */}
              <div style={{ ...sectionReveal(160), marginBottom: Math.round(30 * stageScale) }}>
                <SectionHead title="推荐歌单" count={playlists.length} hint="网易云编辑精选" />
                {renderCardRow(
                  'playlist',
                  isLoading && playlists.length === 0
                    ? Array.from({ length: 4 }, (_, index) => (
                        <SkeletonBlock
                          key={`skeleton-playlist-${index}`}
                          width="100%"
                          height={Math.round(PLAYLIST_CARD_BASE * stageScale)}
                          radius={18}
                        />
                      ))
                    : playlists.slice(0, 4).map((playlist, index) => (
                        <PlaylistCard
                          key={playlist.id}
                          coverUrl={playlist.coverUrl}
                          title={playlist.title}
                          sub={playlistMeta(playlist)}
                          label={playlist.kind === 'toplist' ? 'Chart' : 'Playlist'}
                          onOpen={() => openPlaylist(playlist)}
                          waveRef={waveRefFor('playlist', index)}
                        />
                      )),
                  200,
                  4,
                )}
              </div>

              {/* 排行榜：等尺寸榜单卡 + 封面内名次徽章 + 标题 */}
              {isLoading || toplists.length > 0 ? (
                <div style={{ ...sectionReveal(240), marginBottom: Math.round(30 * stageScale) }}>
                  <SectionHead title="排行榜" count={toplists.length} hint="此刻最热" />
                  {renderCardRow(
                    'chart',
                    isLoading && toplists.length === 0
                      ? Array.from({ length: 12 }, (_, index) => (
                          <SkeletonBlock
                            key={`skeleton-chart-${index}`}
                            width="100%"
                            height={Math.round(CHART_COVER_BASE * stageScale)}
                            radius={16}
                          />
                        ))
                      : toplists.slice(0, 12).map((playlist, index) => (
                          <ChartCard
                            key={playlist.id}
                            coverUrl={playlist.coverUrl}
                            title={playlist.title}
                            meta={playlist.trackCount ? `${playlist.trackCount} 首歌曲` : '网易云榜单'}
                            rank={index + 1}
                            onOpen={() => openPlaylist(playlist)}
                            waveRef={waveRefFor('chart', index)}
                          />
                        )),
                    260,
                    12,
                  )}
                </div>
              ) : null}

              {/* 最近播放（你自己的曲目） */}
              {recentTracks.length >= 3 ? (
                <div style={sectionReveal(330)}>
                  <SectionHead title="最近播放" count={recentTracks.length} hint="继续听" />
                  {renderCardRow(
                    'recent',
                    recentTracks.slice(0, 6).map((track, index) => (
                      <TrackCard
                        key={track.id}
                        coverUrl={track.artworkUrl}
                        title={track.title}
                        artist={track.artist}
                        onOpen={() => void useAudioStore.getState().playTrack(track)}
                        waveRef={waveRefFor('recent', index)}
                      />
                    )),
                    360,
                    6,
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
