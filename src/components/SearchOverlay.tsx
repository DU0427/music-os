'use client';

import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'motion/react';
import { Search as SearchIcon, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

export default function SearchOverlay() {
  const { isSearching, setIsSearching } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearching) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isSearching]);

  return (
    <AnimatePresence>
      {isSearching && (
        <motion.div 
          className="absolute inset-0 z-[100] flex flex-col items-center pt-32 pointer-events-auto"
          initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          animate={{ opacity: 1, backdropFilter: 'blur(16px)' }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          transition={{ duration: 0.5 }}
        >
          {/* Darken background further */}
          <div className="absolute inset-0 bg-space-black/60" onClick={() => setIsSearching(false)} />
          
          <motion.div 
            className="relative z-10 w-full max-w-2xl px-8"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, ease: "easeOut" }}
          >
            <div className="relative">
              <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-white/40" />
              <input 
                ref={inputRef}
                type="text" 
                placeholder="搜索你的播放世界..."
                className="w-full bg-glass-light border border-white/10 rounded-full py-5 pl-16 pr-12 text-white/90 placeholder:text-white/30 outline-none focus:border-electric-cyan/50 focus:shadow-[0_0_30px_rgba(125,231,226,0.15)] transition-all font-display tracking-wide text-lg"
              />
              <button 
                className="absolute right-6 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/90"
                onClick={() => setIsSearching(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-12 flex justify-center gap-4">
              {['热门', '轻音', '人声', '氛围', '夜景'].map((tag) => (
                <button 
                  key={tag}
                  className="px-4 py-2 rounded-full border border-white/10 text-white/50 text-xs font-mono hover:bg-white/5 hover:text-white/90 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
            
            {/* Mock search results visualization hint */}
            <div className="mt-16 text-center text-white/30 font-display text-sm tracking-widest">
              正在输入
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
