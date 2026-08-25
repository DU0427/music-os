'use client';

import { motion } from 'motion/react';
import { useEffect, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRuntimeStore } from '../store/runtime';
import { useLibraryStore } from '../store/library';
import { useAudioStore } from '../audio/store';

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return iso.slice(0, 10);
  }
}

export default function MemoryFieldWorld() {
  const requestSpace = useRuntimeStore((s) => s.requestSpace);
  const tracks = useLibraryStore((s) => s.tracks);
  const history = useLibraryStore((s) => s.history);
  const refresh = useLibraryStore((s) => s.refresh);
  const trackMap = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Build timeline points: first history entries + current
  const points = useMemo(() => {
    const sorted = [...history].sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
    const items: Array<{ id: string; label: string; sub: string; color: string; trackTitle?: string; startedAt: string }> = [];

    if (sorted.length > 0) {
      const first = sorted[0];
      const t = trackMap.get(first.trackId);
      items.push({
        id: `first-${first.id}`,
        label: formatDate(first.startedAt),
        sub: 'first encounter',
        color: '#F0B56A',
        trackTitle: t?.title,
        startedAt: first.startedAt,
      });
    }

    // middle: most played track aggregated
    if (sorted.length > 1) {
      const counts = new Map<string, number>();
      sorted.forEach((h) => counts.set(h.trackId, (counts.get(h.trackId) ?? 0) + 1));
      const topId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      const topTrack = topId ? trackMap.get(topId) : null;
      const topEntry = sorted.find((h) => h.trackId === topId);
      if (topTrack && topEntry) {
        items.push({
          id: `top-${topId}`,
          label: topTrack.title.slice(0, 14),
          sub: `${counts.get(topId!) ?? 0} plays · ${formatDate(topEntry.startedAt)}`,
          color: '#7DE7E2',
          trackTitle: topTrack.title,
          startedAt: topEntry.startedAt,
        });
      }
    }

    // now
    const nowTrack = useAudioStore.getState().track;
    items.push({
      id: 'now',
      label: 'now',
      sub: nowTrack ? `${nowTrack.title} — ${nowTrack.artist}` : 'no active track',
      color: '#ffffff',
      trackTitle: nowTrack?.title,
      startedAt: new Date().toISOString(),
    });

    return items.slice(0, 5);
  }, [history, trackMap]);

  const handleRestore = async (trackTitle?: string) => {
    if (!trackTitle) return;
    const track = tracks.find((t) => t.title === trackTitle);
    if (!track) return;
    const audio = useAudioStore.getState();
    if (track.providerId !== 'local-file' && track.providerTrackId) {
      await audio.loadProviderTrack({ providerId: track.providerId as any, platformTrackId: track.providerTrackId });
    } else if (audio.track?.id === track.id && audio.canPlay) {
      void audio.play();
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      <button
        onClick={() => requestSpace('home')}
        className="absolute top-24 left-10 z-20 flex items-center gap-2 text-white/50 hover:text-white transition-colors pointer-events-auto"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="font-sans tracking-[0.14em] text-[11px] uppercase">back</span>
      </button>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <svg className="absolute w-[110%] h-64 top-1/2 -translate-y-1/2 opacity-[0.14]" viewBox="0 0 1000 200" preserveAspectRatio="none">
          <path d="M 0,100 C 250,190 750,10 1000,100" fill="none" stroke="#F0B56A" strokeWidth="1.5" />
        </svg>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto flex gap-10 md:gap-20 items-center">
          {points.map((p, idx) => {
            const isCenter = idx === 1 && points.length === 3;
            return (
              <motion.div
                key={p.id}
                className="relative flex flex-col items-center group cursor-pointer"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.14 }}
                onClick={() => void handleRestore(p.trackTitle)}
                style={{ marginTop: idx === 1 ? -32 : idx === 2 ? 24 : 0 }}
              >
                <div
                  className="w-3 h-3 rounded-full mb-3"
                  style={{ background: p.color, boxShadow: `0 0 14px ${p.color}` }}
                />
                <div
                  className={`rounded-2xl text-center px-4 py-3 border backdrop-blur-md transition-all ${
                    isCenter ? 'bg-white/[0.07] border-[#7DE7E2]/20 w-56' : 'bg-black/30 border-white/10 w-40 opacity-60 group-hover:opacity-100'
                  }`}
                >
                  <span className="font-mono text-[10px] text-white/40 block mb-1 tracking-wide">{p.label}</span>
                  <span className={`font-sans block truncate ${isCenter ? 'text-[13px] text-white/90' : 'text-[12px] text-white/70'}`}>{p.sub}</span>
                  {p.trackTitle && isCenter && <span className="text-[10px] text-white/30 mt-1 block truncate">{p.trackTitle}</span>}
                </div>
              </motion.div>
            );
          })}
        </div>

        {history.length === 0 && (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 text-center pointer-events-none">
            <p className="text-[11px] tracking-wide text-white/25">no history yet — play a track to seed your memory field</p>
          </div>
        )}
      </div>

      <div className="absolute bottom-28 right-12 text-right pointer-events-none hidden md:block">
        <h3 className="font-sans text-white/60 tracking-[0.14em] text-[11px] uppercase">memory field</h3>
        <p className="font-sans text-white/25 text-[11px] mt-1">trace your listening timeline</p>
      </div>

      <div id="memory-field-world" data-testid="memory-world" style={{ display: 'none' }} />
    </div>
  );
}
