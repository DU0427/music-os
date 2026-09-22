'use client';

import { useEffect, useState } from 'react';

/**
 * 首页纵向节奏：内容高度 ≈ FIXED_HEIGHT + SCALED_HEIGHT · s。
 * 2026-09-22 重标定（一屏预算，measure-home.cjs 两点实测拟合）：
 * 压缩后 content(s) ≈ 314 + 550.7 · s（900 档实测 841@s=0.957、700 档实测 651@s=0.612）。
 * 目标：s(900)=0.84 → content≈777 ≤ 792（900 档）；s(700)=0.45 → content≈590 ≤ 592（700 档，
 * 实测低 scale 下字号下限使内容比线性模型高约 14-20px，已按实测两点递推）。
 * 由 s(h)=(h-RESERVED)/SCALED 反解：SCALED=513、RESERVED=469；MIN_SCALE 降到 0.44 以放行 700 档。
 * 更矮窗口（<660px）触底后允许滚动条兜底。
 */
const FIXED_HEIGHT = 205;
const SCALED_HEIGHT = 513;
const RESERVED_HEIGHT = 469;
const MIN_SCALE = 0.44;

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
