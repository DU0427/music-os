import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

interface BootSplashProps {
  /** 退出态：淡出 + 轻微放大 + 失焦，让舞台从黑色中浮现。 */
  exiting: boolean;
  /** 点击任意处跳过。 */
  onSkip?: () => void;
}

/**
 * 启动 curtain（design-language-v2：黑场舞台、封面是唯一光源）。
 * 与 Mineradio 的 5 秒 cinematic 启动页刻意不同：保留单色克制，但需要足够大的品牌尺度与
 * 时长，让开场能被「看见」：大字号 wordmark 落定 + 细光扩张 + 一道扫光，然后自动揭幕。
 */
export default function BootSplash({ exiting, onSkip }: BootSplashProps) {
  const [phase, setPhase] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    const toWordmark = setTimeout(() => setPhase(1), 80);
    const toLine = setTimeout(() => setPhase(2), 520);
    return () => {
      clearTimeout(toWordmark);
      clearTimeout(toLine);
    };
  }, []);

  return (
    <motion.div
      aria-hidden
      onClick={onSkip}
      className="fixed inset-0 grid place-items-center"
      style={{
        zIndex: 200,
        background: 'radial-gradient(120% 85% at 50% 44%, #0b0b0e 0%, #050507 58%, #030304 100%)',
        cursor: onSkip ? 'pointer' : 'default',
        pointerEvents: exiting ? 'none' : 'auto',
      }}
      initial={{ opacity: 1 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="flex flex-col items-center"
        animate={exiting ? { scale: 1.015, filter: 'blur(7px)' } : { scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* 第一束光：品牌呼吸点 + 大字号 wordmark */}
        <div className="flex items-center gap-4">
          <motion.span
            className="rounded-full"
            style={{
              width: 8,
              height: 8,
              background: 'rgba(245,245,247,0.9)',
              boxShadow: '0 0 18px rgba(245,245,247,0.65), 0 0 60px rgba(245,245,247,0.22)',
            }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.span
            style={{ fontSize: 'clamp(40px, 6.2vw, 64px)', fontWeight: 500, color: 'var(--mo-ink)' }}
            initial={{ opacity: 0, y: 14, filter: 'blur(14px)', letterSpacing: '0.26em' }}
            animate={
              phase >= 1
                ? { opacity: 1, y: 0, filter: 'blur(0px)', letterSpacing: '0.04em' }
                : { opacity: 0, y: 14, filter: 'blur(14px)', letterSpacing: '0.26em' }
            }
            transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
          >
            music os
          </motion.span>
        </div>

        {/* 细光扩张线 + 单道扫光 */}
        <motion.div
          className="relative mt-8"
          style={{ height: 1, width: 'min(520px, 62vw)' }}
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(245,245,247,0.5), transparent)',
              transformOrigin: 'center',
            }}
            initial={{ scaleX: 0 }}
            animate={phase >= 2 ? { scaleX: 1 } : { scaleX: 0 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, transparent 45%, rgba(255,255,255,0.9) 50%, transparent 55%)',
            }}
            initial={{ x: '-100%', opacity: 0 }}
            animate={phase >= 2 ? { x: '100%', opacity: [0, 0.9, 0] } : { x: '-100%', opacity: 0 }}
            transition={{ duration: 1.6, delay: 0.5, ease: 'easeInOut' }}
          />
        </motion.div>

        <motion.div
          className="mt-4 font-mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: 'var(--mo-ink-muted)',
          }}
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 0.9 } : { opacity: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
        >
          正在载入
        </motion.div>
      </motion.div>
    </motion.div>
  );
}