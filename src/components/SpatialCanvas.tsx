'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { motion } from 'motion/react';

export default function SpatialCanvas() {
  const { currentSpace, activeMood, isPlaying, isImmersive } = useAppStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Background colors based on space/mood
  const getGradient = () => {
    if (currentSpace === 'mood') {
      if (activeMood === 'Night') return 'radial-gradient(circle at 50% 50%, #030610 0%, #010206 100%)';
      if (activeMood === 'Energy') return 'radial-gradient(circle at 50% 50%, #150912 0%, #050205 100%)';
      if (activeMood === 'Calm') return 'radial-gradient(circle at 50% 50%, #040D15 0%, #010408 100%)';
      if (activeMood === 'Nostalgia') return 'radial-gradient(circle at 50% 50%, #120A04 0%, #040201 100%)';
      return 'radial-gradient(circle at 50% 50%, #060B14 0%, #020408 100%)';
    }
    if (currentSpace === 'visualizer') return 'radial-gradient(circle at 50% 50%, #080F1A 0%, #020408 100%)';
    if (currentSpace === 'library') return 'radial-gradient(circle at 50% 50%, #050810 0%, #020306 100%)';
    return 'radial-gradient(circle at 50% 50%, #050A14 0%, #010308 100%)';
  };

  // Simple canvas particle system for stars/dust
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: { x: number; y: number; z: number; s: number; a: number; vx: number; vy: number }[] = [];
    
    // Parallax
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let targetX = mouseX;
    let targetY = mouseY;

    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const numParticles = 60; // Soft spatial dust
      for (let i = 0; i < numParticles; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          z: Math.random() * 4 + 1, // depth
          s: Math.random() * 1.5 + 0.5, // size
          a: Math.random() * 0.4 + 0.05, // alpha
          vx: (Math.random() - 0.5) * 0.02,
          vy: (Math.random() - 0.5) * 0.02,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const speedMult = (isPlaying ? 1.2 : 0.4) * (activeMood === 'Energy' ? 1.5 : 1) * (activeMood === 'Night' ? 0.3 : 1);
      
      mouseX += (targetX - mouseX) * 0.03;
      mouseY += (targetY - mouseY) * 0.03;
      const pX = (mouseX - canvas.width / 2) * 0.015;
      const pY = (mouseY - canvas.height / 2) * 0.015;

      particles.forEach(p => {
        p.x += p.vx * speedMult;
        p.y += p.vy * speedMult;
        
        if (p.x < -100) p.x = canvas.width + 100;
        if (p.x > canvas.width + 100) p.x = -100;
        if (p.y < -100) p.y = canvas.height + 100;
        if (p.y > canvas.height + 100) p.y = -100;

        // Apply depth-based parallax offset
        const drawX = p.x - pX / p.z;
        const drawY = p.y - pY / p.z;

        ctx.beginPath();
        ctx.arc(drawX, drawY, p.s, 0, Math.PI * 2);
        // fade out slightly if very far (high z), but make close stars brighter
        const depthAlpha = p.a * (1 / Math.sqrt(p.z));
        ctx.fillStyle = `rgba(110, 168, 255, ${Math.min(0.6, depthAlpha)})`; // Slight primary blue tint
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [currentSpace, activeMood, isPlaying]);

  return (
    <motion.div 
      className="absolute inset-0 pointer-events-none transition-colors duration-1000 z-0"
      style={{ background: getGradient() }}
      animate={{
        scale: isImmersive ? 1.05 : 1,
        filter: isImmersive ? 'brightness(0.7)' : 'brightness(1)'
      }}
      transition={{ duration: 2, ease: "easeInOut" }}
    >
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full opacity-70"
      />
      
      {/* Fog / Nebula Layers for Depth */}
      <motion.div 
        className="absolute inset-[-20%] mix-blend-screen opacity-20 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 40% 60%, rgba(110, 168, 255, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 30%, rgba(181, 140, 255, 0.1) 0%, transparent 40%)'
        }}
        animate={{
          scale: [1, 1.05, 1],
          rotate: [0, 5, -5, 0]
        }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Weak radial light field in center */}
      {!isImmersive && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(110,168,255,0.03)_0%,_transparent_50%)] pointer-events-none" />
      )}
    </motion.div>
  );
}
