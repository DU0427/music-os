'use client';

import { useEffect, useRef } from 'react';
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

/** 应用内不透明度：Mineradio 的应用内同样靠 state.opacity 压暗，避免抢内容焦点。 */
const FIELD_OPACITY = 0.34;

export default function AmbientDustField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const artworkUrl = useAudioStore((s) => s.track?.artworkUrl ?? null);
  const accent = useDominantColor(artworkUrl, '#f5f5f7');

  /* rAF 循环里读这两个 ref，避免因颜色/封面变化重建循环 */
  const accentRef = useRef(accent);
  accentRef.current = accent;
  const paletteRef = useRef(buildPalette(accent));
  const coverRef = useRef<{ src: string; image: HTMLImageElement | null }>({ src: '', image: null });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }
    const ctx = canvas.getContext('2d', { alpha: false });
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
      const target = Math.min(760, Math.max(420, Math.round((window.innerWidth * window.innerHeight) / 4200)));
      while (particles.length < target) {
        const index = particles.length + 1;
        particles.push({
          seed: index * 11.37,
          x: rand(index),
          y: rand(index * 2.7),
          lane: rand(index * 5.9),
          z: rand(index * 8.1),
          size: 0.6 + rand(index * 4.2) * 2.4,
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
    };

    const drawCover = (now: number) => {
      const desired = artworkUrl ?? '';
      const holder = coverRef.current;
      if (holder.src !== desired) {
        holder.src = desired;
        holder.image = null;
        if (desired) {
          const image = new Image();
          image.onload = () => {
            if (coverRef.current.src === desired) {
              coverRef.current.image = image;
            }
          };
          image.onerror = () => {
            if (coverRef.current.src === desired) {
              coverRef.current.image = null;
            }
          };
          image.src = desired;
        }
      }
      const image = holder.image;
      if (!image) {
        return;
      }
      const uiWidth = window.innerWidth;
      const uiHeight = window.innerHeight;
      const side = Math.min(uiWidth, uiHeight) * (0.42 + Math.sin(now * 0.21) * 0.012);
      const x = uiWidth * 0.5 - side * 0.5;
      const y = uiHeight * 0.5 - side * 0.5 + Math.sin(now * 0.37) * 8;
      ctx.save();
      ctx.globalAlpha = 0.14 * FIELD_OPACITY * 2;
      ctx.filter = 'blur(28px) saturate(1.2)';
      ctx.drawImage(image, x - side * 0.12, y - side * 0.12, side * 1.24, side * 1.24);
      ctx.filter = 'none';
      ctx.globalAlpha = 0.16 * FIELD_OPACITY * 2;
      ctx.drawImage(image, x, y, side, side);
      ctx.restore();
    };

    const draw = (nowMs: number) => {
      if (disposed) {
        return;
      }
      const now = nowMs * 0.001;
      const uiWidth = window.innerWidth;
      const uiHeight = window.innerHeight;
      ensureParticles();

      const palette = paletteRef.current;
      const metrics = useAudioStore.getState().metrics;
      const isPlaying = useAudioStore.getState().isPlaying;
      const boost = isPlaying ? 0.035 + metrics.beatPulse * 0.05 : 0;
      const speedBoost = isPlaying ? 0.010 + metrics.energy * 0.012 : 0;

      const background = ctx.createLinearGradient(0, 0, uiWidth, uiHeight);
      background.addColorStop(0, '#050608');
      background.addColorStop(0.52, mixWithBase(palette.primary, 0.1 * FIELD_OPACITY));
      background.addColorStop(1, mixWithBase(palette.secondary, 0.1 * FIELD_OPACITY));
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, uiWidth, uiHeight);

      drawCover(now);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const cx = uiWidth * 0.5;
      const cy = uiHeight * 0.5 + Math.sin(now * 0.28) * uiHeight * 0.018;
      const rx = uiWidth * 0.4;
      const ry = uiHeight * 0.3;

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        const speed = 0.009 + rand(p.seed) * 0.021 + speedBoost;
        const angle = (p.x * Math.PI * 2 + now * speed + Math.sin(now * 0.07 + p.seed) * 0.14) % (Math.PI * 2);
        const ring = 0.18 + p.z * 0.82;
        const wobble = Math.sin(now * (0.22 + rand(p.seed) * 0.18) + p.seed) * 12;
        const x = cx + Math.cos(angle) * rx * ring + Math.sin(now * 0.11 + p.seed) * 24;
        const y = cy + Math.sin(angle * (1 + rand(p.seed * 2) * 0.16)) * ry * ring + wobble;
        const twinkle = Math.pow(0.5 + 0.5 * Math.sin(now * (0.5 + rand(p.seed) * 0.42) + p.seed), 4);
        const radius = Math.max(0.7, p.size * (0.8 + twinkle * 1.2));
        ctx.globalAlpha = Math.min(1, (0.045 + twinkle * 0.18 + boost) * FIELD_OPACITY * 3.4);
        ctx.fillStyle = twinkle > 0.74 ? palette.highlight : p.lane > 0.55 ? palette.secondary : palette.primary;
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
    raf = requestAnimationFrame(draw);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearInterval(paletteTimer);
      window.removeEventListener('resize', resize);
    };
  }, [artworkUrl]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  );
}
