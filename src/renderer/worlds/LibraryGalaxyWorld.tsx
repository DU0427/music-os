'use client';

import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRuntimeStore } from '../store/runtime';
import { useLibraryStore } from '../store/library';
import { useAudioStore } from '../audio/store';

const CATEGORIES = [
  { name: 'electronic', label: 'electronic', angle: -20, radius: 150, size: 80, color: '#78AFFF' },
  { name: 'ambient', label: 'ambient', angle: 45, radius: 200, size: 100, color: '#7DE7E2' },
  { name: 'nostalgia', label: 'nostalgia', angle: 120, radius: 180, size: 60, color: '#F0B56A' },
  { name: 'jazz', label: 'jazz', angle: 180, radius: 250, size: 70, color: '#EA8E83' },
  { name: 'cinema', label: 'cinema', angle: 250, radius: 160, size: 90, color: '#B6A8D8' },
];

export default function LibraryGalaxyWorld() {
  const requestSpace = useRuntimeStore((s) => s.requestSpace);
  const tracks = useLibraryStore((s) => s.tracks);
  const refresh = useLibraryStore((s) => s.refreshTracks);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // filter tracks by moodTags or title contains
  const filtered = selected
    ? tracks.filter((t) => {
        const tags = t.worldContext?.moodTags ?? [];
        const hay = `${t.title} ${t.artist} ${tags.join(' ')}`.toLowerCase();
        return hay.includes(selected.toLowerCase()) || tags.join('').toLowerCase().includes(selected.slice(0, 3));
      })
    : tracks;

  const showTracks = selected ? filtered : [];

  const TILT = 45;
  const cosTilt = Math.cos((TILT * Math.PI) / 180);
  const getPos = (radius: number, angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius * cosTilt };
  };

  const handleTrackPlay = async (trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    if (!track) return;
    // For local-file tracks we can't auto-play without file; show restore hint via audio store
    // But for provider tracks or already loaded, we can attempt restore
    const audioState = useAudioStore.getState();
    if (audioState.track?.id === track.id && audioState.canPlay) {
      void audioState.play();
    } else {
      // Try to restore provider track if applicable
      if (track.providerId !== 'local-file' && track.providerTrackId) {
        await audioState.loadProviderTrack({ providerId: track.providerId as any, platformTrackId: track.providerTrackId });
      }
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
        <div className="w-96 h-96 rounded-full bg-[#6EA8FF]/5 blur-[90px]" />

        <div className="absolute inset-0 pointer-events-auto flex items-center justify-center">
          {CATEGORIES.map((cat) => {
            const pos = getPos(cat.radius, cat.angle);
            const isSelected = selected === cat.name;
            return (
              <motion.div
                key={cat.name}
                className="absolute flex items-center justify-center group cursor-pointer"
                style={{ width: cat.size, height: cat.size, x: pos.x, y: pos.y }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: isSelected ? 1.12 : 1 }}
                transition={{ duration: 0.8 }}
                onClick={() => setSelected(isSelected ? null : cat.name)}
              >
                <div className="relative w-full h-full flex items-center justify-center">
                  <div
                    className="absolute inset-0 rounded-full backdrop-blur-md border transition-all"
                    style={{
                      background: isSelected ? `${cat.color}18` : 'rgba(0,0,0,0.35)',
                      borderColor: isSelected ? `${cat.color}55` : 'rgba(255,255,255,0.08)',
                      boxShadow: isSelected ? `0 0 24px ${cat.color}40` : 'none',
                    }}
                  />
                  <div
                    className="absolute inset-[30%] rounded-full blur-[10px] opacity-70"
                    style={{ background: cat.color }}
                  />
                  <div className="absolute inset-[38%] bg-white/80 rounded-full blur-[2px]" />
                </div>
                <div className="absolute top-[115%] left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className={`font-sans text-[11px] tracking-wide ${isSelected ? 'text-white/90' : 'text-white/55'}`}>{cat.label}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Track list */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[min(640px,calc(100vw-32px))] pointer-events-auto z-20">
        {selected && (
          <div className="rounded-[16px] border border-white/10 bg-black/40 backdrop-blur-xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] tracking-[0.12em] uppercase text-white/40">
                {selected} — {showTracks.length} tracks
              </span>
              <button onClick={() => setSelected(null)} className="text-[11px] text-white/30 hover:text-white/70">
                clear
              </button>
            </div>
            {tracks.length === 0 ? (
              <div className="text-[12px] text-white/30 py-6 text-center">no tracks yet — load a local song to populate</div>
            ) : showTracks.length === 0 ? (
              <div className="text-[12px] text-white/30 py-6 text-center">no match in this filter</div>
            ) : (
              <div className="grid gap-2 max-h-[180px] overflow-y-auto pr-1">
                {showTracks.slice(0, 12).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => void handleTrackPlay(t.id)}
                    className="flex items-center gap-3 text-left px-3 py-2.5 rounded-xl border border-white/5 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/10 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white/60">♪</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-white/85 truncate">{t.title}</div>
                      <div className="text-[11px] text-white/35 truncate">{t.artist} {t.album ? `· ${t.album}` : ''}</div>
                    </div>
                    <span className="text-[10px] tracking-wide text-white/25">{Math.round(t.durationSeconds)}s</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {!selected && (
          <div className="text-center pointer-events-none">
            <h3 className="font-sans text-white/70 tracking-[0.14em] text-[11px] uppercase">library nebula</h3>
            <p className="font-sans text-white/25 text-[11px] mt-1">five genres — tap a planet to explore your collection</p>
          </div>
        )}
      </div>

      <div id="library-galaxy-world" data-testid="library-world" style={{ display: 'none' }} />
    </div>
  );
}
