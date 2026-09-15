'use client';

import { motion } from 'motion/react';
import { Play, Pause } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { useAudioStore } from '../audio/store';
import { useLibraryStore } from '../store/library';
import { useDominantColor, withAlpha, contrastText, energyTargetFallback } from '../hooks/useDominantColor';
import VinylDisc from './VinylDisc';
import type { TrackRecord } from '../../shared/ipc/music';

/**
 * 舞台英雄：黑胶唱盘 + 封面（唱片套）+ 标题。
 * 空态时是舞台中央一只静置唱盘 + 「把音乐带进来」；有歌时封面压在唱盘上、播放时旋转。
 */
export default function StageHero({ onDetail }: { onDetail?: () => void }) {
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

  const handleHeroClick = async () => {
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

  const size = 300;
  const coverSize = size * 0.86;
  const discSize = heroArtwork ? size * 0.96 : size * 0.9;
  const isEmpty = !heroTrack;

  const statusLabel = isCurrent
    ? canPlay
      ? isPlaying
        ? '正在播放'
        : '已就绪 — 点击开始'
      : '已恢复会话 · 点击重新载入'
    : lastHistoryTrack
      ? '继续听'
      : '';

  return (
    <div className="flex flex-col items-center">
      <div
        className="group relative cursor-pointer"
        style={{ width: size, height: size }}
        onClick={() => void handleHeroClick()}
      >
        {/* 光晕：唯一的「光源」 */}
        <motion.div
          aria-hidden
          className="pointer-events-none"
          style={{
            position: 'absolute',
            inset: '-24%',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${withAlpha(accent, isPlaying ? 0.36 : 0.18)}, transparent 66%)`,
            filter: 'blur(62px)',
          }}
          animate={isPlaying ? { opacity: [0.6, 0.95, 0.6], scale: [1, 1.04, 1] } : { opacity: 1, scale: 1 }}
          transition={{ duration: 3.4, repeat: isPlaying ? Infinity : 0, ease: 'easeInOut' }}
        />

        <VinylDisc
          size={discSize}
          spinning={isPlaying && Boolean(heroTrack)}
          style={
            heroArtwork
              ? { right: 0, top: (size - discSize) / 2 }
              : { left: '50%', top: '50%', marginLeft: -discSize / 2, marginTop: -discSize / 2 }
          }
        />

        {heroArtwork ? (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: (size - coverSize) / 2,
              width: coverSize,
              height: coverSize,
              borderRadius: 14,
              background: `url(${heroArtwork}) center / cover no-repeat`,
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 26px 70px rgba(0,0,0,0.6)',
            }}
          />
        ) : null}

        <button
          type="button"
          aria-label={isPlaying ? '暂停' : '播放'}
          onClick={(e) => {
            e.stopPropagation();
            void handleHeroClick();
          }}
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 grid place-items-center rounded-full transition-opacity duration-300 ${
            isEmpty ? 'opacity-45 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          style={{
            width: 64,
            height: 64,
            background: withAlpha(accent, 0.92),
            color: contrastText(accent),
            boxShadow: `0 0 44px ${withAlpha(accent, 0.5)}`,
          }}
        >
          {isPlaying && canPlay ? (
            <Pause className="w-6 h-6" fill="currentColor" strokeWidth={0} />
          ) : (
            <Play className="w-6 h-6 ml-1" fill="currentColor" strokeWidth={0} />
          )}
        </button>
      </div>

      <div className="mt-9 flex flex-col items-center text-center">
        <h1
          onClick={() => {
            if (track && onDetail) onDetail();
          }}
          style={{
            fontSize: isEmpty ? 36 : 42,
            fontWeight: 300,
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            color: 'var(--mo-ink)',
            maxWidth: 'min(560px, 84vw)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            cursor: track && onDetail ? 'pointer' : 'default',
            textShadow: '0 2px 24px rgba(0,0,0,0.5)',
          }}
        >
          {isEmpty ? '把音乐带进来' : heroTrack?.title}
        </h1>

        <div
          className="mt-3"
          style={{
            fontSize: 14,
            color: 'var(--mo-ink-muted)',
            maxWidth: 'min(520px, 84vw)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {isEmpty
            ? '拖入音频文件，或从本地选择'
            : `${heroTrack?.artist ?? ''}${heroTrack?.album ? ` · ${heroTrack.album}` : ''}`}
        </div>

        {isEmpty ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-7 rounded-full px-6 py-2.5 transition-colors duration-300"
            style={{
              fontSize: 13,
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
              e.currentTarget.style.boxShadow = `0 0 24px ${withAlpha(accent, 0.25)}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--mo-line)';
              e.currentTarget.style.boxShadow = 'var(--mo-shadow-hairline)';
            }}
          >
            选择本地文件
          </button>
        ) : (
          <div className="mt-4 flex items-center gap-2">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{
                background: accent,
                boxShadow: `0 0 10px ${withAlpha(accent, 0.8)}`,
                animation: isPlaying ? 'mo-cover-breathe 2.4s ease-in-out infinite' : 'none',
              }}
            />
            <span
              className="font-mono tracking-[0.14em] uppercase"
              style={{ fontSize: 10, color: 'var(--mo-ink-faint)' }}
            >
              {statusLabel}
            </span>
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