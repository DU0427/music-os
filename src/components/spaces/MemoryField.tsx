'use client';

import { useAppStore } from '@/lib/store';
import { motion } from 'motion/react';
import { ArrowLeft, Clock } from 'lucide-react';

export default function MemoryField() {
  const { setCurrentSpace, currentSong } = useAppStore();

  return (
    <div className="relative w-full h-full">
      <button 
        onClick={() => setCurrentSpace('home')}
        className="absolute top-8 left-8 z-50 flex items-center gap-2 text-white/50 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-display tracking-[0.2em] text-sm">BACK TO CORE</span>
      </button>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        
        {/* Memory Timeline Curve */}
        <svg className="absolute w-[120%] h-64 top-1/2 -translate-y-1/2 opacity-20" viewBox="0 0 1000 200" preserveAspectRatio="none">
          <path 
            d="M 0,100 C 250,200 750,0 1000,100" 
            fill="none" 
            stroke="var(--color-warm-amber)" 
            strokeWidth="2" 
          />
        </svg>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto flex gap-32">
          
          <motion.div 
            className="relative flex flex-col items-center group cursor-pointer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-3 h-3 rounded-full bg-warm-amber shadow-[0_0_15px_#F0B56A] mb-4" />
            <div className="glass-panel p-4 rounded-xl text-center w-48 opacity-50 group-hover:opacity-100 transition-opacity">
              <span className="font-mono text-xs text-white/50 block mb-1">2019.06.13</span>
              <span className="font-display text-sm text-white/90">First Encounter</span>
            </div>
          </motion.div>

          <motion.div 
            className="relative flex flex-col items-center group cursor-pointer -mt-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-4 h-4 rounded-full bg-electric-cyan shadow-[0_0_20px_#7DE7E2] mb-4" />
            <div className="glass-panel p-6 rounded-xl text-center w-64 border-electric-cyan/30">
              <span className="font-mono text-xs text-electric-cyan/80 block mb-2">Summer 2021</span>
              <h3 className="font-display text-lg text-white/90 mb-1">{currentSong.title}</h3>
              <p className="text-white/50 text-xs">Played 42 times in one week.</p>
            </div>
          </motion.div>

          <motion.div 
            className="relative flex flex-col items-center group cursor-pointer mt-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="w-3 h-3 rounded-full bg-white/50 shadow-[0_0_10px_rgba(255,255,255,0.5)] mb-4" />
            <div className="glass-panel p-4 rounded-xl text-center w-48 opacity-50 group-hover:opacity-100 transition-opacity">
              <span className="font-mono text-xs text-white/50 block mb-1">Now</span>
              <span className="font-display text-sm text-white/90">Rediscovered</span>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
