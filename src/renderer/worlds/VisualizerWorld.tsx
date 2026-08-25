'use client';

import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { useRuntimeStore } from '../store/runtime';
import { useAudioStore } from '../audio/store';
import { useEffect, useRef } from 'react';

export default function VisualizerWorld() {
  const requestSpace = useRuntimeStore((s) => s.requestSpace);
  const track = useAudioStore((s) => s.track);
  const metricsRef = useRef({ bass: 0, mid: 0, treble: 0, energy: 0, beatPulse: 0 });

  // subscribe to metrics via frame loop using rAF to drive DOM
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      metricsRef.current = useAudioStore.getState().metrics;
      const el = document.getElementById('viz-dome');
      const grid = document.getElementById('viz-grid');
      const horizon = document.getElementById('viz-horizon');
      if (el) {
        const s = 1 + metricsRef.current.bass * 0.08 + metricsRef.current.energy * 0.06;
        el.style.transform = `scale(${s})`;
        el.style.opacity = `${0.38 + metricsRef.current.energy * 0.22}`;
      }
      if (grid) {
        grid.style.opacity = `${0.08 + metricsRef.current.treble * 0.18}`;
      }
      if (horizon) {
        const pulse = metricsRef.current.beatPulse * 0.7;
        horizon.style.boxShadow = `0 0 ${12 + pulse * 18}px rgba(125,231,226,${0.15 + pulse * 0.2})`;
        horizon.style.opacity = `${0.6 + pulse * 0.3}`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const c1 = track?.worldContext?.energyTarget === 'calm' ? '#78AFFF' : track?.worldContext?.energyTarget === 'electric' ? '#EA8E83' : '#1A2980';
  const c2 = '#7DE7E2';

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      <button
        onClick={() => requestSpace('home')}
        className="absolute top-24 left-10 z-20 flex items-center gap-2 text-white/50 hover:text-white transition-colors pointer-events-auto"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="font-sans tracking-[0.14em] text-[11px] uppercase">back</span>
      </button>

      {/* Dome gradients */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          id="viz-dome"
          className="absolute inset-0 mix-blend-screen pointer-events-none"
          style={{ background: `radial-gradient(ellipse at bottom, ${c1} 0%, transparent 75%)` }}
          animate={{ opacity: [0.32, 0.58, 0.32], scale: [1, 1.04, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute inset-0 mix-blend-color-dodge pointer-events-none"
          style={{ background: `radial-gradient(ellipse at top, ${c2} 0%, transparent 75%)` }}
          animate={{ opacity: [0.12, 0.36, 0.12], scale: [1.04, 1, 1.04] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Horizon */}
        <div className="absolute bottom-0 w-full h-[40%] bg-gradient-to-t from-[#0B1621] to-transparent pointer-events-none" />
        <div id="viz-horizon" className="absolute bottom-0 w-full h-px bg-[#7DE7E2]/20 pointer-events-none" />

        {/* Perspective grid */}
        <div id="viz-grid" className="absolute bottom-0 w-full h-[30%] perspective-[500px] flex justify-center pointer-events-none">
          <div className="w-[180%] h-full border-t border-[#7DE7E2]/15" style={{ transform: 'rotateX(62deg)' }}>
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="absolute h-full border-l border-[#7DE7E2]/10" style={{ left: `${(i / 18) * 100}%` }} />
            ))}
          </div>
        </div>

        {/* Center audio orb */}
        <motion.div
          className="relative w-32 h-32 rounded-full bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center"
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-2 h-2 rounded-full bg-white/70 shadow-[0_0_12px_rgba(255,255,255,0.6)]" />
          <div className="absolute inset-[-12%] rounded-full border border-white/10" />
        </motion.div>
      </div>

      <div className="absolute bottom-28 left-10 z-20 pointer-events-auto">
        <h2 className="font-sans text-2xl text-white/85 tracking-wide mb-2 drop-shadow-lg">visualizer — midnight dome</h2>
        <div className="flex gap-2 text-[10px] font-mono text-[#7DE7E2]">
          <span className="border border-[#7DE7E2]/25 px-2 py-1 rounded bg-[#7DE7E2]/5">dream</span>
          <span className="border border-[#7DE7E2]/25 px-2 py-1 rounded bg-[#7DE7E2]/5">city</span>
          {track && <span className="border border-white/10 px-2 py-1 rounded text-white/30">{track.title.slice(0, 18)}</span>}
        </div>
      </div>

      <div className="absolute bottom-28 right-10 text-right pointer-events-none hidden md:block">
        <p className="text-[10px] tracking-[0.12em] uppercase text-white/20">audio-reactive</p>
        <p className="text-[11px] text-white/30 mt-1">bass → dome · treble → grid · beat → horizon</p>
      </div>

      <div id="visualizer-world" data-testid="visualizer-world" style={{ display: 'none' }} />
    </div>
  );
}
