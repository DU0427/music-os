'use client';

import { useEffect, useState } from 'react';

/**
 * 首页纵向节奏：内容高度 ≈ FIXED_HEIGHT + SCALED_HEIGHT · s。
 * 三个窗口实测标定（900/800/700 高 → 内容 760/660/576），固定部分是字形行高与
 * 不参与缩放的文本间距，可缩放部分是封面、唱盘与留白。
 * RESERVED_HEIGHT = 左下入口保留区 + 固定项 + 安全余量（波峰起伏仍不压线）。
 */
const FIXED_HEIGHT = 205;
const SCALED_HEIGHT = 580;
const RESERVED_HEIGHT = 345;
const MIN_SCALE = 0.55;

/**
 * 按视口高度整体缩放首页纵向节奏：高窗口铺满，矮窗口等比压缩，
 * 保证三带内容始终不与顶部 HUD、左下入口抢位置，也不需要可见滚动条。
 */
export function useStageScale(): number {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const update = () => {
      const available = window.innerHeight - RESERVED_HEIGHT;
      setScale(Math.min(1, Math.max(MIN_SCALE, available / SCALED_HEIGHT)));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return scale;
}
