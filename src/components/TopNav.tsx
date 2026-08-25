'use client';

import { useAppStore } from '@/lib/store';
import { MOCK_SPACES } from '@/lib/mock-data';
import { Search, AudioLines, User, Disc } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';

function NavIcon({ icon: Icon, label }: { icon: any, label: string }) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div 
      className="relative flex items-center justify-center pointer-events-auto"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button className="text-white/40 hover:text-white/90 transition-colors p-2.5 relative group">
        <Icon className="w-4 h-4 stroke-[1.5]" />
        {/* Soft glass hover state */}
        <div className="absolute inset-0 rounded-full border border-white/0 group-hover:border-white/5 group-hover:bg-white/5 transition-all" />
      </button>
      
      <AnimatePresence>
        {isHovered && (
          <motion.div 
            className="absolute top-12 pointer-events-none text-[11px] font-sans text-white/50 whitespace-nowrap"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TopNav() {
  const { currentSpace, activeMood, setIsSearching, isImmersive } = useAppStore();
  const spaceInfo = MOCK_SPACES.find(s => s.id === currentSpace);

  return (
    <AnimatePresence>
      {!isImmersive && (
        <motion.header 
          className="fixed top-0 left-0 w-full px-10 py-8 flex items-start justify-between pointer-events-none z-50"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.8 }}
        >
          {/* Brand */}
          <div className="flex items-center gap-3 pointer-events-auto group">
            <div className="relative w-6 h-6 flex items-center justify-center">
              {/* Soft rotating ring */}
              <motion.div 
                className="absolute inset-[-2px] rounded-full border border-white/10"
                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
            </div>
            <div className="font-sans font-medium text-[13px] text-white/80 group-hover:text-white transition-colors">
              音乐宇宙 OS
            </div>
          </div>

          {/* Center Space Title */}
          <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSpace + (activeMood || '')}
                initial={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="flex flex-col items-center"
              >
                <div className="font-sans text-[13px] font-medium text-white/80 tracking-wide">
                  {spaceInfo?.title}{activeMood ? ` · ${activeMood}` : ''}
                </div>
                {/* Soft breathing status light */}
                <motion.div 
                  className="mt-3 w-1.5 h-1.5 rounded-full bg-primary-blue shadow-[0_0_12px_rgba(110,168,255,0.8)]"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1">
            <div className="pointer-events-auto" onClick={() => setIsSearching(true)}>
               <NavIcon icon={Search} label="搜索" />
            </div>
            <NavIcon icon={AudioLines} label="设备" />
            <NavIcon icon={User} label="用户" />
          </div>
        </motion.header>
      )}
    </AnimatePresence>
  );
}

