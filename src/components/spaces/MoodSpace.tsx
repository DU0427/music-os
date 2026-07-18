'use client';

import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import MusicPlanet from '../MusicPlanet';

export default function MoodSpace() {
  const { setCurrentSpace, activeMood, setActiveMood } = useAppStore();

  const moods = [
    { name: 'Night', angle: -90, radius: 250, size: 90, color: '#1A2980' },
    { name: 'Energy', angle: 0, radius: 250, size: 100, color: '#F0B56A' },
    { name: 'Calm', angle: 90, radius: 250, size: 80, color: '#78AFFF' },
    { name: 'Nostalgia', angle: 180, radius: 250, size: 85, color: '#EA8E83' },
  ];

  const handleMoodSelect = (mood: string) => {
    setActiveMood(activeMood === mood ? null : mood);
  };

  const getPos = (radius: number, angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: Math.cos(rad) * radius,
      y: Math.sin(rad) * radius
    }; // Circular distribution for mood space
  };

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
        
        {/* Large atmospheric glow */}
        <motion.div 
          className="absolute inset-0 transition-colors duration-1000 mix-blend-screen"
          style={{ 
            background: activeMood === 'Night' ? 'radial-gradient(circle at 50% 50%, rgba(26,41,128,0.3) 0%, transparent 80%)' :
                        activeMood === 'Energy' ? 'radial-gradient(circle at 50% 50%, rgba(240,181,106,0.2) 0%, transparent 80%)' :
                        activeMood === 'Calm' ? 'radial-gradient(circle at 50% 50%, rgba(120,175,255,0.2) 0%, transparent 80%)' :
                        activeMood === 'Nostalgia' ? 'radial-gradient(circle at 50% 50%, rgba(234,142,131,0.2) 0%, transparent 80%)' :
                        'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.02) 0%, transparent 80%)'
          }}
        />

        <div className="absolute inset-0 pointer-events-auto flex items-center justify-center">
          {moods.map((m) => (
            <MusicPlanet
              key={m.name}
              title={m.name}
              {...getPos(m.radius, m.angle)}
              size={m.size}
              color={m.color}
              glowing={activeMood === m.name}
              onClick={() => handleMoodSelect(m.name)}
            />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {activeMood && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-32 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none text-center z-40"
          >
            <div className="font-mono text-[10px] tracking-[0.4em] text-white/50 mb-2">CURRENT ENVIRONMENT</div>
            <h2 className="font-display text-4xl text-white/90 tracking-[0.2em] mb-4">{activeMood.toUpperCase()}</h2>
            <button className="px-8 py-3 rounded-full border border-white/20 bg-white/5 backdrop-blur-md text-white/90 font-display tracking-widest text-xs hover:bg-white/10 hover:border-white/40 transition-all pointer-events-auto shadow-2xl shadow-[var(--mood-color)]"
              style={{ '--mood-color': moods.find(m => m.name === activeMood)?.color + '40' } as any}
            >
              ENTER THIS SPACE
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
