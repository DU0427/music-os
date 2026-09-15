'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Library, History, Smile } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAudioStore } from '../audio/store';
import { useRuntimeStore } from '../store/runtime';
import { useLibraryStore } from '../store/library';
import { useMoodStore } from '../store/mood';
import { useDominantColor, withAlpha, contrastText, energyTargetFallback } from '../hooks/useDominantColor';
import VinylDisc from './VinylDisc';
import type { TrackRecord } from '../../shared/ipc/music';

const MOOD_OPTIONS: Array<{ id: string | null; label: string }> = [
  { id: null, label: '无' },
  { id: 'Night', label: '夜晚' },
  { id: 'Energy', label: '能量' },
  { id: 'Calm', label: '平静' },
  { id: 'Nostalgia', label: '怀旧' },
];

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
      <div className="font-mono tracking-[0.08em]" style={{ fontSize: 15, color: 'var(--mo-ink-faint)' }}>
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
    <div
      className="relative flex flex-col items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
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
  const playTrack = useAudioStore((s) => s.playTrack);
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
      // 会话已恢复但缺播放源：尝试按持久化路径回读
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

  const size = isMobile ? 216 : 300;
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
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-10">
      {/* 光池：让纯黑有了「舞台」的指向 */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(46% 42% at 50% 44%, rgba(255,255,255,0.05), transparent 72%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.985, filter: 'blur(6px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-20 flex flex-col items-center pointer-events-auto"
      >
        {/* ——— 唱盘 + 封面 ——— */}
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

          {/* 唱盘：有封面时从右侧露出圆弧并旋转；空态时它就是舞台上的唯一静物 */}
          <VinylDisc
            size={discSize}
            spinning={isPlaying && Boolean(heroTrack)}
            style={
              heroArtwork
                ? { right: 0, top: (size - discSize) / 2 }
                : { left: '50%', top: '50%', marginLeft: -discSize / 2, marginTop: -discSize / 2 }
            }
          />

          {/* 封面（唱片套） */}
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

          {/* 播放/载入按钮（始终在 DOM 中；hover 显现；空态半显作为引导） */}
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

        {/* ——— 文案 ——— */}
        <div className="mt-10 flex flex-col items-center text-center">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12 }}
            onClick={() => {
              if (track && onDetail) onDetail();
            }}
            style={{
              fontSize: isEmpty ? (isMobile ? 30 : 36) : isMobile ? 32 : 42,
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
          </motion.h1>

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