'use client';

import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Pause, ExternalLink, BookmarkPlus, Plus, Mic2 } from 'lucide-react';
import CoreVisual from './CoreVisual';

export default function DetailOverlay() {
  const { isDetailOpen, setIsDetailOpen, currentSong, isPlaying, setIsPlaying, setCurrentSpace } = useAppStore();

  return (
    <AnimatePresence>
      {isDetailOpen && (
        <motion.div 
          className="absolute inset-0 z-[90] flex items-center justify-center pointer-events-auto"
          initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          animate={{ opacity: 1, backdropFilter: 'blur(10px)' }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Background overlay */}
          <div className="absolute inset-0 bg-space-black/60" onClick={() => setIsDetailOpen(false)} />
          
          <button 
            className="absolute top-8 right-12 text-white/40 hover:text-white transition-colors flex items-center gap-2 group"
            onClick={() => setIsDetailOpen(false)}
          >
            <span className="font-mono text-[10px] tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity">CLOSE (ESC)</span>
            <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:border-electric-cyan group-hover:bg-electric-cyan/10 transition-all">
              <X className="w-4 h-4 group-hover:text-electric-cyan" />
            </div>
          </button>

          <div className="relative z-10 w-full max-w-6xl px-12 flex flex-col md:flex-row gap-12 md:gap-24 items-center md:items-center overflow-y-auto max-h-[90vh]">
            
            {/* Enlarged Sphere with layoutId */}
            <div className="flex-shrink-0 flex flex-col items-center">
              <CoreVisual layoutId="music-core-sphere" onClick={() => setIsPlaying(!isPlaying)} />
              
              <motion.div 
                className="mt-12 flex flex-col items-center text-center pointer-events-none"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.8 }}
              >
                <div className="font-mono text-[9px] text-electric-cyan/60 mb-3 tracking-[0.3em]">NOW PLAYING</div>
                <div className="font-display text-2xl text-white/90 tracking-[0.2em]">{currentSong.title.toUpperCase()}</div>
                <div className="font-body text-base text-white/60 tracking-widest mt-2">{currentSong.artist}</div>
              </motion.div>
            </div>

            {/* Details Panel */}
            <motion.div 
              className="flex-1 flex flex-col justify-center"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              
              {/* Vertical Info Stack */}
              <div className="space-y-8 relative">
                
                {/* Visual Connector Line */}
                <div className="absolute left-[3px] top-4 bottom-4 w-px bg-gradient-to-b from-white/10 via-electric-cyan/20 to-transparent" />
                
                {/* Info Nodes */}
                <div className="relative pl-6">
                  <div className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-electric-cyan shadow-[0_0_8px_#7DE7E2]" />
                  <h3 className="font-mono text-[10px] tracking-[0.2em] text-white/40 mb-1">ALBUM</h3>
                  <p className="font-body tracking-wider text-base text-white/80">{currentSong.album}</p>
                </div>
                
                <div className="relative pl-6">
                  <div className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-white/20" />
                  <h3 className="font-mono text-[10px] tracking-[0.2em] text-white/40 mb-1">FIRST PLAYED</h3>
                  <p className="font-mono tracking-widest text-base text-white/80">{currentSong.firstPlayed}</p>
                </div>

                <div className="relative pl-6">
                  <div className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-warm-amber shadow-[0_0_8px_#F0B56A]" />
                  <h3 className="font-mono text-[10px] tracking-[0.2em] text-white/40 mb-1">ENERGY / BPM</h3>
                  <div className="flex items-center gap-4">
                    <p className="font-mono tracking-widest text-base text-white/80">{currentSong.energy}% / {currentSong.bpm}</p>
                    <div className="w-32 h-0.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-warm-amber w-[82%]" />
                    </div>
                  </div>
                </div>

                <div className="relative pl-6">
                  <div className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-[#EA8E83] shadow-[0_0_8px_#EA8E83]" />
                  <h3 className="font-mono text-[10px] tracking-[0.2em] text-white/40 mb-1">MOOD</h3>
                  <p className="font-display tracking-[0.2em] text-base text-white/80">{currentSong.mood.toUpperCase()}</p>
                </div>

                <div className="relative pl-6 pt-4 border-t border-white/5">
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <h3 className="font-mono text-[10px] tracking-[0.2em] text-white/40 mb-1">MOST PLAYED TIME</h3>
                      <p className="font-mono tracking-widest text-base text-white/80">{currentSong.mostPlayed}</p>
                    </div>
                    <div>
                      <h3 className="font-mono text-[10px] tracking-[0.2em] text-white/40 mb-1">TOTAL PLAYS</h3>
                      <p className="font-mono tracking-widest text-base text-white/80">{currentSong.playCount} times</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Actions */}
              <div className="mt-16 space-y-4">
                {/* Primary Actions */}
                <div className="flex items-center gap-4">
                  <button 
                    className="flex-1 flex items-center justify-center gap-3 bg-white hover:bg-white/90 text-space-black py-4 px-6 rounded-full transition-all group"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5 ml-1" fill="currentColor" />}
                    <span className="font-display tracking-[0.2em] text-sm font-bold">{isPlaying ? 'PAUSE' : 'PLAY'}</span>
                  </button>
                  <button 
                    className="flex-[2] flex items-center justify-between border border-electric-cyan/30 bg-electric-cyan/5 hover:bg-electric-cyan/10 hover:border-electric-cyan/50 text-electric-cyan py-4 px-6 rounded-full transition-all group"
                    onClick={() => {
                      setIsDetailOpen(false);
                      setCurrentSpace('visualizer');
                    }}
                  >
                    <span className="font-mono tracking-[0.2em] text-xs group-hover:text-white transition-colors">OPEN VISUALIZER WORLD</span>
                    <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>

                {/* Secondary Actions */}
                <div className="flex items-center gap-2">
                  <button className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full border border-white/10 hover:bg-white/5 text-white/50 hover:text-white transition-all">
                    <Mic2 className="w-3.5 h-3.5" />
                    <span className="font-mono text-[10px] tracking-[0.2em]">LYRICS</span>
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full border border-white/10 hover:border-warm-amber/50 hover:bg-warm-amber/5 hover:text-warm-amber text-white/50 transition-all">
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    <span className="font-mono text-[10px] tracking-[0.2em]">KEEP MEMORY</span>
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full border border-white/10 hover:bg-white/5 text-white/50 hover:text-white transition-all">
                    <Plus className="w-3.5 h-3.5" />
                    <span className="font-mono text-[10px] tracking-[0.2em]">QUEUE</span>
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
