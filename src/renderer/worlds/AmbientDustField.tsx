'use client';

import { useEffect, useRef, useState } from 'react';
import { useAudioStore } from '../audio/store';
import { useDominantColor } from '../hooks/useDominantColor';

/**
 * 背景星尘云（2D canvas）：
 * 机制参考 Mineradio 的 wallpaper（椭圆环带公转 + 四次方闪烁 + 加法混合 + 中心光晕 + 封面淡铺），
 * 但配色由当前封面主色推导（不照搬其青绿招牌色），并接入我们的节拍接管（beatPulse / isPlaying）。
 */

interface Dust {
  seed: number;
  x: number;
  y: number;
  lane: number;
  z: number;
  size: number;
}

/** accent → 三段柔光配色：primary（偏白）/ secondary（本体）/ highlight（提亮偏暖）。 */
function mix(hex: string, target: [number, number, number], amount: number): string {
  const value = hex.replace('#', '');
  if (value.length !== 6) {
    return `rgb(${target[0]},${target[1]},${target[2]})`;
  }
  const r = Math.round(parseInt(value.slice(0, 2), 16) + (target[0] - parseInt(value.slice(0, 2), 16)) * amount);
  const g = Math.round(parseInt(value.slice(2, 4), 16) + (target[1] - parseInt(value.slice(2, 4), 16)) * amount);
  const b = Math.round(parseInt(value.slice(4, 6), 16) + (target[2] - parseInt(value.slice(4, 6), 16)) * amount);
  return `rgb(${r},${g},${b})`;
}

function buildPalette(accent: string) {
  return {
    primary: mix(accent, [255, 255, 255], 0.6),
    secondary: mix(accent, [255, 255, 255], 0.24),
    highlight: mix(accent, [255, 246, 214], 0.72),
  };
}

function rgbaOf(rgb: string, alpha: number): string {
  const match = /rgb\((\d+),(\d+),(\d+)\)/.exec(rgb);
  if (!match) {
    return `rgba(245,245,247,${alpha})`;
  }
  return `rgba(${match[1]},${match[2]},${match[3]},${alpha})`;
}

const rand = (seed: number) => Math.abs(Math.sin(seed * 3187.917) * 43758.5453) % 1;

/** 与近黑底色预混合，得到不透明色（避免半透明背景导致逐帧累加饱和）。 */
function mixWithBase(rgb: string, amount: number): string {
  const match = /rgb\((\d+),(\d+),(\d+)\)/.exec(rgb);
  if (!match) {
    return '#050608';
  }
  const base = [5, 6, 8];
  const mixed = [0, 1, 2].map((i) => Math.round(base[i] + (Number(match[i + 1]) - base[i]) * amount));
  return `rgb(${mixed[0]},${mixed[1]},${mixed[2]})`;
}

/** 把封面降采样成 grid×grid 的像素色（播放时用来拼「封面点阵」）。 */
function sampleCoverPixels(image: HTMLImageElement, grid: number): Uint8ClampedArray | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = grid;
    canvas.height = grid;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }
    ctx.drawImage(image, 0, 0, grid, grid);
    return ctx.getImageData(0, 0, grid, grid).data;
  } catch {
    return null;
  }
}

/** 应用内不透明度：Mineradio 的应用内同样靠 state.opacity 压暗，避免抢内容焦点。 */
const FIELD_OPACITY = 0.5;

/**
 * 从封面取 5 个代表色（去掉近黑/近白），让尘埃像 Mineradio 一样是多色点阵而不是单色雾。
 * 返回 rgb 字符串数组；无封面时返回空数组（调用方回退到 accent 三色）。
 */
function sampleCoverPalette(image: HTMLImageElement): string[] {
  try {
    const size = 16;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return [];
    }
    ctx.drawImage(image, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    const buckets: Array<{ r: number; g: number; b: number; score: number }> = [];
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = r * 0.2126 + g * 0.7152 + b * 0.0722;
      if (lum <= 22 || lum >= 238) {
        continue;
      }
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      buckets.push({ r, g, b, score: saturation * 0.7 + (lum / 255) * 0.3 });
    }
    if (buckets.length === 0) {
      return [];
    }
    buckets.sort((a, b) => b.score - a.score);
    const picked: string[] = [];
    for (const bucket of buckets) {
      const tooClose = picked.some((existing) => {
        const match = /rgb\((\d+),(\d+),(\d+)\)/.exec(existing);
        if (!match) {
          return false;
        }
        const dr = Number(match[1]) - bucket.r;
        const dg = Number(match[2]) - bucket.g;
        const db = Number(match[3]) - bucket.b;
        return Math.sqrt(dr * dr + dg * dg + db * db) < 60;
      });
      if (!tooClose) {
        picked.push(`rgb(${bucket.r},${bucket.g},${bucket.b})`);
      }
      if (picked.length >= 5) {
        break;
      }
    }
    return picked;
  } catch {
    return [];
  }
}

export default function AmbientDustField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const artworkUrl = useAudioStore((s) => s.track?.artworkUrl ?? null);
  const accent = useDominantColor(artworkUrl, '#f5f5f7');

  /* rAF 循环里读这两个 ref，避免因颜色/封面变化重建循环 */
  const accentRef = useRef(accent);
  accentRef.current = accent;
  const paletteRef = useRef(buildPalette(accent));
  const coverRef = useRef<{ src: string; image: HTMLImageElement | null }>({ src: '', image: null });
  const coverPaletteRef = useRef<string[]>([]);
  const coverPixelsRef = useRef<{ grid: number; data: Uint8ClampedArray } | null>(null);
  const playMixRef = useRef(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) {
      return undefined;
    }

    let width = 1;
    let height = 1;
    let dpr = 1;
    let particles: Dust[] = [];
    let raf = 0;
    let disposed = false;

    const ensureParticles = () => {
      const target = Math.min(1800, Math.max(1200, Math.round((window.innerWidth * window.innerHeight) / 900)));
      while (particles.length < target) {
        const index = particles.length + 1;
        particles.push({
          seed: index * 11.37,
          x: rand(index),
          y: rand(index * 2.7),
          lane: rand(index * 5.9),
          z: rand(index * 8.1),
          size: 0.5 + rand(index * 4.2) * 1.1,
        });
      }
      if (particles.length > target + 80) {
        particles.length = target;
      }
    };

    const resize = () => {
      dpr = Math.min(1.25, Math.max(1, window.devicePixelRatio || 1));
      width = Math.max(1, Math.floor(window.innerWidth * dpr));
      height = Math.max(1, Math.floor(window.innerHeight * dpr));
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = [];
      ensureParticles();
      ensureCoverPalette();
    };

    /** 只负责给尘埃取色：加载封面并提取 5 色调色板（不再把封面本身画进背景）。 */
    const ensureCoverPalette = () => {
      const desired = artworkUrl ?? '';
      const holder = coverRef.current;
      if (holder.src === desired) {
        return;
      }
      holder.src = desired;
      holder.image = null;
      coverPaletteRef.current = [];
      coverPixelsRef.current = null;
      if (!desired) {
        return;
      }
      const image = new Image();
      image.onload = () => {
        if (coverRef.current.src === desired) {
          coverRef.current.image = image;
          // 与 Mineradio 一致：尘埃颜色取自封面本身（多彩），而不是单色雾
          coverPaletteRef.current = sampleCoverPalette(image);
          const pixels = sampleCoverPixels(image, 88);
          coverPixelsRef.current = pixels ? { grid: 88, data: pixels } : null;
        }
      };
      image.onerror = () => {
        if (coverRef.current.src === desired) {
          coverRef.current.image = null;
        }
      };
      image.src = desired;
    };

    const draw = (nowMs: number) => {
      if (disposed) {
        return;
      }
      const now = nowMs * 0.001;
      const uiWidth = window.innerWidth;
      const uiHeight = window.innerHeight;
      ensureParticles();
      ensureCoverPalette();

      const palette = paletteRef.current;
      const metrics = useAudioStore.getState().metrics;
      const isPlaying = useAudioStore.getState().isPlaying;
      const boost = isPlaying ? 0.035 + metrics.beatPulse * 0.05 : 0;
      const speedBoost = isPlaying ? 0.010 + metrics.energy * 0.012 : 0;

      // 播放时把「封面点阵」淡入（暂停时淡出），同时压暗环境尘埃给点阵让位
      // 测试缝隙：window.__moForcePainting = true 可强制进入点阵态（供自动化截图验证）
      const forced = typeof window !== 'undefined' && Boolean((window as unknown as Record<string, unknown>).__moForcePainting);
      playMixRef.current += ((isPlaying || forced ? 1 : 0) - playMixRef.current) * 0.07;
      const playMix = playMixRef.current;

      // 透明层：黑场由 R3F 提供，这里只画尘埃（否则会盖住封面光点画）
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, uiWidth, uiHeight);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const cx = uiWidth * 0.5;
      const cy = uiHeight * 0.5 + Math.sin(now * 0.28) * uiHeight * 0.018;
      const rx = uiWidth * 0.4;
      const ry = uiHeight * 0.3;

      /* 封面点阵：播放时用粒子（取自封面像素色）拼出封面，并随节拍产生径向波纹 */
      const painting = coverPixelsRef.current;
      if (painting && playMix > 0.01) {
        const grid = painting.grid;
        const side = Math.min(uiWidth * 0.62, uiHeight * 0.86);
        const cell = side / grid;
        const radius = Math.max(0.8, cell * 0.36);
        const originX = uiWidth * 0.5 - side * 0.5;
        const originY = uiHeight * 0.5 - side * 0.5 + Math.sin(now * 0.3) * 6;
        const wave = (metrics.beatPulse * 0.85 + metrics.bass * 0.4) * 9;
        for (let gy = 0; gy < grid; gy += 1) {
          for (let gx = 0; gx < grid; gx += 1) {
            const index = (gy * grid + gx) * 4;
            const r = painting.data[index];
            const g = painting.data[index + 1];
            const b = painting.data[index + 2];
            const lum = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
            if (lum < 0.025) {
              continue;
            }
            const px = originX + (gx + 0.5) * cell;
            const py = originY + (gy + 0.5) * cell;
            const dx = px - uiWidth * 0.5;
            const dy = py - uiHeight * 0.5;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            // 边缘柔化：按方形边界（而不是到中心的距离）淡出，四边才不会硬切
            const edge = Math.max(Math.abs(dx), Math.abs(dy)) / (side * 0.5);
            const edgeFade = Math.max(0, 1 - Math.max(0, edge - 0.7) / 0.3);
            const ripple = Math.sin(dist * 0.05 - now * 4.6) * wave;
            ctx.globalAlpha = Math.min(1, playMix * (0.2 + lum * 0.5) * edgeFade);
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.beginPath();
            ctx.arc(px + (dx / dist) * ripple, py + (dy / dist) * ripple, radius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        const speed = 0.009 + rand(p.seed) * 0.021 + speedBoost;
        const angle = (p.x * Math.PI * 2 + now * speed + Math.sin(now * 0.07 + p.seed) * 0.14) % (Math.PI * 2);
        const ring = 0.18 + p.z * 0.82;
        const wobble = Math.sin(now * (0.22 + rand(p.seed) * 0.18) + p.seed) * 12;
        const x = cx + Math.cos(angle) * rx * ring + Math.sin(now * 0.11 + p.seed) * 24;
        const y = cy + Math.sin(angle * (1 + rand(p.seed * 2) * 0.16)) * ry * ring + wobble;
        const twinkle = Math.pow(0.5 + 0.5 * Math.sin(now * (0.5 + rand(p.seed) * 0.42) + p.seed), 4);
        const radius = Math.max(0.5, p.size * (0.75 + twinkle * 0.9));
        ctx.globalAlpha = Math.min(1, (0.045 + twinkle * 0.18 + boost) * FIELD_OPACITY * 2.2 * (1 - playMix * 0.55));
        const coverPalette = coverPaletteRef.current;
        ctx.fillStyle =
          coverPalette.length > 0
            ? coverPalette[Math.floor(rand(p.seed * 1.7) * coverPalette.length) % coverPalette.length]
            : twinkle > 0.74
              ? palette.highlight
              : p.lane > 0.55
                ? palette.secondary
                : palette.primary;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      const aura = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(uiWidth, uiHeight) * 0.54);
      aura.addColorStop(0, rgbaOf(palette.highlight, (0.1 + metrics.beatPulse * 0.06) * FIELD_OPACITY));
      aura.addColorStop(0.34, rgbaOf(palette.secondary, 0.07 * FIELD_OPACITY));
      aura.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, uiWidth, uiHeight);
      ctx.restore();

      raf = requestAnimationFrame(draw);
    };

    /* accent 变化时重建配色（每帧解析十六进制没必要） */
    const paletteTimer = window.setInterval(() => {
      const next = buildPalette(accentRef.current);
      paletteRef.current = next;
    }, 800);

    window.addEventListener('resize', resize);
    resize();
    const fadeIn = window.setTimeout(() => setVisible(true), 60);
    raf = requestAnimationFrame(draw);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearInterval(paletteTimer);
      window.clearTimeout(fadeIn);
      window.removeEventListener('resize', resize);
    };
  }, [artworkUrl]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        opacity: visible ? 1 : 0,
        transition: 'opacity 1200ms var(--mo-ease)',
      }}
    />
  );
}
