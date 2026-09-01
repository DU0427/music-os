import { useEffect, useState } from 'react';
import type { TrackWorldContext } from '../../shared/ipc/music';

/**
 * 从封面图片提取主色 —— design-language-v2「单一动态强调色，随歌曲流动」。
 * 策略：8x8 降采样 → 过滤近黑(<lum25)/近白(>lum235)像素 → 其余取平均。
 * 失败（无封面/CORS/损坏）返回 null，由调用方回退。
 */
export function extractDominantColor(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const size = 8;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        if (!context) {
          resolve(null);
          return;
        }
        context.drawImage(image, 0, 0, size, size);
        const data = context.getImageData(0, 0, size, size).data;
        let rSum = 0;
        let gSum = 0;
        let bSum = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const lum = r * 0.2126 + g * 0.7152 + b * 0.0722;
          if (lum > 25 && lum < 235) {
            rSum += r;
            gSum += g;
            bSum += b;
            count += 1;
          }
        }
        if (count === 0) {
          resolve(null);
          return;
        }
        const toHex = (v: number) => Math.round(v).toString(16).padStart(2, '0');
        resolve(`#${toHex(rSum / count)}${toHex(gSum / count)}${toHex(bSum / count)}`);
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

/** 相对亮度（0-1），用于判断强调色上文字用深色还是浅色。 */
export function relativeLuminance(hex: string): number {
  const value = hex.replace('#', '');
  if (value.length !== 6) return 0.5;
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** 依据 worldContext.energyTarget 的稳定回退色（无封面时）。 */
export function energyTargetFallback(context: TrackWorldContext | null): string {
  if (context?.energyTarget === 'electric') return '#e8c28a';
  if (context?.energyTarget === 'calm') return '#a1a1a6';
  return '#f5f5f7';
}

/**
 * 订阅封面主色。url 为 null 或提取失败时返回 fallback。
 * 返回格式 '#rrggbb'。
 */
export function useDominantColor(url: string | null, fallback: string): string {
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!url) {
      setColor(null);
      return undefined;
    }
    void extractDominantColor(url).then((c) => {
      if (!cancelled) setColor(c);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return color ?? fallback;
}

/** 把 #rrggbb 转成 rgba 字符串，用于光晕/柔背景。 */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  if (value.length !== 6) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}