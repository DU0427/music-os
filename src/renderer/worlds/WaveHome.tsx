'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, CloudOff, Loader2, RefreshCw } from 'lucide-react';
import NowPlayingCard from '../ui/NowPlayingCard';
import StageChips from '../ui/StageChips';
import PlaylistPanel, { type PlaylistPanelTarget } from '../ui/PlaylistPanel';
import Rail from '../ui/Rail';
import { useAudioStore } from '../audio/store';
import { useLibraryStore } from '../store/library';
import { useRuntimeStore } from '../store/runtime';
import { useAccountStore } from '../store/account';
import { useDominantColor, withAlpha } from '../hooks/useDominantColor';
import { useStageScale } from '../hooks/useStageScale';
import type { ProviderHomeContent, ProviderPlaylistSummary } from '../../shared/music/providers';
import type { TrackRecord } from '../../shared/ipc/music';

/* 底部固定预留：左下入口（曲库/记忆/情绪）区域高度，保证末行文字不压入口。 */
const HOME_BOTTOM_RESERVE = 94;

/* 卡面基准尺寸（900px 高窗口下的验收值）：渲染时乘以 useStageScale 的缩放系数。
   轨道内卡片为固定尺寸，右侧露出的半张卡就是「还有更多」的提示。 */




const TRACK_CARD_WIDTH = 186;
const TRACK_COVER_BASE = 48;

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
      <div className="font-mono mo-tabular tracking-[0.08em]" style={{ fontSize: 15, color: 'var(--mo-ink-faint)' }}>
        {time}
      </div>
      <div className="font-mono mo-tabular tracking-[0.12em] mt-1" style={{ fontSize: 10, color: 'var(--mo-ink-faint)', opacity: 0.7 }}>
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



/** 最近播放卡：封面 + 标题 + 艺术家（你自己的曲目）；正在播放时接管样式。 */
function TrackCard({
  coverUrl,
  title,
  artist,
  onOpen,
  waveRef,
  isCurrent = false,
  isPlaying = false,
}: {
  coverUrl: string | null;
  title: string;
  artist: string;
  onOpen: () => void;
  waveRef?: (el: HTMLSpanElement | null) => void;
  isCurrent?: boolean;
  isPlaying?: boolean;
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
      className="flex shrink-0 items-center text-left"
      style={{
        width: Math.round(TRACK_CARD_WIDTH * s),
        gap: Math.round(11 * s),
        padding: `${Math.round(7 * s)}px ${Math.round(9 * s)}px`,
        borderRadius: 12,
        border: `1px solid ${isCurrent ? withAlpha(accent, 0.42) : 'transparent'}`,
        background: isCurrent
          ? withAlpha(accent, 0.09)
          : hovered
            ? 'rgba(255,255,255,0.045)'
            : 'transparent',
        transition: 'background 260ms var(--mo-ease), border-color 260ms var(--mo-ease)',
        cursor: 'pointer',
      }}
    >
      <span style={{ position: 'relative', width: artSize, height: artSize, flexShrink: 0, perspective: 700 }}>
        <CoverGlow accent={accent} hovered={hovered || isCurrent} inset="-30%" blur={16} base={isCurrent ? 0.72 : 0.5} />
        <span
          ref={waveRef}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 12,
            background: coverUrl ? `url("${coverUrl}") center / cover no-repeat` : COVER_FALLBACK,
            border: `1px solid ${isCurrent ? withAlpha(accent, 0.55) : hovered ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.09)'}`,
            boxShadow: isCurrent
              ? `0 0 0 2px ${withAlpha(accent, 0.35)}, 0 10px 26px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.16)`
              : '0 10px 26px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)',
            willChange: 'transform',
          }}
        />
        {isCurrent ? (
          <span
            style={{
              position: 'absolute',
              left: 4,
              bottom: 4,
              padding: '2px 5px',
              borderRadius: 999,
              background: 'rgba(6,6,9,0.62)',
              border: '1px solid rgba(255,255,255,0.14)',
              ...({ '--mo-accent-strong': accent } as React.CSSProperties),
            }}
          >
            <span className="mo-bars" data-paused={isPlaying ? 'false' : 'true'}>
              <span />
              <span />
              <span />
            </span>
          </span>
        ) : null}
      </span>
      <span className="min-w-0" style={{ display: 'block' }}>
        <span
          style={{
            display: 'block',
            fontSize: Math.max(12.5, Math.round(13.5 * s)),
            color: isCurrent ? accent : CARD_TITLE_COLOR,
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
            fontSize: Math.max(11, Math.round(11.5 * s)),
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

/** 焦点大卡：编辑位，手动翻页（不自动播放、不跟随鼠标），底色取自当前封面主色。 */
function Spotlight({
  items,
  onOpen,
  openId,
}: {
  items: ProviderPlaylistSummary[];
  onOpen: (playlist: ProviderPlaylistSummary) => void;
  openId: string | null;
}) {
  const s = useStageScale();
  const [page, setPage] = useState(0);
  const [hovered, setHovered] = useState(false);
  const index = items.length > 0 ? Math.min(page, items.length - 1) : 0;
  const current = items[index] ?? null;
  const accent = useDominantColor(current?.coverUrl ?? null, '#f5f5f7');

  if (!current) {
    return null;
  }

  const art = Math.round(150 * s);
  const pagerStyle: React.CSSProperties = {
    width: Math.round(30 * s),
    height: Math.round(30 * s),
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.75)',
    cursor: 'pointer',
    transition: 'background 220ms var(--mo-ease)',
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(current)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          onOpen(current);
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative overflow-hidden text-left"
      style={{
        height: '100%',
        borderRadius: 22,
        border: `1px solid ${hovered ? withAlpha(accent, 0.34) : 'rgba(255,255,255,0.075)'}`,
        background: `linear-gradient(115deg, ${withAlpha(accent, hovered ? 0.2 : 0.13)}, rgba(8, 8, 11, 0.86) 58%)`,
        boxShadow: hovered
          ? `0 28px 70px rgba(0,0,0,0.6), 0 0 44px ${withAlpha(accent, 0.18)}`
          : '0 20px 60px rgba(0,0,0,0.45)',
        transition: 'border-color 320ms var(--mo-ease), box-shadow 320ms var(--mo-ease), background 320ms var(--mo-ease)',
        cursor: 'pointer',
      }}
    >
      <div
        className="flex h-full items-center"
        style={{ gap: Math.round(18 * s), padding: `${Math.round(16 * s)}px ${Math.round(22 * s)}px` }}
      >
        <div className="min-w-0 flex-1">
          <span
            className="font-mono"
            style={{ fontSize: Math.max(10.5, Math.round(11.5 * s)), letterSpacing: '0.16em', textTransform: 'uppercase', color: withAlpha(accent, 0.95) }}
          >
            此刻最热 · Top {index + 1}
          </span>
          <div
            style={{
              marginTop: Math.round(8 * s),
              fontSize: Math.max(19, Math.round(25 * s)),
              fontWeight: 300,
              letterSpacing: '-0.01em',
              color: CARD_TITLE_COLOR,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {current.title}
          </div>
          <div style={{ marginTop: Math.round(6 * s), fontSize: Math.max(11, Math.round(12 * s)), color: CARD_META_COLOR }}>
            {current.trackCount ? `${current.trackCount} 首歌曲` : '网易云榜单'}
          </div>
          <div className="flex items-center" style={{ gap: Math.round(9 * s), marginTop: Math.round(14 * s) }}>
            <button
              type="button"
              aria-label="上一张焦点"
              className="grid place-items-center rounded-full"
              style={pagerStyle}
              onClick={(event) => {
                event.stopPropagation();
                setPage((prev) => (prev - 1 + items.length) % items.length);
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="下一张焦点"
              className="grid place-items-center rounded-full"
              style={pagerStyle}
              onClick={(event) => {
                event.stopPropagation();
                setPage((prev) => (prev + 1) % items.length);
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="flex items-center" style={{ gap: 6, marginLeft: Math.round(6 * s) }}>
              {items.map((item, dotIndex) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`焦点第 ${dotIndex + 1} 张`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setPage(dotIndex);
                  }}
                  style={{
                    width: dotIndex === index ? Math.round(20 * s) : Math.round(6 * s),
                    height: 4,
                    borderRadius: 999,
                    border: 'none',
                    padding: 0,
                    background: dotIndex === index ? withAlpha(accent, 0.95) : 'rgba(255,255,255,0.22)',
                    transition: 'width 260ms var(--mo-ease), background 260ms var(--mo-ease)',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        <div style={{ position: 'relative', width: art, height: art, flexShrink: 0, perspective: 700 }}>
          <CoverGlow accent={accent} hovered={hovered} inset="-24%" blur={26} base={0.5} />
          <motion.span
            layoutId={openId === current.id ? undefined : `cover-${current.id}`}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 18,
              background: current.coverUrl ? `url("${current.coverUrl}") center / cover no-repeat` : COVER_FALLBACK,
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 22px 52px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.14)',
            }}
          />
          <span
            className="font-mono"
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              padding: '1px 7px',
              borderRadius: 999,
              fontSize: Math.max(10.5, Math.round(11.5 * s)),
              lineHeight: 1.5,
              color: 'rgba(255,255,255,0.94)',
              background: 'rgba(6,6,9,0.62)',
              border: '1px solid rgba(255,255,255,0.16)',
              opacity: 'calc(0.72 + var(--mo-beat, 0) * 0.5)',
            }}
          >
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>
      </div>
    </div>
  );
}

/** 编辑网格的小卡：一行式（封面 + 两行标题 + 元信息），与左侧大卡构成非对称布局。 */
function MosaicSmall({
  playlist,
  onOpen,
  openId,
}: {
  playlist: ProviderPlaylistSummary;
  onOpen: (playlist: ProviderPlaylistSummary) => void;
  openId: string | null;
}) {
  const s = useStageScale();
  const accent = useDominantColor(playlist.coverUrl, '#f5f5f7');
  const [hovered, setHovered] = useState(false);
  const art = Math.round(46 * s);
  return (
    <button
      type="button"
      onClick={() => onOpen(playlist)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex min-w-0 items-center text-left"
      style={{
        gridColumn: 'span 3',
        gap: Math.round(10 * s),
        padding: `${Math.round(8 * s)}px ${Math.round(10 * s)}px`,
        borderRadius: 14,
        border: `1px solid ${hovered ? withAlpha(accent, 0.3) : 'rgba(255,255,255,0.06)'}`,
        background: hovered ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.02)',
        transition: 'border-color 260ms var(--mo-ease), background 260ms var(--mo-ease)',
        cursor: 'pointer',
        overflow: 'hidden',
      }}
    >
      <motion.span
        aria-hidden
        layoutId={openId === playlist.id ? undefined : `cover-${playlist.id}`}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: art,
          height: art,
          flexShrink: 0,
          borderRadius: 10,
          background: playlist.coverUrl ? `url("${playlist.coverUrl}") center / cover no-repeat` : COVER_FALLBACK,
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14)',
          transform: hovered ? 'scale(1.06)' : 'scale(1)',
          transitionProperty: 'transform, border-color',
          transitionDuration: '420ms',
          transitionTimingFunction: 'var(--mo-ease)',
        }}
      />
      <span className="min-w-0" style={{ display: 'block' }}>
        <span
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            fontSize: Math.max(12, Math.round(13 * s)),
            lineHeight: 1.3,
            color: hovered ? accent : CARD_TITLE_COLOR,
            transition: 'color 240ms var(--mo-ease)',
          }}
        >
          {playlist.title}
        </span>
        <span style={{ display: 'block', marginTop: 3, fontSize: Math.max(11, Math.round(11.5 * s)), color: CARD_META_COLOR }}>
          {playlistMeta(playlist)}
        </span>
      </span>
    </button>
  );
}

/** 编辑网格：12 列里 1 张大卡（6×2）+ 4 张小卡（各 3×1），构成非对称编辑布局。 */
function MosaicGrid({
  items,
  onOpen,
  openId,
}: {
  items: ProviderPlaylistSummary[];
  onOpen: (playlist: ProviderPlaylistSummary) => void;
  openId: string | null;
}) {
  const s = useStageScale();
  const big = items[0];
  const smalls = items.slice(1, 5);
  const accent = useDominantColor(big?.coverUrl ?? null, '#f5f5f7');
  const [hovered, setHovered] = useState(false);

  if (!big) {
    return null;
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
        gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
        gap: Math.round(12 * s),
        padding: '0 40px',
        height: Math.round(134 * s),
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpen(big)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            onOpen(big);
          }
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative overflow-hidden"
        style={{
          gridColumn: 'span 6',
          gridRow: 'span 2',
          borderRadius: 18,
          border: `1px solid ${hovered ? withAlpha(accent, 0.36) : 'rgba(255,255,255,0.08)'}`,
          background: 'linear-gradient(140deg, rgba(18,20,26,0.7), rgba(8,8,11,0.85))',
          boxShadow: hovered ? `0 26px 64px rgba(0,0,0,0.6), 0 0 40px ${withAlpha(accent, 0.18)}` : '0 20px 54px rgba(0,0,0,0.5)',
          transition: 'border-color 300ms var(--mo-ease), box-shadow 300ms var(--mo-ease)',
          cursor: 'pointer',
          overflow: 'hidden',
        }}
      >
        {/* 封面层单独一层，hover 时缓慢放大（Ken Burns 式），文字层不受影响 */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: big.coverUrl ? `url("${big.coverUrl}") center / cover no-repeat` : COVER_FALLBACK,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
            transform: hovered ? 'scale(1.045)' : 'scale(1)',
            transition: 'transform 900ms var(--mo-ease)',
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.32) 46%, transparent)',
          }}
        />
        <div style={{ position: 'absolute', left: Math.round(16 * s), right: Math.round(16 * s), bottom: Math.round(14 * s) }}>
          <span
            className="font-mono"
            style={{
              fontSize: Math.max(10.5, Math.round(11.5 * s)),
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.92)',
              textShadow: '0 1px 14px rgba(0,0,0,0.85)',
            }}
          >
            编辑精选
          </span>
          <div
            style={{
              marginTop: Math.round(6 * s),
              fontSize: Math.max(14, Math.round(17 * s)),
              fontWeight: 500,
              lineHeight: 1.25,
              color: '#ffffff',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textShadow: '0 2px 18px rgba(0,0,0,0.65)',
            }}
          >
            {big.title}
          </div>
          <div style={{ marginTop: Math.round(4 * s), fontSize: Math.max(11, Math.round(11.5 * s)), color: 'rgba(255,255,255,0.66)' }}>
            {playlistMeta(big)}
          </div>
        </div>
      </div>
      {smalls.map((playlist) => (
        <MosaicSmall key={playlist.id} playlist={playlist} onOpen={onOpen} openId={openId} />
      ))}
    </div>
  );
}

/** 榜单行：名次 + 名称 + 曲目数（紧凑目录式，三列排布，避免又一次「封面墙」）。 */
function ChartRow({
  playlist,
  rank,
  onOpen,
}: {
  playlist: ProviderPlaylistSummary;
  rank: number;
  onOpen: () => void;
}) {
  const s = useStageScale();
  const accent = useDominantColor(playlist.coverUrl, '#f5f5f7');
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex min-w-0 items-center text-left"
      style={{
        gap: Math.round(10 * s),
        padding: `${Math.round(6 * s)}px ${Math.round(9 * s)}px`,
        borderRadius: 10,
        border: `1px solid ${hovered ? withAlpha(accent, 0.28) : 'transparent'}`,
        background: hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        transition: 'border-color 240ms var(--mo-ease), background 240ms var(--mo-ease)',
        cursor: 'pointer',
      }}
    >
      <span
        className="font-mono mo-tabular shrink-0"
        style={{
          width: Math.round(21 * s),
          fontSize: Math.max(11.5, Math.round(12.5 * s)),
          color: hovered ? withAlpha(accent, 1) : 'rgba(255,255,255,0.5)',
          opacity: 'calc(0.72 + var(--mo-beat, 0) * 0.5)',
          transition: 'color 240ms var(--mo-ease)',
        }}
      >
        {String(rank).padStart(2, '0')}
      </span>
      <span
        className="min-w-0"
        style={{
          display: 'block',
          flex: 1,
          fontSize: Math.max(12.5, Math.round(13.5 * s)),
          color: hovered ? accent : CARD_TITLE_COLOR,
          transition: 'color 240ms var(--mo-ease)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {playlist.title}
      </span>
      <span
        className="shrink-0 font-mono"
        style={{ fontSize: Math.max(10.5, Math.round(11 * s)), color: CARD_META_COLOR }}
      >
        {playlist.trackCount ? `${playlist.trackCount} 首` : ''}
      </span>
    </button>
  );
}

/** 区块标题：左侧标题 + 计数，右侧说明右对齐（排版更收束）。 */
function SectionHead({ title, count, hint }: { title: string; count: number; hint?: string }) {
  const s = useStageScale();
  return (
    <div
      className="flex items-baseline"
      style={{ padding: '0 40px', marginBottom: Math.round(14 * s), justifyContent: 'space-between', gap: Math.round(12 * s) }}
    >
      <span className="flex items-baseline" style={{ gap: Math.round(10 * s), minWidth: 0 }}>
        <h2 style={{ fontSize: Math.max(12.5, Math.round(14.5 * s)), fontWeight: 500, color: 'var(--mo-ink)', letterSpacing: '0.02em' }}>{title}</h2>
        <span className="font-mono mo-tabular" style={{ fontSize: Math.max(10, Math.round(10.5 * s)), color: 'var(--mo-ink-faint)' }}>
          {count}
        </span>
      </span>
      {hint ? (
        <span
          className="shrink-0"
          style={{
            fontSize: Math.max(10.5, Math.round(11.5 * s)),
            color: 'var(--mo-ink-faint)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {hint}
        </span>
      ) : null}
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
  const currentTrackId = useAudioStore((s) => s.track?.id ?? null);
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const currentArtworkUrl = useAudioStore((s) => s.track?.artworkUrl ?? null);
  const greetingAccent = useDominantColor(currentArtworkUrl, '#f5f5f7');

  const stageScale = useStageScale();
  const stageRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLElement | null>());

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
      transform: entranceReady ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.97)',
      transition: `opacity 560ms var(--mo-ease) ${delay}ms, transform 560ms var(--mo-ease) ${delay}ms`,
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

  /* 登录后重新拉一次内容（解锁个性化推荐） */
  const accountLoggedIn = useAccountStore((s) => s.loggedIn);
  useEffect(() => {
    if (accountLoggedIn) {
      void loadContent();
    }
  }, [accountLoggedIn, loadContent]);

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

  /* 律动推进：只由音频指标驱动（无鼠标跟随、无持续位移） */
  useEffect(() => {
    let raf = 0;
    let lastBeat = -1;
    const started = performance.now();

    const tick = (now: number) => {
      const stage = stageRef.current;
      const metrics = useAudioStore.getState().metrics;
      const isPlaying = useAudioStore.getState().isPlaying;
      const t = (now - started) / 1000;

      if (stage) {
        // 节拍接管：每帧只写一次 CSS 变量（写到根元素，播放条等其它表面也能用），
        // 封面光晕 / 名次徽章 / 底部播放条由 CSS 读取，避免逐元素写 style
        const beat = isPlaying ? metrics.beatPulse : 0;
        if (Math.abs(beat - lastBeat) > 0.008) {
          lastBeat = beat;
          document.documentElement.style.setProperty('--mo-beat', beat.toFixed(3));
        }
      }

      const amp = 9 + metrics.bass * 70 + metrics.beatPulse * 34;
      const speed = 0.5 + metrics.energy * 1.2;

      for (const [key, el] of itemRefs.current) {
        if (!el) continue;
        const [band, colText] = key.split('-');
        const col = Number(colText) || 0;
        const bandPhase = band === 'playlist' ? 0.6 : band === 'chart' ? 2.1 : 3.4;
        const wave = Math.sin(col * 0.72 + t * speed + bandPhase);
        const ripple = Math.sin(col * 0.5 - t * 3.4) * metrics.beatPulse;
        const z = wave * amp + ripple * 26;
        const bob = Math.cos(col * 0.5 + t * speed * 0.8 + bandPhase) * (isPlaying ? 4 : 1.2);
        const depthScale = 1 + z / 1600;
        const ry = Math.sin(col * 0.4 + t * 0.25) * 2;
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

  /** 波场只驱动卡面封面（文字保持稳定），key 必须保持 `band-index` 形式供 rAF 取相位。 */
  const waveRefFor = (band: string, index: number) => (el: HTMLElement | null) => {
    const key = `${band}-${index}`;
    if (el) {
      itemRefs.current.set(key, el);
    } else {
      itemRefs.current.delete(key);
    }
  };

  return (
    <div className="absolute inset-0 z-10">
      <div className="absolute inset-0 mo-no-scrollbar overflow-y-auto overflow-x-hidden">
        <div style={{ padding: `${Math.round(Math.max(52, 48 * stageScale))}px 0 ${HOME_BOTTOM_RESERVE}px` }}>
          {/* 问候语 */}
          <div style={{ ...sectionReveal(0), padding: '0 40px', marginBottom: Math.round(8 * stageScale) }}>
            <h1 style={{ fontSize: Math.max(19, Math.round(30 * stageScale)), fontWeight: 300, letterSpacing: '-0.02em', color: 'var(--mo-ink)' }}>
              {greeting}
            </h1>
            <p className="mt-1.5" style={{ fontSize: Math.max(12.5, Math.round(13.5 * stageScale)), color: 'var(--mo-ink-faint)' }}>
              {greetingSub}
            </p>
            {/* 问候语强调线：入场后从左展开，颜色取当前封面主色 */}
            <span
              aria-hidden
              style={{
                display: 'block',
                width: Math.round(30 * stageScale),
                height: 2,
                marginTop: Math.round(10 * stageScale),
                borderRadius: 999,
                background: withAlpha(greetingAccent, 0.85),
                transform: entranceReady ? 'scaleX(1)' : 'scaleX(0)',
                transformOrigin: 'left center',
                transition: 'transform 640ms var(--mo-ease) 260ms',
              }}
            />
          </div>

          {/* Split 主视觉：左侧继续听 / 正在播放，右侧榜单前三快捷直达 */}
          <div
            style={{
              ...sectionReveal(80),
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.6fr)',
              gap: Math.round(20 * stageScale),
              padding: '0 40px',
              marginBottom: Math.round(18 * stageScale),
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.07)',
                background: 'linear-gradient(140deg, rgba(20,22,28,0.55), rgba(9,9,12,0.68))',
                padding: `${Math.round(16 * stageScale)}px ${Math.round(22 * stageScale)}px`,
                minHeight: Math.round(130 * stageScale),
              }}
            >
              <NowPlayingCard onDetail={onDetail} />
            </div>

            {isLoading && toplists.length === 0 ? (
              <SkeletonBlock width="100%" height={Math.round(150 * stageScale)} radius={22} />
            ) : (
              <Spotlight items={toplists.slice(0, 3)} onOpen={openPlaylist} openId={panelTarget?.id ?? null} />
            )}
          </div>

          {/* 内容轨道：3D 只作用在封面层（各自 perspective），文字层保持 2D 以保证清晰 */}
          <div>
            <div ref={stageRef}>
              {/* 编辑精选：非对称马赛克（1 大 + 4 小） */}
              <div style={{ ...sectionReveal(160), marginBottom: Math.round(20 * stageScale) }}>
                <SectionHead title="编辑精选" count={playlists.length} hint="网易云编辑精选" />
                {isLoading && playlists.length === 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: Math.round(12 * stageScale), padding: '0 40px' }}>
                    <div style={{ gridColumn: 'span 12' }}>
                      <SkeletonBlock width="100%" height={Math.round(150 * stageScale)} radius={18} />
                    </div>
                  </div>
                ) : (
                  <MosaicGrid items={playlists.slice(0, 5)} onOpen={openPlaylist} openId={panelTarget?.id ?? null} />
                )}
              </div>

              {/* 排行榜：紧凑目录（名次 + 名称 + 曲目数，三列），避免与上方马赛克重复成封面墙 */}
              {isLoading || toplists.length > 0 ? (
                <div style={{ ...sectionReveal(240), marginBottom: Math.round(20 * stageScale) }}>
                  <SectionHead title="排行榜" count={toplists.length} hint="此刻最热" />
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: `${Math.round(4 * stageScale)}px ${Math.round(16 * stageScale)}px`,
                      padding: '0 40px',
                    }}
                  >
                    {isLoading && toplists.length === 0
                      ? Array.from({ length: 6 }, (_, index) => (
                          <SkeletonBlock
                            key={`skeleton-chart-${index}`}
                            width="100%"
                            height={Math.round(32 * stageScale)}
                            radius={10}
                          />
                        ))
                      : toplists.map((playlist, index) => (
                          <div key={playlist.id} style={coverReveal(260 + index * 24)}>
                            <ChartRow
                              playlist={playlist}
                              rank={index + 1}
                              onOpen={() => openPlaylist(playlist)}
                            />
                          </div>
                        ))}
                  </div>
                </div>
              ) : null}

              {/* 最近播放（你自己的曲目） */}
              {recentTracks.length > 0 ? (
                <div style={sectionReveal(330)}>
                  <SectionHead title="最近播放" count={recentTracks.length} hint="横向滚动 · 继续听" />
                  <Rail gap={Math.round(12 * stageScale)}>
                    {recentTracks.map((track, index) => (
                      <div key={track.id} style={coverReveal(360 + index * 24)}>
                        <TrackCard
                          coverUrl={track.artworkUrl}
                          title={track.title}
                          artist={track.artist}
                          onOpen={() => void useAudioStore.getState().playTrack(track)}
                          waveRef={waveRefFor('recent', index)}
                          isCurrent={currentTrackId === track.id}
                          isPlaying={isPlaying}
                        />
                      </div>
                    ))}
                  </Rail>
                </div>
              ) : !isLoading && !loadError ? (
                <div style={{ ...sectionReveal(330), padding: '0 40px' }}>
                  <SectionHead title="最近播放" count={0} hint="继续听" />
                  <div style={{ fontSize: 12, color: 'var(--mo-ink-faint)', padding: '2px 0 0' }}>
                    播放几首歌后，这里会出现你的最近播放。
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* 载入 / 错误 */}
          {isLoading || loadError ? (
            <div className="flex flex-col items-center" style={{ padding: '24px 40px 0' }}>
              {isLoading ? (
                <div className="flex items-center gap-2" style={{ color: 'var(--mo-ink-faint)' }}>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span style={{ fontSize: 12 }}>正在连接网易云…</span>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center text-center"
                  style={{
                    maxWidth: 420,
                    gap: 10,
                    padding: '22px 26px',
                    borderRadius: 18,
                    background: 'var(--mo-bg-elevated-strong)',
                    border: '1px solid var(--mo-line)',
                    boxShadow: 'var(--mo-shadow-glass), inset 0 1px 0 rgba(255,255,255,0.06)',
                  }}
                >
                  <CloudOff className="h-5 w-5" style={{ color: 'var(--mo-ink-muted)' }} />
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--mo-ink)' }}>内容暂时不可用</div>
                  <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--mo-ink-faint)' }}>{loadError}</div>
                  <div className="flex items-center" style={{ gap: 10, marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => void loadContent()}
                      className="flex items-center gap-2 rounded-full"
                      style={{
                        padding: '8px 16px',
                        fontSize: 12,
                        color: 'var(--mo-accent-contrast)',
                        background: 'var(--mo-accent)',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      重试
                    </button>
                    <button
                      type="button"
                      onClick={() => useRuntimeStore.getState().requestSpace('library')}
                      className="rounded-full"
                      style={{
                        padding: '8px 16px',
                        fontSize: 12,
                        color: 'var(--mo-ink-soft)',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--mo-line)',
                        cursor: 'pointer',
                      }}
                    >
                      打开本地曲库
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <StageChips />
      <Clock />
      {/* 面板挂到 body：WaveHome 的 z-10 容器会建立层叠上下文，直接内联会被顶部栏盖住 */}
      {createPortal(
        <PlaylistPanel target={panelTarget} onClose={() => setPanelTarget(null)} />,
        document.body,
      )}
    </div>
  );
}
