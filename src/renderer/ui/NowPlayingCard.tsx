'use client';

import { motion } from 'motion/react';
import { Play, Pause } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { useAudioStore } from '../audio/store';
import { useLibraryStore } from '../store/library';
import { useDominantColor, withAlpha, contrastText, energyTargetFallback } from '../hooks/useDominantColor';
import { useStageScale } from '../hooks/useStageScale';
import VinylDisc from './VinylDisc';
import type { TrackRecord } from '../../shared/ipc/music';

/**
 * 现在播放卡（紧凑横向）：唱盘 + 封面 + 文案 + 播放键。
 * 空态是"把音乐带进来"与本地选择；有歌时封面压在唱盘上、播放时旋转。
 */
export default function NowPlayingCard({ onDetail }: { onDetail?: () => void }) {
  const track = useAudioStore((s) => s.track);
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const canPlay = useAudioStore((s) => s.canPlay);
  const play = useAudioStore((s) => s.play);
  const pause = useAudioStore((s) => s.pause);
  const playTrack = useAudioStore((s) => s.playTrack);
  const loadFile = useAudioStore((s) => s.loadFile);
  const tracks = useLibraryStore((s) => s.tracks);
  const history = useLibraryStore((s) => s.history);

  const inputRef = useRef<HTMLInputElement>(null);

  const lastHistoryTrack = useMemo<TrackRecord | null>(() => {
    if (history.length === 0) return null;
    const latest = [...history].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    )[0];
    return tracks.find((t) => t.id === latest.trackId) ?? null;
  }, [history, tracks]);

  const heroTrack = track ?? lastHistoryTrack;
  const heroArtwork = heroTrack?.artworkUrl ?? null;
  const isCurrent = Boolean(track);
  const accent = useDominantColor(heroArtwork, energyTargetFallback(track?.worldContext ?? null));

  const handleClick = async () => {
    if (track && canPlay) {
      if (isPlaying) pause();
      else void play();
      return;
    }
    if (track && !canPlay) {
      const restored = await playTrack(track);
      if (!restored) inputRef.current?.click();
      return;
    }
    if (lastHistoryTrack) {
      const restored = await playTrack(lastHistoryTrack);
      if (!restored) inputRef.current?.click();
      return;
    }
    inputRef.current?.click();
  };

  // 唱盘随首页纵向节奏一起收缩（useStageScale），矮窗口下三带仍能一屏放下
  const stageScale = useStageScale();
  const discSize = Math.round(138 * stageScale);
  const coverSize = Math.round(124 * stageScale);
  const playSize = Math.round(46 * stageScale);
  const isEmpty = !heroTrack;

  const statusLabel = isCurrent
    ? canPlay
      ? isPlaying
        ? '播放中'
        : '已就绪'
      : '仅元数据 · 点击重新载入'
    : lastHistoryTrack
      ? '继续听'
      : '';

  return (
    <div className="flex items-center gap-7">
      {/* 唱盘 + 封面 */}
      <div
        className="group relative shrink-0 cursor-pointer"
        style={{ width: discSize, height: discSize }}
        onClick={() => void handleClick()}
      >
        <motion.div
          aria-hidden
          className="pointer-events-none"
          style={{
            position: 'absolute',
            inset: '-30%',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${withAlpha(accent, isPlaying ? 0.46 : 0.26)}, transparent 66%)`,
            filter: 'blur(52px)',
          }}
          animate={isPlaying ? { opacity: [0.6, 0.95, 0.6] } : { opacity: 1 }}
          transition={{ duration: 3.4, repeat: isPlaying ? Infinity : 0, ease: 'easeInOut' }}
        />
        <VinylDisc
          size={discSize}
          spinning={isPlaying && Boolean(heroTrack)}
          style={
            heroArtwork
              ? { right: 0, top: 0 }
              : { left: '50%', top: '50%', marginLeft: -discSize / 2, marginTop: -discSize / 2 }
          }
        />
        {heroArtwork ? (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: (discSize - coverSize) / 2,
              width: coverSize,
              height: coverSize,
              borderRadius: 10,
              background: `url("${heroArtwork}") center / cover no-repeat`,
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 18px 48px rgba(0,0,0,0.6)',
            }}
          />
        ) : null}
        <button
          type="button"
          aria-label={isPlaying ? '暂停' : '播放'}
          onClick={(e) => {
            e.stopPropagation();
            void handleClick();
          }}
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 grid place-items-center rounded-full transition-opacity duration-300 ${
            isEmpty ? 'opacity-50 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          style={{
            width: playSize,
            height: playSize,
            background: withAlpha(accent, 0.92),
            color: contrastText(accent),
            boxShadow: `0 0 32px ${withAlpha(accent, 0.5)}`,
          }}
        >
          {isPlaying && canPlay ? (
            <Pause className="w-4.5 h-4.5" fill="currentColor" strokeWidth={0} />
          ) : (
            <Play className="w-4.5 h-4.5 ml-0.5" fill="currentColor" strokeWidth={0} />
          )}
        </button>
      </div>

      {/* 文案 */}
      <div className="flex min-w-0 flex-col">
        <div
          className="font-mono tracking-[0.18em] uppercase"
          style={{ fontSize: 10, color: isEmpty ? 'var(--mo-ink-faint)' : 'var(--mo-ink-muted)' }}
        >
          {isEmpty ? '现在播放' : statusLabel}
        </div>
        <div
          onClick={() => {
            if (track && onDetail) onDetail();
          }}
          className="mt-2 truncate"
          style={{
            fontSize: isEmpty ? 26 : 30,
            fontWeight: 300,
            letterSpacing: '-0.02em',
            color: 'var(--mo-ink)',
            maxWidth: 'min(520px, 46vw)',
            cursor: track && onDetail ? 'pointer' : 'default',
            textShadow: '0 2px 24px rgba(0,0,0,0.5)',
          }}
        >
          {isEmpty ? '把音乐带进来' : heroTrack?.title}
        </div>
        <div className="mt-2 truncate" style={{ fontSize: 13, color: 'var(--mo-ink-muted)', maxWidth: 'min(520px, 46vw)' }}>
          {isEmpty
            ? '拖入音频文件，或从本地选择'
            : `${heroTrack?.artist ?? ''}${heroTrack?.album ? ` · ${heroTrack.album}` : ''}`}
        </div>

        {isEmpty ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-5 self-start rounded-full px-5 py-2 transition-colors duration-300"
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--mo-ink)',
              background: 'var(--mo-bg-elevated)',
              border: '1px solid var(--mo-line)',
              backdropFilter: 'blur(22px) saturate(1.15)',
              WebkitBackdropFilter: 'blur(22px) saturate(1.15)',
              boxShadow: 'var(--mo-shadow-hairline)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = withAlpha(accent, 0.5);
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--mo-line)';
            }}
          >
            选择本地文件
          </button>
        ) : (
          <div className="mt-3 flex items-center gap-2">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{
                background: accent,
                boxShadow: `0 0 10px ${withAlpha(accent, 0.8)}`,
                animation: isPlaying ? 'mo-cover-breathe 2.4s ease-in-out infinite' : 'none',
              }}
            />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) await loadFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}