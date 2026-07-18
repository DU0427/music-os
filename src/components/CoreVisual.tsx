import { motion } from 'motion/react';
import { useAppStore } from '@/lib/store';

interface CoreVisualProps {
  layoutId?: string;
  onClick?: () => void;
}

export default function CoreVisual({ layoutId, onClick }: CoreVisualProps) {
  const { currentSong, isPlaying } = useAppStore();
  const c1 = currentSong.coverGradient[0];
  const c2 = currentSong.coverGradient[1];

  return (
    <motion.div 
      className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-full flex items-center justify-center transition-transform duration-1000 ease-out cursor-pointer group"
      onClick={onClick}
      layoutId={layoutId}
      whileHover={{ scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      {/* Massive Volumetric Aura */}
      <motion.div 
        className="absolute inset-[-60%] rounded-full blur-[80px] mix-blend-screen pointer-events-none"
        style={{ background: `radial-gradient(circle, ${c1}50, transparent 60%)` }}
        animate={{ 
          scale: isPlaying ? [1, 1.15, 1] : [1, 1.05, 1],
          opacity: isPlaying ? [0.6, 0.8, 0.6] : [0.3, 0.5, 0.3]
        }}
        transition={{ duration: isPlaying ? 4 : 8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* The Core Energy Sphere */}
      <div className="absolute inset-0 rounded-full overflow-hidden z-10 isolate">
        
        {/* Deep Space Background */}
        <div className="absolute inset-0 bg-[#02050A]" />

        {/* Dynamic Fluid Gradients (Simulated with rotating blurred conic) */}
        <motion.div 
          className="absolute inset-[-50%] opacity-80 blur-[25px]"
          style={{ 
            background: `conic-gradient(from 0deg at 50% 50%, ${c1}, ${c2}, ${c1}, #ffffff, ${c2}, ${c1})` 
          }}
          animate={{ rotate: isPlaying ? 360 : 60 }}
          transition={{ duration: isPlaying ? 15 : 40, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Inner Counter-Rotating Plasma */}
        <motion.div 
          className="absolute inset-[-20%] opacity-70 blur-[15px] mix-blend-overlay"
          style={{ 
            background: `conic-gradient(from 180deg at 50% 50%, ${c2}, transparent, ${c1}, transparent, ${c2})` 
          }}
          animate={{ rotate: isPlaying ? -360 : -60 }}
          transition={{ duration: isPlaying ? 25 : 50, repeat: Infinity, ease: "linear" }}
        />

        {/* Organic Core Pulsing Blob */}
        <motion.div 
          className="absolute top-[10%] left-[10%] w-[80%] h-[80%] rounded-full blur-[20px] mix-blend-screen"
          style={{ background: `radial-gradient(circle, #ffffff, transparent 70%)` }}
          animate={{ 
            scale: isPlaying ? [1, 1.2, 0.9, 1] : [1, 1.05, 0.95, 1],
            x: isPlaying ? [0, 10, -10, 0] : 0,
            y: isPlaying ? [0, -10, 10, 0] : 0
          }}
          transition={{ duration: isPlaying ? 3 : 7, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Audio Reactive Starburst (Abstract) */}
        {isPlaying && (
          <motion.div 
            className="absolute inset-0 flex items-center justify-center opacity-40 mix-blend-plus-lighter"
          >
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-[120%] h-[2px] bg-gradient-to-r from-transparent via-white to-transparent"
                style={{ rotate: `${i * 30}deg` }}
                animate={{ 
                  scaleX: [1, 1.5, 1],
                  opacity: [0.3, 0.8, 0.3]
                }}
                transition={{ 
                  duration: 0.5 + (i * 0.1), 
                  repeat: Infinity, 
                  ease: "easeInOut",
                  delay: (i * 0.1)
                }}
              />
            ))}
          </motion.div>
        )}

        {/* 3D Sphere Shading / Glass Edge */}
        <div className="absolute inset-0 rounded-full shadow-[inset_0_-20px_40px_rgba(0,0,0,0.8),inset_0_20px_40px_rgba(255,255,255,0.4)] pointer-events-none mix-blend-overlay" />
        <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />
        
        {/* Premium Specular Highlight */}
        <div className="absolute top-[5%] left-[15%] w-[40%] h-[20%] rounded-[100%] bg-white/30 blur-[4px] -rotate-12 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.6), transparent)' }} />
      </div>
    </motion.div>
  );
}
