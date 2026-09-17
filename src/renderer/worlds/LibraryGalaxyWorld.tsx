'use client';

import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Play, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useRuntimeStore } from '../store/runtime';
import { useLibraryStore } from '../store/library';
import { useAudioStore } from '../audio/store';
import type { TrackRecord } from '../../shared/ipc/music';

const VINYL_GRADIENT =
  'conic-gradient(from 210deg at 50% 50%, #2a2a2e, transparent 32%, #0a0a0c 56%, #3a3a3e 80%, #2a2a2e)';

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

/** 最近播放时间：今天显示时刻，其余显示日期。 */
function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso.slice(0, 10);
  }
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay ? `今天 ${time}` : `${date.getMonth() + 1}月${date.getDate()}日 ${time}`;
}

export default function LibraryGalaxyWorld() {
  const requestSpace = useRuntimeStore((s) => s.requestSpace);
  const tracks = useLibraryStore((s) => s.tracks);
  const refresh = useLibraryStore((s) => s.refresh);
  const history = useLibraryStore((s) => s.history);
  const [selected, setSelected] = useState<TrackRecord | null>(null);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** 当前选中曲目的聆听统计（次数 + 最近一次）。 */
  const selectedStats = useMemo(() => {
    if (!selected) {
      return { plays: 0, lastAt: null as string | null };
    }
    const records = history.filter((record) => record.trackId === selected.id);
    if (records.length === 0) {
      return { plays: 0, lastAt: null as string | null };
    }
    const lastAt = records.reduce((latest, record) =>
      new Date(record.startedAt).getTime() > new Date(latest).getTime() ? record.startedAt : latest,
      records[0].startedAt,
    );
    return { plays: records.length, lastAt };
  }, [history, selected]);

  const handlePlay = async (track: TrackRecord) => {
    await useAudioStore.getState().playTrack(track);
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      <button
        onClick={() => requestSpace('home')}
        className="absolute top-24 left-10 z-20 flex items-center gap-2 text-white/50 hover:text-white transition-colors pointer-events-auto"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="font-sans tracking-[0.14em] text-[11px] uppercase">返回</span>
      </button>

      {/* 头部 */}
      <div className="absolute left-10 right-10 flex items-baseline" style={{ top: 124, justifyContent: 'space-between' }}>
        <span className="flex items-baseline" style={{ gap: 10 }}>
          <h2 style={{ fontSize: 15, fontWeight: 500, color: 'var(--mo-ink)', letterSpacing: '0.02em' }}>曲库</h2>
          <span className="font-mono mo-tabular" style={{ fontSize: 11, color: 'var(--mo-ink-faint)' }}>
            {tracks.length}
          </span>
        </span>
        <span style={{ fontSize: 11.5, color: 'var(--mo-ink-faint)' }}>点击封面查看详情 · 双击播放</span>
      </div>

      {/* 封面场：真实封面网格 */}
      <div className="absolute inset-0 overflow-y-auto pointer-events-auto">
        <div className="min-h-full flex items-center justify-center">
          {tracks.length === 0 ? (
            <p className="text-[12px] tracking-wide" style={{ color: 'var(--mo-ink-faint)' }}>
              载入歌曲以点亮封面场
            </p>
          ) : (
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))',
                width: 'min(1120px, calc(100vw - 80px))',
                padding: '168px 0 150px',
              }}
            >
              {tracks.map((track) => (
                <motion.button
                  key={track.id}
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.05 * Math.min(tracks.indexOf(track), 10) }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelected(track)}
                  onDoubleClick={() => void handlePlay(track)}
                  className="relative aspect-square rounded-[12px] overflow-hidden group cursor-pointer"
                  style={{
                    background: track.artworkUrl
                      ? `url("${track.artworkUrl}") center / cover no-repeat`
                      : VINYL_GRADIENT,
                    border: '1px solid var(--mo-line-subtle)',
                    boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
                  }}
                >
                  {/* hover 微亮 + 曲名浮现 */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-300" />
                  <div className="absolute inset-x-0 bottom-0 px-2.5 pb-2 pt-6 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="text-[11px] text-white/90 truncate text-left">{track.title}</div>
                    <div className="text-[9px] text-white/50 truncate text-left mt-0.5">{track.artist}</div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 详情玻璃面板 */}
      <AnimatePresence>
        {selected && (
          <motion.aside
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-0 right-0 bottom-0 w-[340px] z-20 pointer-events-auto flex flex-col p-8"
            style={{
              background: 'var(--mo-bg-elevated-strong)',
              borderLeft: '1px solid var(--mo-line)',
              backdropFilter: 'blur(22px) saturate(1.15)',
              WebkitBackdropFilter: 'blur(22px) saturate(1.15)',
            }}
          >
            <button
              onClick={() => setSelected(null)}
              className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors"
              aria-label="关闭"
            >
              <X className="w-4 h-4" />
            </button>

            <div
              className="mt-10 aspect-square w-full rounded-[14px] mb-8"
              style={{
                background: selected.artworkUrl
                  ? `url("${selected.artworkUrl}") center / cover no-repeat`
                  : VINYL_GRADIENT,
                border: '1px solid var(--mo-line-subtle)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
              }}
            />

            <div className="font-mono tracking-[0.18em] uppercase" style={{ fontSize: 10, color: 'var(--mo-ink-muted)' }}>
              曲库
            </div>
            <h2 className="mt-2" style={{ fontSize: 22, fontWeight: 300, letterSpacing: '-0.02em', color: 'var(--mo-ink)', lineHeight: 1.2 }}>
              {selected.title}
            </h2>
            <div className="mt-2" style={{ fontSize: 13, color: 'var(--mo-ink-muted)' }}>
              {selected.artist}{selected.album ? ` · ${selected.album}` : ''}
            </div>

            {/* 聆听统计：把稀疏的元信息收进一张卡 */}
            <div className="mt-7" style={{ borderRadius: 14, border: '1px solid var(--mo-line)', background: 'rgba(255,255,255,0.02)', padding: '2px 14px' }}>
              {[
                ['时长', formatDuration(selected.durationSeconds)],
                ['来源', selected.providerId === 'local-file' ? '本地文件' : selected.providerId],
                ['聆听次数', selectedStats.plays > 0 ? `${selectedStats.plays} 次` : '还没听过'],
                ['最近播放', selectedStats.lastAt ? formatWhen(selectedStats.lastAt) : '—'],
              ].map(([label, value], index) => (
                <div
                  key={label}
                  className="flex items-center justify-between"
                  style={{ padding: '10px 0', borderTop: index > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
                >
                  <span className="font-mono tracking-[0.14em] uppercase" style={{ fontSize: 10, color: 'var(--mo-ink-faint)' }}>
                    {label}
                  </span>
                  <span className="mo-tabular truncate" style={{ fontSize: 12.5, color: 'var(--mo-ink-soft)', marginLeft: 12 }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {selected.worldContext?.moodTags?.length ? (
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <span className="font-mono tracking-[0.14em] uppercase" style={{ fontSize: 10, color: 'var(--mo-ink-faint)' }}>氛围</span>
                {selected.worldContext.moodTags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded-full" style={{ background: 'var(--mo-accent-ghost)', color: 'var(--mo-accent)' }}>
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void handlePlay(selected)}
              className="mt-auto flex items-center justify-center gap-2 rounded-full py-3"
              style={{
                background: 'var(--mo-accent)',
                color: 'var(--mo-accent-contrast)',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <Play className="w-3.5 h-3.5" fill="currentColor" strokeWidth={0} />
              播放
            </button>
          </motion.aside>
        )}
      </AnimatePresence>

      <div id="library-galaxy-world" data-testid="library-world" style={{ display: 'none' }} />
    </div>
  );
}