import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { Points, PointsMaterial } from 'three';
import { useAudioStore } from '../audio/store';

const PARTICLE_COUNT = 72;

function sample(seed: number) {
  const value = Math.sin(seed * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export default function MemoryField() {
  const pointsRef = useRef<Points>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);

    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      positions[index * 3] = (sample(index + 1) - 0.5) * 12;
      positions[index * 3 + 1] = sample(index + 101) * 5.5 - 1;
      positions[index * 3 + 2] = -sample(index + 201) * 8 - 0.5;
    }

    const nextGeometry = new BufferGeometry();
    nextGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    return nextGeometry;
  }, []);

  const materialRef = useRef<PointsMaterial>(null);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useFrame(({ clock }) => {
    const metrics = useAudioStore.getState().metrics;
    if (pointsRef.current) {
      pointsRef.current.rotation.y = clock.getElapsedTime() * 0.012;
      pointsRef.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.28 + metrics.treble * 2) * 0.07;
      const breathe = 1 + metrics.bass * 0.35 + metrics.beatPulse * 0.25;
      pointsRef.current.position.y = Math.sin(clock.getElapsedTime() * 0.22 + metrics.mid * 1.8) * 0.08 * breathe;
      pointsRef.current.position.z = -0.15 - metrics.mid * 0.4;
    }
    if (materialRef.current) {
      materialRef.current.size = 0.06 + metrics.treble * 0.08 + metrics.beatPulse * 0.03;
      materialRef.current.opacity = 0.3 + metrics.energy * 0.35;
      const rgb = {
        r: Math.min(1, 0.9 + metrics.energy * 0.12),
        g: Math.min(1, 0.95 + metrics.energy * 0.08),
        b: Math.min(1, 0.98 + metrics.treble * 0.1),
      };
      materialRef.current.color.setRGB(rgb.r, rgb.g, rgb.b);
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <pointsMaterial ref={materialRef} color="#E8C47A" size={0.06} transparent opacity={0.42} sizeAttenuation />
    </points>
  );
}
