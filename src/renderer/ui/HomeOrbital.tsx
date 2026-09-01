'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Library, History, Smile, Music } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAudioStore } from '../audio/store';
import { useRuntimeStore } from '../store/runtime';
import { useLibraryStore } from '../store/library';
import { useMoodStore } from '../store/mood';
import { useDominantColor, withAlpha, energyTargetFallback } from '../hooks/useDominantColor';
import type { TrackRecord } from '../../shared/ipc/music';
import type { ProviderTrackReference } from '../../shared/music/providers';

const MOOD_OPTIONS: Array<{ id: string | null; label: string }> = [
  { id: null, label: '无' },
  { id: 'Night', label: '夜晚' },
  { id: 'Energy', label: '能量' },
  { id: 'Calm', label: '平静' },
  { id: 'Nostalgia', label: '怀旧' },
];

/* ——— 唱片兜底（中性暗色，无封面时） ——— */
const VINYL_GRADIENT =
  'conic-gradient(from 210deg at 50% 50%, #2a2a2e, transparent 32%, #0a0a0c 56%, #3a3a3e 80%, #2a2a2e)';

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const date = `${now.getMonth() + 1}月${now.getDate()}日`;
  return (
    <div className="absolute bottom-10 right-10 text-right pointer-events-none select-none z-10">
      <div
        className="font-mono tracking-[0.08em]"
        style={{ fontSize: 15, color: 'var(--mo-ink-faint)' }}
      >
        {time}
      </div>
      <div
        className="font-mono tracking-[0.12em] mt-1"
        style={{ fontSize: 10, color: 'var(--mo-ink-faint)', opacity: 0.7 }}
      >
        {date}
      </div>
    </div>
  );
}

/* ——— 底部左侧：发光小物体（曲库/记忆/情绪） ——— */
function StageOrb({
  icon: Icon,
  label,
  active,
  activeColor,
  onClick,
}: {
  icon: typeof Library;
  label: string;
  active?: boolean;
  activeColor?: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="relative flex flex-col items-center" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <AnimatePresence>
        {hovered && (
          <motion.div
            className="absolute -top-9 whitespace-nowrap pointer-events-none"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18 }}
            style={{
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--mo-ink-muted)',
            }}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        type="button"
        aria-label={label}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        onClick={onClick}
        className="pointer-events-auto grid place-items-center rounded-full"
        style={{
          width: 42,
          height: 42,
          background: active ? withAlpha(activeColor ?? '#f5f5f7', 0.16) : 'var(--mo-bg-elevated)',
          border: `1px solid ${active ? withAlpha(activeColor ?? '#f5f5f7', 0.35) : 'var(--mo-line)'}`,
          backdropFilter: 'blur(22px) saturate(1.15)',
          WebkitBackdropFilter: 'blur(22px) saturate(1.15)',
          boxShadow: active ? `0 0 24px ${withAlpha(activeColor ?? '#f5f5f7', 0.3)}` : 'none',
          color: active ? (activeColor ?? '#f5f5f7') : 'var(--mo-ink-muted)',
          transition: 'color 300ms var(--mo-ease), box-shadow 300ms var(--mo-ease)',
        }}
      >
        <Icon className="w-4 h-4" strokeWidth={1.5} />
      </motion.button>
    </div>
  );
}

export default function HomeOrbital({ onDetail }: { onDetail?: () => void }) {
  const track = useAudioStore((s) => s.track);
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const canPlay = useAudioStore((s) => s.canPlay);
  const play = useAudioStore((s) => s.play);
  const pause = useAudioStore((s) => s.pause);
  const loadFile = useAudioStore((s) => s.loadFile);
  const requestSpace = useRuntimeStore((s) => s.requestSpace);
  const tracks = useLibraryStore((s) => s.tracks);
  const history = useLibraryStore((s) => s.history);
  const activeMood = useMoodStore((s) => s.activeMood);
  const persistMood = useMoodStore((s) => s.persist);

  const inputRef = useRef<HTMLInputElement>(null);
  const [isMoodMenuOpen, setIsMoodMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  /* ——— 英雄对象数据：当前曲目，否则「继续听」（最近播放） ——— */
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

  /* ——— 动态强调色：封面主色（未播放/无封面 → 白） ——— */
  const accent = useDominantColor(heroArtwork, energyTargetFallback(track?.worldContext ?? null));

  const handleHeroClick = async () => {
    if (track && canPlay) {
      if (isPlaying) pause();
      else void play();
      return;
    }
    if (track && !canPlay) {
      inputRef.current?.click();
      return;
    }
    if (lastHistoryTrack && lastHistoryTrack.providerId !== 'local-file' && lastHistoryTrack.providerTrackId) {
      await useAudioStore.getState().loadProviderTrack({
        providerId: lastHistoryTrack.providerId as ProviderTrackReference['providerId'],
        platformTrackId: lastHistoryTrack.providerTrackId,
      });
      return;
    }
    inputRef.current?.click();
  };

  const handleTextClick = () => {
    if (heroTrack && onDetail) onDetail();
  };

  const microLabel = track
    ? canPlay
      ? isPlaying
        ? '正在播放'
        : '已就绪'
      : '已恢复会话 · 请重载'
    : lastHistoryTrack
      ? '继续听'
      : '载入歌曲';

  const heroTitle = heroTrack?.title ?? '载入一首歌';
  const heroSub = heroTrack ? `${heroTrack.artist}${heroTrack.album ? ` · ${heroTrack.album}` : ''}` : '从本地选择音频文件，或稍后接入音乐平台';
  const coverSize = isMobile ? 200 : 284;

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-10"
      style={{
        ['--mo-accent' as string]: accent,
        ['--mo-accent-strong' as string]: accent,
        ['--mo-accent-ghost' as string]: withAlpha(accent, 0.14),
        ['--mo-home-accent' as string]: accent,
      }}
    >
      {/* ——— 英雄：封面发光物 + 显示级排版 ——— */}
      <motion.div
        initial={{ opacity: 0, scale: 0.985, filter: 'blur(6px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-20 flex items-center gap-8 md:gap-12 pointer-events-auto"
        style={{ transform: 'translateX(-4%)' }}
      >
        <motion.div
          className="relative cursor-pointer group"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => void handleHeroClick()}
          style={{ width: coverSize, height: coverSize, flexShrink: 0 }}
        >
          {/* 封面光晕 —— 唯一的「光源」 */}
          <motion.div
            aria-hidden
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: '-30%',
              background: `radial-gradient(circle, ${withAlpha(accent, isPlaying ? 0.4 : 0.22)}, transparent 65%)`,
              filter: 'blur(70px)',
            }}
            animate={isPlaying ? { opacity: [0.6, 0.95, 0.6], scale: [1, 1.05, 1] } : { opacity: 1, scale: 1 }}
            transition={{ duration: 3.5, repeat: isPlaying ? Infinity : 0, ease: 'easeInOut' }}
          />
          {/* 封面 */}
          <div
            className="absolute inset-0 rounded-[14px] border border-white/10"
            style={{
              background: heroArtwork ? `url(${heroArtwork}) center / cover no-repeat` : VINYL_GRADIENT,
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            }}
          />
          {/* hover 播放态浮层 */}
          <div className="absolute inset-0 rounded-[14px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/25 flex items-center justify-center">
            <div
              className="grid place-items-center rounded-full"
              style={{
                width: 64,
                height: 64,
                background: withAlpha(accent, 0.9),
                color: relativeDarkText(accent),
                boxShadow: `0 0 40px ${withAlpha(accent, 0.5)}`,
              }}
            >
              {track && canPlay && isPlaying ? (
                <Pause className="w-6 h-6" fill="currentColor" strokeWidth={0} />
              ) : (
                <Play className="w-6 h-6 ml-1" fill="currentColor" strokeWidth={0} />
              )}
            </div>
          </div>
          {/* 小音符标记（无封面时） */}
          {!heroArtwork && (
            <div className="absolute -top-3 -right-3 grid place-items-center rounded-full w-9 h-9" style={{ background: 'var(--mo-bg-elevated-strong)', border: '1px solid var(--mo-line)', color: 'var(--mo-ink-muted)' }}>
              <Music className="w-4 h-4" strokeWidth={1.5} />
            </div>
          )}
        </motion.div>

        {/* 文字块 */}
        <div className="flex flex-col min-w-0" onClick={handleTextClick}>
          <div
            className="mb-4 font-mono tracking-[0.18em] uppercase"
            style={{ fontSize: 10, color: 'var(--mo-ink-muted)' }}
          >
            {microLabel}
          </div>
          <motion.h1
            className="whitespace-nowrap"
            style={{
              fontSize: isMobile ? 26 : 34,
              fontWeight: 300,
              letterSpacing: '-0.02em',
              lineHeight: 1.12,
              color: 'var(--mo-ink)',
              cursor: heroTrack && onDetail ? 'pointer' : 'default',
              textShadow: '0 2px 24px rgba(0,0,0,0.5)',
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12 }}
          >
            {heroTitle.length > 22 ? `${heroTitle.slice(0, 22)}…` : heroTitle}
          </motion.h1>
          <div
            className="mt-3 truncate"
            style={{ fontSize: 14, color: 'var(--mo-ink-muted)' }}
          >
            {heroSub}
          </div>
          {track && canPlay && (
            <div className="mt-5 flex items-center gap-2">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{
                  background: accent,
                  boxShadow: `0 0 10px ${withAlpha(accent, 0.8)}`,
                  animation: isPlaying ? 'mo-cover-breathe 2.4s ease-in-out infinite' : 'none',
                }}
              />
              <span className="font-mono tracking-[0.14em] uppercase" style={{ fontSize: 10, color: 'var(--mo-ink-faint)' }}>
                {isPlaying ? 'playing' : 'paused'}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* ——— 底部左侧：曲库 / 记忆 / 情绪滤镜 ——— */}
      <div className="absolute bottom-9 left-9 md:left-10 flex items-center gap-4 z-20">
        <StageOrb icon={Library} label="曲库" onClick={() => requestSpace('library')} />
        <StageOrb icon={History} label="记忆" onClick={() => requestSpace('memory')} />
        <div className="relative">
          <StageOrb
            icon={Smile}
            label={activeMood ? `情绪 · ${MOOD_OPTIONS.find((m) => m.id === activeMood)?.label ?? activeMood}` : '情绪'}
            active={Boolean(activeMood)}
            activeColor="#e8c28a"
            onClick={() => setIsMoodMenuOpen((v) => !v)}
          />
          <AnimatePresence>
            {isMoodMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                transition={{ duration: 0.18 }}
                className="absolute bottom-12 left-0 pointer-events-auto rounded-[14px] p-2"
                style={{
                  background: 'var(--mo-bg-elevated-strong)',
                  border: '1px solid var(--mo-line)',
                  backdropFilter: 'blur(22px) saturate(1.15)',
                  WebkitBackdropFilter: 'blur(22px) saturate(1.15)',
                  boxShadow: 'var(--mo-shadow-glass), inset 0 1px 0 rgba(255,255,255,0.06)',
                }}
              >
                {MOOD_OPTIONS.map((m) => {
                  const isActive = activeMood === m.id;
                  return (
                    <button
                      key={m.id ?? 'none'}
                      type="button"
                      onClick={() => {
                        void persistMood(m.id);
                        setIsMoodMenuOpen(false);
                      }}
                      className="flex items-center gap-2.5 w-full px-3 py-1.5 rounded-[10px] transition-colors"
                      style={{
                        color: isActive ? '#e8c28a' : 'var(--mo-ink-soft)',
                        background: isActive ? 'rgba(232,194,138,0.1)' : 'transparent',
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: isActive ? '#e8c28a' : 'var(--mo-ink-faint)',
                          boxShadow: isActive ? '0 0 8px rgba(232,194,138,0.8)' : 'none',
                        }}
                      />
                      <span style={{ fontSize: 12 }}>{m.label}</span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Clock />

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

function relativeDarkText(hex: string): string {
  const value = hex.replace('#', '');
  if (value.length !== 6) return '#0a0a0c';
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 150 ? '#0a0a0c' : '#ffffff';
}