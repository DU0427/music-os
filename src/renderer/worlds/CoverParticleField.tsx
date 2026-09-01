import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, TextureLoader } from 'three';
import type { PointsMaterial, Texture } from 'three';
import { useAudioStore } from '../audio/store';
import { useRuntimeStore } from '../store/runtime';
import type { TrackIdentity } from '../../shared/ipc/music';

const GRID = 48;
const SIZE = 7;
const COUNT = GRID * GRID;

const NO_TRACK_RGB = new Color('#0A1220');
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

function gridPositions(): Float32Array {
  const positions = new Float32Array(COUNT * 3);
  for (let py = 0; py < GRID; py += 1) {
    for (let px = 0; px < GRID; px += 1) {
      const index = py * GRID + px;
      positions[index * 3] = (px - GRID / 2) * (SIZE / GRID);
      positions[index * 3 + 1] = Math.sin(index * 0.7) * 0.12 - 0.4;
      positions[index * 3 + 2] = (py - GRID / 2) * (SIZE / GRID);
    }
  }
  return positions;
}

function randomPositions(): Float32Array {
  const positions = new Float32Array(COUNT * 3);
  for (let index = 0; index < COUNT; index += 1) {
    positions[index * 3] = (Math.sin(index * 12.9898) * 43758.5453 - Math.floor(Math.sin(index * 12.9898) * 43758.5453) - 0.5) * SIZE;
    positions[index * 3 + 1] = (Math.sin(index * 78.233) * 12543.123 - Math.floor(Math.sin(index * 78.233) * 12543.123) - 0.5) * 3;
    positions[index * 3 + 2] = (Math.sin(index * 39.565) * 29989.21 - Math.floor(Math.sin(index * 39.565) * 29989.21) - 0.5) * SIZE;
  }
  return positions;
}

function stardustColors(base: Color): Float32Array {
  const colors = new Float32Array(COUNT * 3);
  const white = new Color('#ffffff');
  for (let index = 0; index < COUNT; index += 1) {
    const t = Math.random();
    const warmed = base.clone().lerp(white, 0.35 + t * 0.45);
    colors[index * 3] = warmed.r;
    colors[index * 3 + 1] = warmed.g;
    colors[index * 3 + 2] = warmed.b;
  }
  return colors;
}

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
    const luminance = r * 0.2126 + g * 0.7152 + b * 0.0722;
    const lift = 0.7 + luminance * 0.6;
    colors[index * 3] = Math.min(r * lift, 1);
    colors[index * 3 + 1] = Math.min(g * lift, 1);
    colors[index * 3 + 2] = Math.min(b * lift, 1);
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
      positions: randomPositions(),
      colors: stardustColors(energyTone(track)),
    };
  }, [hasArtwork, coverData, track]);

  const geometry = useMemo(() => {
    const nextGeometry = new BufferGeometry();
    return nextGeometry;
  }, []);

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
    if (currentSpace !== 'home') {
      return;
    }
    const metrics = useAudioStore.getState().metrics;
    const material = materialRef.current;
    if (!material) {
      return;
    }
    material.size = Math.min(0.06 + metrics.bass * 0.12 + metrics.beatPulse * 0.06, 0.24);
    material.opacity = Math.min(0.16 + metrics.energy * 0.14, 0.34);
  });

  if (currentSpace !== 'home') {
    return null;
  }

  const active = Boolean(track && canPlay);

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={-10}>
      <pointsMaterial
        ref={materialRef}
        vertexColors
        transparent
        opacity={active ? 0.22 : 0.16}
        size={active ? 0.07 : 0.05}
        sizeAttenuation
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
