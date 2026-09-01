import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferGeometry, CanvasTexture, Color, Float32BufferAttribute, TextureLoader } from 'three';
import type { PointsMaterial } from 'three';
import { useAudioStore } from '../audio/store';
import { useRuntimeStore } from '../store/runtime';
import type { TrackIdentity } from '../../shared/ipc/music';

// —— 网格化封面粒子墙：密集 grid×grid，每个粒子取封面对应像素色 ——
const GRID = 56;
const COUNT = GRID * GRID;
const PLANE_W = 8.2;
const PLANE_H = 8.2;

const NO_TRACK_RGB = new Color('#0A0A0C');
const CALM_RGB = new Color('#78AFFF');
const ELECTRIC_RGB = new Color('#EA8E83');
const DEFAULT_RGB = new Color('#1A2980');

function energyTone(track: TrackIdentity | null): Color {
  if (!track) {
    return NO_TRACK_RGB;
  }
  const target = track.worldContext?.energyTarget;
  if (target === 'calm') {
    return CALM_RGB.clone();
  }
  if (target === 'electric') {
    return ELECTRIC_RGB.clone();
  }
  return DEFAULT_RGB.clone();
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
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.7, 'rgba(255,255,255,0.22)');
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

// 网格位置：XZ 平面均布成矩形面，z 从 0 向 -1 微退让，形成轻微景深
function gridPositions(): Float32Array {
  const positions = new Float32Array(COUNT * 3);
  const step = PLANE_W / (GRID - 1);
  for (let gx = 0; gx < GRID; gx += 1) {
    for (let gy = 0; gy < GRID; gy += 1) {
      const index = gy * GRID + gx;
      const x = (gx - (GRID - 1) / 2) * step;
      const y = (gy - (GRID - 1) / 2) * step;
      // x/y 轻微扰动，打散"整齐网格"的生硬感；z 微深度
      positions[index * 3] = x + (Math.sin((index + 1) * 12.9898) * 43758.5453 % 1 - 0.5) * 0.06;
      positions[index * 3 + 1] = y + (Math.sin((index + 101) * 12.9898) * 43758.5453 % 1 - 0.5) * 0.06;
      positions[index * 3 + 2] = -((index % 7) / 7) * 0.5;
    }
  }
  return positions;
}

// 从封面降采样网格取每个像素色
function artworkColors(image: HTMLImageElement | HTMLCanvasElement): Float32Array {
  const canvas = document.createElement('canvas');
  canvas.width = GRID;
  canvas.height = GRID;
  const context = canvas.getContext('2d');
  const colors = new Float32Array(COUNT * 3);
  if (!context) {
    return colors;
  }
  context.drawImage(image, 0, 0, GRID, GRID);
  const data = context.getImageData(0, 0, GRID, GRID).data;
  for (let index = 0; index < COUNT; index += 1) {
    const pixel = index * 4;
    const r = data[pixel] / 255;
    const g = data[pixel + 1] / 255;
    const b = data[pixel + 2] / 255;
    colors[index * 3] = r;
    colors[index * 3 + 1] = g;
    colors[index * 3 + 2] = b;
  }
  return colors;
}

// 无封面兜底：energyTone 色均匀星尘网格（中调色，不刺眼）
function fallbackColors(base: Color): Float32Array {
  const colors = new Float32Array(COUNT * 3);
  const white = new Color('#ffffff');
  for (let index = 0; index < COUNT; index += 1) {
    const gx = index % GRID;
    const gy = Math.floor(index / GRID);
    const radial = 1 - Math.hypot(gx - GRID / 2, gy - GRID / 2) / (GRID / 2);
    const t = Math.max(0, Math.min(1, radial));
    const core = base.clone().lerp(white, 0.15 + t * 0.5);
    colors[index * 3] = core.r;
    colors[index * 3 + 1] = core.g;
    colors[index * 3 + 2] = core.b;
  }
  return colors;
}

interface CoverData {
  positions: Float32Array;
  colors: Float32Array;
}

export default function CoverParticleField() {
  const currentSpace = useRuntimeStore((s) => s.currentSpace);
  const track = useAudioStore((s) => s.track);
  const canPlay = useAudioStore((s) => s.canPlay);
  const [coverData, setCoverData] = useState<CoverData | null>(null);
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

  const data = useMemo<CoverData>(() => {
    if (hasArtwork && coverData) {
      return coverData;
    }
    return {
      positions: gridPositions(),
      colors: fallbackColors(energyTone(track)),
    };
  }, [hasArtwork, coverData, track]);

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
    // 粒子尺寸贴近网格间距（PLANE_W/GRID ≈ 0.146），播放时略放大产生呼吸
    material.size = 0.14 + metrics.bass * 0.16 + metrics.beatPulse * 0.05;
    // 两态透明度：播放态封面粒子幕浮起（0.28-0.45），未播放极淡星尘（0.1-0.16）
    material.opacity = isPlaying
      ? Math.min(0.28 + metrics.energy * 0.18, 0.45)
      : 0.1 + metrics.energy * 0.06;
  });

  if (currentSpace !== 'home' && currentSpace !== 'library') {
    return null;
  }

  const active = Boolean(track && canPlay);

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={-10}>
      <pointsMaterial
        ref={materialRef}
        map={glowTexture}
        vertexColors
        transparent
        opacity={0.14}
        size={0.14}
        sizeAttenuation
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
