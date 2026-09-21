'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Search as SearchIcon, X, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLibraryStore } from '../store/library';
import { useAudioStore } from '../audio/store';
import { useDominantColor, withAlpha } from '../hooks/useDominantColor';
import type { ProviderTrack, ProviderTrackReference } from '../../shared/music/providers';

const COVER_FALLBACK =
  'conic-gradient(from 210deg at 50% 50%, #2a2a2e, transparent 32%, #0a0a0c 56%, #3a3a3e 80%, #2a2a2e)';

const SUGGESTIONS = ['后摇', '粤语', '电子', '深夜', '学习', '女声'];

/** 结果行：封面 + 标题/艺术家 + 来源标签，悬停整行微亮。 */
function ResultRow({
  coverUrl,
  title,
  sub,
  tag,
  vip = false,
  loading,
  onClick,
}: {
  coverUrl: string | null;
  title: string;
  sub: string;
  tag: string;
  vip?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  const accent = useDominantColor(coverUrl, '#f5f5f7');
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex w-full items-center text-left"
      style={{
        gap: 12,
        padding: '9px 12px',
        borderRadius: 12,
        border: `1px solid ${hovered ? withAlpha(accent, 0.28) : 'transparent'}`,
        background: hovered ? 'rgba(255,255,255,0.045)' : 'transparent',
        transition: 'border-color 220ms var(--mo-ease), background 220ms var(--mo-ease)',
        cursor: 'pointer',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 38,
          height: 38,
          flexShrink: 0,
          borderRadius: 9,
          background: coverUrl ? `url("${coverUrl}") center / cover no-repeat` : COVER_FALLBACK,
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
        }}
      />
      <span className="min-w-0" style={{ display: 'block', flex: 1 }}>
        <span
          style={{
            display: 'block',
            fontSize: 13,
            color: 'var(--mo-ink)',
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
            fontSize: 11.5,
            color: 'var(--mo-ink-faint)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {sub}
        </span>
      </span>
      {vip ? (
        <span
          className="font-mono shrink-0"
          style={{
            padding: '1px 5px',
            borderRadius: 6,
            fontSize: 9.5,
            letterSpacing: '0.06em',
            color: 'var(--mo-ink-muted)',
            border: '1px solid var(--mo-line-strong)',
          }}
        >
          VIP
        </span>
      ) : null}
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'var(--mo-ink-faint)' }} />
      ) : (
        <span className="font-mono shrink-0" style={{ fontSize: 10, color: 'var(--mo-ink-faint)', letterSpacing: '0.08em' }}>
          {tag}
        </span>
      )}
    </button>
  );
}

export default function SearchOrbital({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const tracks = useLibraryStore((s) => s.tracks);
  const [query, setQuery] = useState('');
  const [providerResults, setProviderResults] = useState<ProviderTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingRef, setLoadingRef] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 120);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setProviderResults([]);
      setIsSearching(false);
      return undefined;
    }
    if (typeof window.musicOS?.searchMusic !== 'function') {
      return undefined;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await window.musicOS.searchMusic(q, 'netease');
        setProviderResults(Array.isArray(res?.tracks) ? res.tracks.slice(0, 8) : []);
      } catch {
        setProviderResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 320);
    return () => clearTimeout(timer);
  }, [query]);

  const q = query.trim().toLowerCase();
  const localResults = q
    ? tracks.filter((t) => `${t.title} ${t.artist} ${t.album ?? ''}`.toLowerCase().includes(q)).slice(0, 5)
    : [];

  const handleLocalPlay = async (trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    if (!track) {
      return;
    }
    await useAudioStore.getState().playTrack(track);
    onClose();
  };

  const handleProviderPlay = async (track: ProviderTrack) => {
    setLoadingRef(track.reference.platformTrackId);
    try {
      await useAudioStore.getState().loadProviderTrack(track.reference as ProviderTrackReference);
      onClose();
    } finally {
      setLoadingRef(null);
    }
  };

  const hasResults = localResults.length > 0 || providerResults.length > 0;

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="absolute inset-0 z-30 flex flex-col items-center pointer-events-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32 }}
          style={{ paddingTop: 96 }}
        >
          <div
            className="absolute inset-0"
            onClick={onClose}
            style={{ background: 'rgba(3,3,5,0.72)', backdropFilter: 'blur(18px) saturate(1.1)', WebkitBackdropFilter: 'blur(18px) saturate(1.1)' }}
          />

          <motion.div
            className="relative z-10 w-full"
            initial={{ y: -14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            style={{ maxWidth: 560, padding: '0 24px' }}
          >
            {/* 搜索框 */}
            <div
              className="flex items-center"
              style={{
                gap: 10,
                padding: '13px 14px 13px 16px',
                borderRadius: 14,
                background: 'var(--mo-bg-elevated-strong)',
                border: `1px solid ${focused ? 'var(--mo-accent-ghost)' : 'var(--mo-line)'}`,
                boxShadow: focused
                  ? 'var(--mo-shadow-glass), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 32px var(--mo-accent-ghost)'
                  : 'var(--mo-shadow-glass), inset 0 1px 0 rgba(255,255,255,0.06)',
                transition: 'border-color 260ms var(--mo-ease), box-shadow 260ms var(--mo-ease)',
              }}
            >
              <SearchIcon className="h-4 w-4" style={{ color: 'var(--mo-ink-muted)' }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索歌曲、歌手、歌单…"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                className="flex-1 bg-transparent"
                style={{ fontSize: 15, color: 'var(--mo-ink)', fontFamily: 'var(--mo-font-sans)', outline: 'none', border: 'none', background: 'transparent' }}
              />
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--mo-ink-faint)' }} /> : null}
              <span
                className="font-mono shrink-0"
                style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 7,
                  border: '1px solid var(--mo-line)',
                  color: 'var(--mo-ink-faint)',
                  letterSpacing: '0.08em',
                }}
              >
                ESC
              </span>
              <button
                type="button"
                aria-label="关闭"
                onClick={onClose}
                className="grid place-items-center rounded-full transition-colors"
                style={{ width: 24, height: 24, color: 'var(--mo-ink-muted)' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 建议词 */}
            {!query ? (
              <div className="flex flex-wrap justify-center" style={{ marginTop: 20, gap: 8 }}>
                {SUGGESTIONS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setQuery(tag)}
                    className="rounded-full transition-colors"
                    style={{
                      padding: '6px 12px',
                      fontSize: 12,
                      color: 'var(--mo-ink-soft)',
                      border: '1px solid var(--mo-line)',
                      background: 'rgba(255,255,255,0.02)',
                      cursor: 'pointer',
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            ) : null}

            {/* 结果 */}
            {query && hasResults ? (
              <div
                className="mo-no-scrollbar"
                style={{
                  marginTop: 16,
                  maxHeight: '46vh',
                  overflowY: 'auto',
                  padding: 6,
                  borderRadius: 14,
                  background: 'rgba(16,16,20,0.72)',
                  border: '1px solid var(--mo-line)',
                }}
              >
                {localResults.length > 0 ? (
                  <>
                    <div className="flex items-center" style={{ padding: '6px 12px 4px', gap: 8 }}>
                      <span className="font-mono" style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--mo-ink-faint)' }}>本地</span>
                      <span aria-hidden style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--mo-line), transparent)' }} />
                    </div>
                    {localResults.map((track) => (
                      <ResultRow
                        key={track.id}
                        coverUrl={track.artworkUrl}
                        title={track.title}
                        sub={`${track.artist}${track.album ? ` · ${track.album}` : ''}`}
                        tag="本地"
                        onClick={() => void handleLocalPlay(track.id)}
                      />
                    ))}
                  </>
                ) : null}
                {providerResults.length > 0 ? (
                  <>
                    <div className="flex items-center" style={{ padding: '6px 12px 4px', gap: 8 }}>
                      <span className="font-mono" style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--mo-ink-faint)' }}>网易云</span>
                      <span aria-hidden style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--mo-line), transparent)' }} />
                    </div>
                    {providerResults.map((track) => (
                      <ResultRow
                        key={track.reference.platformTrackId}
                        coverUrl={track.artworkUrl}
                        title={track.title}
                        sub={`${track.artist.name}${track.album ? ` · ${track.album.title}` : ''}`}
                        tag="网易云"
                        vip={Boolean(track.requiresVip)}
                        loading={loadingRef === track.reference.platformTrackId}
                        onClick={() => void handleProviderPlay(track)}
                      />
                    ))}
                  </>
                ) : null}
              </div>
            ) : null}

            {query && !hasResults && !isSearching ? (
              <div className="text-center" style={{ marginTop: 28, fontSize: 12, color: 'var(--mo-ink-faint)' }}>
                没有找到「{query}」相关的结果
              </div>
            ) : null}

            {!query ? (
              <div className="text-center font-mono" style={{ marginTop: 26, fontSize: 10.5, letterSpacing: '0.16em', color: 'var(--mo-ink-faint)' }}>
                输入关键词开始搜索
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
