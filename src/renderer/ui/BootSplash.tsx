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
 * 与 Mineradio 的 5 秒 cinematic 启动页刻意不同：这里只保留「黑场 + 品牌呼吸点 + 细光扩张」，
 * 1.5-2.5 秒内自动退场，用途是遮住 IPC ready 与播放恢复的真实耗时，而不是要求点击进入。
 */
export default function BootSplash({ exiting, onSkip }: BootSplashProps) {
  const [phase, setPhase] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    const toWordmark = setTimeout(() => setPhase(1), 100);
    const toLine = setTimeout(() => setPhase(2), 380);
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
        background: 'var(--mo-bg)',
        cursor: onSkip ? 'pointer' : 'default',
        pointerEvents: exiting ? 'none' : 'auto',
      }}
      initial={{ opacity: 1 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="flex flex-col items-center"
        animate={exiting ? { scale: 1.012, filter: 'blur(6px)' } : { scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* 第一束光：品牌呼吸点 + wordmark */}
        <div className="flex items-center gap-3">
          <motion.span
            className="rounded-full"
            style={{
              width: 6,
              height: 6,
              background: 'rgba(245,245,247,0.85)',
              boxShadow: '0 0 14px rgba(245,245,247,0.55)',
            }}
            animate={{ scale: [1, 1.35, 1], opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.span
            style={{ fontSize: 28, fontWeight: 500, color: 'var(--mo-ink)' }}
            initial={{ opacity: 0, y: 8, filter: 'blur(8px)', letterSpacing: '0.14em' }}
            animate={
              phase >= 1
                ? { opacity: 1, y: 0, filter: 'blur(0px)', letterSpacing: '0.01em' }
                : { opacity: 0, y: 8, filter: 'blur(8px)', letterSpacing: '0.14em' }
            }
            transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
          >
            music os
          </motion.span>
        </div>

        {/* 细光扩张线 */}
        <motion.div
          className="mt-6"
          style={{
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(245,245,247,0.5), transparent)',
          }}
          initial={{ width: 0, opacity: 0 }}
          animate={phase >= 2 ? { width: 220, opacity: 1 } : { width: 0, opacity: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />

        <motion.div
          className="mt-3 font-mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: 'var(--mo-ink-faint)',
          }}
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 0.9 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          正在载入
        </motion.div>
      </motion.div>
    </motion.div>
  );
}