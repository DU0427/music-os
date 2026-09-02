import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferGeometry, CanvasTexture, Color, Float32BufferAttribute, TextureLoader } from 'three';
import type { PointsMaterial } from 'three';
import { useAudioStore } from '../audio/store';
import { useRuntimeStore } from '../store/runtime';
import type { TrackIdentity } from '../../shared/ipc/music';

/* ————————————————————————————————
   CoverParticleField v2
   两种模式：
   · 有封面  → 56×56 网格，粒子取封面对应像素色，形成「封面光点画」（MineRadio 思路克制版）
   · 无封面  → 散点星尘（无网格阵），柔和亮白/微冷暖色，不脏不噪
   关键：点径远小于网格间距（避免「纱窗/半调」噪点）；无封面用散点而非密网格。
   ———————————————————————————————— */

// —— 封面模式：网格采样 ——
const GRID = 56;
const GRID_COUNT = GRID * GRID;
const PLANE_W = 8.2;
const PLANE_H = 8.2;
// 点径 ≈ 0.6×网格间距，留出呼吸感，不糊成一片
const GRID_SPACING = PLANE_W / (GRID - 1);
const COVER_SIZE = GRID_SPACING * 0.62;

// —— 无封面模式：散点星尘 ——
const AMBIENT_COUNT = 620;
const AMBIENT_SIZE = 0.055;

const NO_TRACK_RGB = new Color('#0A0A0C');

function energyTone(track: TrackIdentity | null): Color {
  if (!track) {
    return NO_TRACK_RGB;
  }
  const target = track.worldContext?.energyTarget;
  if (target === 'calm') return new Color('#78AFFF');
  if (target === 'electric') return new Color('#EA8E83');
  return new Color('#1A2980');
}

// 圆形柔光贴图：中心亮、边缘透明，让粒子呈柔和光点而非方块
function makeGlowTexture(): CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.28, 'rgba(255,255,255,0.82)');
    gradient.addColorStop(0.62, 'rgba(255,255,255,0.26)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    context.fill();
  }
  const texture = new CanvasTexture(canvas);
  texture.minFilter = 0x2600; // LinearMipmapLinearFilter
  texture.magFilter = 0x2601; // LinearFilter
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function pseudoRandom(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

// —— 封面网格位置：平面均布 + 较大抖动打散格子阵；z 浅景深 ——
function gridPositions(): Float32Array {
  const positions = new Float32Array(GRID_COUNT * 3);
  const step = PLANE_W / (GRID - 1);
  for (let gx = 0; gx < GRID; gx += 1) {
    for (let gy = 0; gy < GRID; gy += 1) {
      const index = gy * GRID + gx;
      const x = (gx - (GRID - 1) / 2) * step;
      const y = (gy - (GRID - 1) / 2) * step;
      positions[index * 3] = x + (pseudoRandom(index + 1) - 0.5) * 0.22;
      positions[index * 3 + 1] = y + (pseudoRandom(index + 101) - 0.5) * 0.22;
      positions[index * 3 + 2] = -((index % 7) / 7) * 0.5;
    }
  }
  return positions;
}

// —— 无封面散点位置：柔和椭圆盘内随机散布（无网格阵） ——
function scatterPositions(): Float32Array {
  const positions = new Float32Array(AMBIENT_COUNT * 3);
  const spread = PLANE_W * 0.62;
  for (let i = 0; i < AMBIENT_COUNT; i += 1) {
    const angle = pseudoRandom(i + 7) * Math.PI * 2;
    const radius = Math.sqrt(pseudoRandom(i + 13)) * spread;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = Math.sin(angle) * radius * 0.7;
    positions[i * 3 + 2] = -pseudoRandom(i + 19) * 2.2;
  }
  return positions;
}

// 从封面降采样网格取每个像素色
function artworkColors(image: HTMLImageElement | HTMLCanvasElement): Float32Array {
  const canvas = document.createElement('canvas');
  canvas.width = GRID;
  canvas.height = GRID;
  const context = canvas.getContext('2d');
  const colors = new Float32Array(GRID_COUNT * 3);
  if (!context) {
    return colors;
  }
  context.drawImage(image, 0, 0, GRID, GRID);
  const data = context.getImageData(0, 0, GRID, GRID).data;
  for (let index = 0; index < GRID_COUNT; index += 1) {
    const pixel = index * 4;
    colors[index * 3] = data[pixel] / 255;
    colors[index * 3 + 1] = data[pixel + 1] / 255;
    colors[index * 3 + 2] = data[pixel + 2] / 255;
  }
  return colors;
}

// 无封面兜底：柔和亮白 + 微冷暖色散的星尘（暗色在加法混合下会发暗淡点，故用亮色系）
function scatterColors(): Float32Array {
  const colors = new Float32Array(AMBIENT_COUNT * 3);
  const warm = new Color('#e8d5b0');
  const cool = new Color('#b9c3d0');
  const white = new Color('#ffffff');
  for (let index = 0; index < AMBIENT_COUNT; index += 1) {
    const t = pseudoRandom(index + 29);
    const base = t < 0.5 ? warm : cool;
    const core = base.clone().lerp(white, 0.35 + pseudoRandom(index + 31) * 0.55);
    // 亮度随随机数起伏，制造「闪烁点缀」而非均匀噪点
    const brightness = 0.55 + pseudoRandom(index + 37) * 0.45;
    colors[index * 3] = core.r * brightness;
    colors[index * 3 + 1] = core.g * brightness;
    colors[index * 3 + 2] = core.b * brightness;
  }
  return colors;
}

interface ParticleData {
  positions: Float32Array;
  colors: Float32Array;
}

export default function CoverParticleField() {
  const currentSpace = useRuntimeStore((s) => s.currentSpace);
  const track = useAudioStore((s) => s.track);
  const canPlay = useAudioStore((s) => s.canPlay);
  const [coverData, setCoverData] = useState<ParticleData | null>(null);
  const [hasArtwork, setHasArtwork] = useState<boolean>(false);

  const artworkUrl = track?.artworkUrl ?? null;

  const glowTexture = useMemo(() => makeGlowTexture(), []);
  useEffect(() => {
    return () => {
      glowTexture.dispose();
    };
  }, [glowTexture]);

  useEffect(() => {
    if (!artworkUrl) {
      setHasArtwork(false);
      setCoverData(null);
      return;
    }
    let disposed = false;
    const loader = new TextureLoader();
    loader.load(
      artworkUrl,
      (texture) => {
        if (disposed) {
          texture.dispose();
          return;
        }
        const image = texture.image as HTMLImageElement | HTMLCanvasElement;
        const colors = artworkColors(image);
        texture.dispose();
        if (!disposed) {
          setHasArtwork(true);
          setCoverData({ positions: gridPositions(), colors });
        }
      },
      undefined,
      () => {
        if (!disposed) {
          setHasArtwork(false);
          setCoverData(null);
        }
      },
    );
    return () => {
      disposed = true;
    };
  }, [artworkUrl]);

  const data = useMemo<ParticleData>(() => {
    if (hasArtwork && coverData) {
      return coverData;
    }
    return {
      positions: scatterPositions(),
      colors: scatterColors(),
    };
  }, [hasArtwork, coverData]);

  const geometry = useMemo(() => new BufferGeometry(), []);

  useEffect(() => {
    geometry.setAttribute('position', new Float32BufferAttribute(data.positions, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(data.colors, 3));
    geometry.attributes.position.needsUpdate = true;
    if (geometry.attributes.color) {
      geometry.attributes.color.needsUpdate = true;
    }
    return () => {
      geometry.deleteAttribute('position');
      geometry.deleteAttribute('color');
    };
  }, [data, geometry]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  const materialRef = useRef<PointsMaterial>(null);
  // 律动基准：原始位置 + 每粒子随机抖动方向 + 随机相位（用于错峰跳动）
  const basePositionsRef = useRef<Float32Array | null>(null);
  const jitterDirRef = useRef<Float32Array | null>(null);
  const phaseRef = useRef<Float32Array | null>(null);

  const particleCount = hasArtwork ? GRID_COUNT : AMBIENT_COUNT;

  useEffect(() => {
    basePositionsRef.current = data.positions.slice();
    const dir = new Float32Array(particleCount * 3);
    const phase = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i += 1) {
      // 随机单位方向（归一化）
      const rx = pseudoRandom(i * 3 + 1) * 2 - 1;
      const ry = pseudoRandom(i * 3 + 2) * 2 - 1;
      const rz = pseudoRandom(i * 3 + 3) * 2 - 1;
      const len = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1;
      dir[i * 3] = rx / len;
      dir[i * 3 + 1] = ry / len;
      dir[i * 3 + 2] = rz / len;
      phase[i] = pseudoRandom(i * 5 + 11);
    }
    jitterDirRef.current = dir;
    phaseRef.current = phase;
    // 复位到基准
    const attrs = geometry.attributes.position;
    if (attrs) {
      attrs.array.set(data.positions);
      attrs.needsUpdate = true;
    }
  }, [data, particleCount, geometry]);

  useFrame(() => {
    if (currentSpace !== 'home' && currentSpace !== 'library') {
      return;
    }
    const metrics = useAudioStore.getState().metrics;
    const isPlaying = useAudioStore.getState().isPlaying;
    const material = materialRef.current;
    if (!material) {
      return;
    }

    const beat = metrics.beatPulse;
    const bass = metrics.bass;
    const treble = metrics.treble;
    const energy = metrics.energy;

    // 律动强度：由节拍脉冲 + 低音驱动（尖锐、随节奏弹跳，而非缓慢「呼吸」）
    const dance = isPlaying ? beat * 0.95 + bass * 0.3 : 0;
    const amp = hasArtwork ? 0.12 : 0.3;

    const base = basePositionsRef.current;
    const dir = jitterDirRef.current;
    const phase = phaseRef.current;
    const attrs = geometry.attributes.position;
    if (base && dir && phase && attrs) {
      const pos = attrs.array as Float32Array;
      const count = particleCount;
      for (let i = 0; i < count; i += 1) {
        const p = phase[i];
        // 错峰：每粒子有随机相位，节拍来时在前峰一波弹跳
        const k = Math.max(0, dance - p * 0.5) * amp * 6;
        pos[i * 3] = base[i * 3] + dir[i * 3] * k;
        pos[i * 3 + 1] = base[i * 3 + 1] + dir[i * 3 + 1] * k;
        pos[i * 3 + 2] = base[i * 3 + 2] + dir[i * 3 + 2] * k;
      }
      attrs.needsUpdate = true;
    }

    if (hasArtwork) {
      // 封面模式：点径随节拍弹跳（不糊），透明度稳定 + 节拍微闪
      material.size = COVER_SIZE + beat * 0.05 + bass * 0.03;
      material.opacity = isPlaying
        ? Math.min(0.34 + energy * 0.12 + beat * 0.1, 0.5)
        : 0.16 + energy * 0.04;
    } else {
      // 星尘模式：点径随节拍跳动，成为「会跳舞的星尘」
      material.size = AMBIENT_SIZE + beat * 0.06 + bass * 0.03 + treble * 0.02;
      material.opacity = isPlaying
        ? Math.min(0.3 + energy * 0.1 + beat * 0.12, 0.46)
        : 0.16 + energy * 0.03;
    }
  });

  if (currentSpace !== 'home' && currentSpace !== 'library') {
    return null;
  }

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={-10}>
      <pointsMaterial
        ref={materialRef}
        map={glowTexture}
        vertexColors
        transparent
        opacity={0.16}
        size={hasArtwork ? COVER_SIZE : AMBIENT_SIZE}
        sizeAttenuation
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}