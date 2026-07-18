'use client';

import { useAppStore } from '@/lib/store';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import MusicPlanet from '../MusicPlanet';

export default function LibraryGalaxy() {
  const { setCurrentSpace } = useAppStore();

  const categories = [
    { name: 'Indie', angle: -20, radius: 150, size: 80, color: '#78AFFF' },
    { name: 'Electronic', angle: 45, radius: 200, size: 100, color: '#7DE7E2' },
    { name: 'Jazz', angle: 120, radius: 180, size: 60, color: '#F0B56A' },
    { name: 'Rock', angle: 180, radius: 250, size: 70, color: '#EA8E83' },
    { name: 'Ambient', angle: 250, radius: 160, size: 90, color: '#B6A8D8' },
  ];

  const TILT = 45;
  const cosTilt = Math.cos((TILT * Math.PI) / 180);

  const getPos = (radius: number, angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: Math.cos(rad) * radius,
      y: Math.sin(rad) * radius * cosTilt
    };
  };

  return (
    <div className="relative w-full h-full">
      {/* Back Button */}
      <button 
        onClick={() => setCurrentSpace('home')}
        className="absolute top-8 left-8 z-50 flex items-center gap-2 text-white/50 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-display tracking-[0.2em] text-sm">BACK TO CORE</span>
      </button>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        
        {/* Galaxy Core */}
        <div className="w-96 h-96 rounded-full bg-blue-500/5 blur-[100px]" />

        <div className="absolute inset-0 pointer-events-auto flex items-center justify-center">
          {categories.map((cat) => (
            <MusicPlanet
              key={cat.name}
              title={cat.name}
              {...getPos(cat.radius, cat.angle)}
              size={cat.size}
              color={cat.color}
              onClick={() => {}}
            />
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-32 right-12 z-50 text-right">
        <h3 className="font-display text-white/80 tracking-widest text-sm mb-2">LIBRARY GALAXY</h3>
        <p className="font-body text-white/40 text-xs">5 Clusters Found</p>
      </div>
    </div>
  );
}
