import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { PointsMaterial } from 'three';
import { useAudioStore } from '../audio/store';
import { makeGlowTexture } from './glow-texture';

/* 远处星尘：更细更暗，作为「安静的背景」，不与前台卡片抢注意力 */
const STAR_COUNT = 150;

function sample(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

export default function SpaceBackdrop() {
  const geometry = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3);

    for (let index = 0; index < STAR_COUNT; index += 1) {
      positions[index * 3] = (sample(index + 1) - 0.5) * 24;
      positions[index * 3 + 1] = sample(index + 101) * 12 - 3;
      positions[index * 3 + 2] = -sample(index + 201) * 18 - 2;
    }

    const nextGeometry = new BufferGeometry();
    nextGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    return nextGeometry;
  }, []);

  const glowTexture = useMemo(() => makeGlowTexture(), []);
  const materialRef = useRef<PointsMaterial>(null);

  useEffect(() => {
    return () => {
      geometry.dispose();
      glowTexture.dispose();
    };
  }, [geometry, glowTexture]);

  useFrame(({ clock }) => {
    const metrics = useAudioStore.getState().metrics;
    if (materialRef.current) {
      materialRef.current.size = 0.026 + metrics.treble * 0.03 + metrics.beatPulse * 0.02;
      materialRef.current.opacity = 0.2 + metrics.energy * 0.14;
    }

    if (geometry.attributes.position) {
      const positions = geometry.attributes.position.array as Float32Array;
      for (let index = 0; index < STAR_COUNT; index += 1) {
        const zIndex = index * 3 + 2;
        const t = metrics.bass * 0.35 + metrics.mid * 0.18;
        positions[zIndex] += 0.012 + t * 0.14;
        if (positions[zIndex] > -0.8) {
          positions[zIndex] = -18;
        }
      }
      geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        ref={materialRef}
        map={glowTexture}
        color="#ffffff"
        size={0.026}
        sizeAttenuation
        transparent
        opacity={0.2}
        depthWrite={false}
      />
    </points>
  );
}
