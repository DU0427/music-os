import { motion } from 'motion/react';
import { useAudioStore } from '../audio/store';

interface Props {
  onClick?: () => void;
  size?: number;
}

export default function CoreVisualDom({ onClick, size = 256 }: Props) {
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const track = useAudioStore((s) => s.track);
  const metrics = useAudioStore((s) => s.metrics);

  // derive colors from track.worldContext or fallback to prototype defaults
  const c1 = '#1A2980';
  const c2 = '#26D0CE';

  const energyPulse = 0.08 + metrics.energy * 0.12 + metrics.beatPulse * 0.06;

  return (
    <motion.div
      className="relative rounded-full flex items-center justify-center cursor-pointer group"
      style={{ width: size, height: size }}
      onClick={onClick}
      whileHover={{ scale: 1.04 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      {/* Volumetric aura */}
      <motion.div
        className="absolute inset-[-55%] rounded-full blur-[70px] mix-blend-screen pointer-events-none"
        style={{ background: `radial-gradient(circle, ${c1}55, transparent 62%)` }}
        animate={{
          scale: isPlaying ? [1, 1.14, 1] : [1, 1.05, 1],
          opacity: isPlaying ? [0.55, 0.78, 0.55] : [0.28, 0.42, 0.28],
        }}
        transition={{ duration: isPlaying ? 3.5 : 7, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Core sphere */}
      <div className="absolute inset-0 rounded-full overflow-hidden z-10 isolate">
        <div className="absolute inset-0 bg-[#02050A]" />

        <motion.div
          className="absolute inset-[-50%] opacity-80 blur-[22px]"
          style={{
            background: `conic-gradient(from 0deg at 50% 50%, ${c1}, ${c2}, ${c1}, #ffffff, ${c2}, ${c1})`,
          }}
          animate={{ rotate: isPlaying ? 360 : 60 }}
          transition={{ duration: isPlaying ? 14 : 36, repeat: Infinity, ease: 'linear' }}
        />

        <motion.div
          className="absolute inset-[-20%] opacity-70 blur-[14px] mix-blend-overlay"
          style={{
            background: `conic-gradient(from 180deg at 50% 50%, ${c2}, transparent, ${c1}, transparent, ${c2})`,
          }}
          animate={{ rotate: isPlaying ? -360 : -60 }}
          transition={{ duration: isPlaying ? 22 : 44, repeat: Infinity, ease: 'linear' }}
        />

        <motion.div
          className="absolute top-[10%] left-[10%] w-[80%] h-[80%] rounded-full blur-[18px] mix-blend-screen"
          style={{ background: `radial-gradient(circle, #ffffff, transparent 70%)` }}
          animate={{
            scale: isPlaying ? [1, 1.18, 0.92, 1] : [1, 1.05, 0.96, 1],
            x: isPlaying ? [0, 8, -8, 0] : 0,
            y: isPlaying ? [0, -8, 8, 0] : 0,
          }}
          transition={{ duration: isPlaying ? 2.8 : 6.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {isPlaying && (
          <motion.div className="absolute inset-0 flex items-center justify-center opacity-35 mix-blend-plus-lighter">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-[120%] h-[2px] bg-gradient-to-r from-transparent via-white to-transparent"
                style={{ rotate: `${i * 30}deg` }}
                animate={{ scaleX: [1, 1.5, 1], opacity: [0.25, 0.7, 0.25] }}
                transition={{ duration: 0.5 + i * 0.1, repeat: Infinity, ease: 'easeInOut', delay: i * 0.1 }}
              />
            ))}
          </motion.div>
        )}

        {/* audio-reactive extra glow */}
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            boxShadow: `inset 0 0 ${18 + energyPulse * 30}px rgba(110,168,255,${0.12 + energyPulse * 0.18})`,
          }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />

        <div className="absolute inset-0 rounded-full shadow-[inset_0_-20px_40px_rgba(0,0,0,0.8),inset_0_20px_40px_rgba(255,255,255,0.35)] pointer-events-none mix-blend-overlay" />
        <div className="absolute inset-0 rounded-full border border-white/15 pointer-events-none" />
        <div
          className="absolute top-[5%] left-[15%] w-[40%] h-[20%] rounded-[100%] blur-[3px] -rotate-12 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.55), transparent)' }}
        />
      </div>

      {/* playing indicator ring */}
      {isPlaying && (
        <motion.div
          className="absolute inset-[-10px] rounded-full border border-white/[0.07] pointer-events-none"
          animate={{ scale: [1, 1.06, 1], opacity: [0.08, 0.14, 0.08] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </motion.div>
  );
}
