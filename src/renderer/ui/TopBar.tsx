import { motion, AnimatePresence } from 'motion/react';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useRuntimeStore } from '../store/runtime';

const SPACE_TITLE: Record<string, string> = {
  home: 'stage',
  library: 'library',
  memory: 'memory',
};

function NavIcon({ icon: Icon, label, onClick }: { icon: typeof Search; label: string; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="relative flex items-center justify-center pointer-events-auto"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <button className="text-white/40 hover:text-white/90 transition-colors p-2.5 relative group" aria-label={label}>
        <Icon className="w-4 h-4 stroke-[1.5]" />
        <div className="absolute inset-0 rounded-full border border-white/0 group-hover:border-white/5 group-hover:bg-white/5 transition-all" />
      </button>
      <AnimatePresence>
        {hovered && (
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

export default function TopBar({ onSearch }: { onSearch?: () => void }) {
  const currentSpace = useRuntimeStore((s) => s.currentSpace);

  return (
    <motion.header
      className="fixed top-0 left-0 w-full px-8 py-6 flex items-start justify-between pointer-events-none z-20"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 pointer-events-auto group">
        <div className="relative w-6 h-6 flex items-center justify-center">
          <motion.div
            className="absolute inset-[-2px] rounded-full border border-white/10"
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
        </div>
        <div className="font-sans font-medium text-[13px] text-white/80 group-hover:text-white transition-colors tracking-wide">
          music os
        </div>
      </div>

      {/* Center space title */}
      <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSpace}
            initial={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex flex-col items-center"
          >
            <div className="font-sans text-[13px] font-medium text-white/80 tracking-wide lowercase">
              {SPACE_TITLE[currentSpace] ?? currentSpace}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Right: search only */}
      <div className="flex items-center gap-1 relative">
        <NavIcon icon={Search} label="搜索" onClick={onSearch} />
      </div>
    </motion.header>
  );
}