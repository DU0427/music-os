'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Search as SearchIcon, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLibraryStore } from '../store/library';
import { useAudioStore } from '../audio/store';

export default function SearchOrbital({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const tracks = useLibraryStore((s) => s.tracks);
  const [query, setQuery] = useState('');
  const [providerResults, setProviderResults] = useState<Array<{ title: string; artist: string; ref: any }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 120);
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setProviderResults([]);
      return;
    }
    if (typeof window.musicOS?.searchMusic !== 'function') return;
    setIsSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await window.musicOS.searchMusic(query.trim(), 'mock' as any);
        const arr = Array.isArray(res?.tracks) ? res.tracks : [];
        setProviderResults(arr.slice(0, 6).map((p: any) => ({ title: p.title, artist: p.artist?.name ?? '', ref: p.reference })));
      } catch {
        setProviderResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 320);
    return () => clearTimeout(t);
  }, [query]);

  const q = query.trim().toLowerCase();
  const localResults = q
    ? tracks
        .filter((t) => `${t.title} ${t.artist} ${t.album ?? ''}`.toLowerCase().includes(q))
        .slice(0, 6)
    : [];

  const handleLocalPlay = async (trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    if (!track) return;
    const audio = useAudioStore.getState();
    if (track.providerId !== 'local-file' && track.providerTrackId) {
      await audio.loadProviderTrack({ providerId: track.providerId as any, platformTrackId: track.providerTrackId });
    } else if (audio.track?.id === track.id && audio.canPlay) {
      void audio.play();
    }
    onClose();
  };

  const handleProviderPlay = async (ref: any) => {
    await useAudioStore.getState().loadProviderTrack(ref);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="absolute inset-0 z-30 flex flex-col items-center pt-28 pointer-events-auto"
          initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          animate={{ opacity: 1, backdropFilter: 'blur(16px)' }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          transition={{ duration: 0.45 }}
        >
          <div className="absolute inset-0 bg-black/55" onClick={onClose} />

          <motion.div
            className="relative z-10 w-full max-w-xl px-8"
            initial={{ y: -14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.14, ease: 'easeOut' }}
          >
            <div className="relative">
              <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/35" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索你的音乐宇宙…"
                className="w-full bg-white/[0.06] border border-white/10 rounded-full py-4 pl-12 pr-12 text-white/90 placeholder:text-white/25 outline-none focus:border-[rgba(110,168,255,0.35)] focus:shadow-[0_0_24px_rgba(110,168,255,0.12)] transition-all font-sans tracking-wide text-[14px]"
              />
              <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/80 p-1" onClick={onClose}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-6 flex justify-center gap-2 flex-wrap">
              {['hot', 'ambient', 'vocal', 'night', 'calm'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setQuery(tag)}
                  className="px-3 py-1.5 rounded-full border border-white/10 text-white/45 text-[11px] font-sans hover:bg-white/5 hover:text-white/80 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* results as orbital list */}
            {(localResults.length > 0 || providerResults.length > 0) && (
              <div className="mt-8 grid gap-2 max-h-[42vh] overflow-y-auto pr-1">
                {localResults.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => void handleLocalPlay(t.id)}
                    className="flex items-center gap-3 text-left px-4 py-3 rounded-2xl border border-white/8 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/15 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-[11px]">♪</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-white/85 truncate">{t.title}</div>
                      <div className="text-[11px] text-white/35 truncate">{t.artist} {t.album ? `· ${t.album}` : ''}</div>
                    </div>
                    <span className="text-[10px] text-white/25">本地</span>
                  </button>
                ))}
                {providerResults.map((p, i) => (
                  <button
                    key={`${p.title}-${i}`}
                    onClick={() => void handleProviderPlay(p.ref)}
                    className="flex items-center gap-3 text-left px-4 py-3 rounded-2xl border border-white/8 bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#6EA8FF]/15 flex items-center justify-center text-white/60 text-[11px]">✦</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-white/85 truncate">{p.title}</div>
                      <div className="text-[11px] text-white/35 truncate">{p.artist}</div>
                    </div>
                    <span className="text-[10px] text-white/25">示例</span>
                  </button>
                ))}
              </div>
            )}

            {query && localResults.length === 0 && providerResults.length === 0 && !isSearching && (
              <div className="mt-10 text-center text-white/30 font-sans text-[12px] tracking-wide">未找到与“{query}”相关的轨道</div>
            )}
            {isSearching && <div className="mt-6 text-center text-white/25 text-[11px] tracking-wide">搜索中…</div>}
            {!query && (
              <div className="mt-10 text-center text-white/25 font-sans text-[11px] tracking-[0.14em] uppercase">输入以开始探索</div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
