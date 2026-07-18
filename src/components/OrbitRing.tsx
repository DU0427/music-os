'use client';

import { motion } from 'motion/react';
import { useAppStore } from '@/lib/store';

interface OrbitRingProps {
  size: number;
  opacity?: number;
  speed?: number;
  reverse?: boolean;
  tilt?: number;
}

export default function OrbitRing({ size, opacity = 0.1, speed = 20, reverse = false, tilt = 60 }: OrbitRingProps) {
  const { isPlaying } = useAppStore();
  const actualSpeed = isPlaying ? speed : speed * 3; // Slow down when paused

  return (
    <motion.div 
      className="absolute top-1/2 left-1/2 pointer-events-none rounded-full border border-white/5"
      initial={{ width: 0, height: 0, opacity: 0, x: '-50%', y: '-50%', rotateX: tilt }}
      animate={{ 
        width: size, 
        height: size, 
        opacity: opacity * 0.5,
        x: '-50%',
        y: '-50%',
        rotateX: tilt
      }}
      transition={{ duration: 2, ease: "easeOut", delay: 0.5 }}
      style={{ 
        borderStyle: 'solid',
        borderWidth: '1px',
        borderColor: `rgba(255,255,255,${opacity * 0.5})`
      }}
    >
      <motion.div 
        className="w-full h-full rounded-full"
        animate={{ rotateZ: reverse ? -360 : 360 }}
        transition={{ duration: actualSpeed, repeat: Infinity, ease: "linear" }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Tiny particle on the ring */}
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-[2px] bg-white/40 rounded-full shadow-[0_0_5px_rgba(255,255,255,0.3)]" 
          style={{ transform: `rotateX(${-tilt}deg)` }}
        />
      </motion.div>
    </motion.div>
  );
}
