import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh, MeshStandardMaterial } from 'three';
import { useAudioStore } from '../audio/store';

interface MusicCoreProps {
  onEnterWorld: () => void;
  isActive?: boolean;
}

export default function MusicCore({ onEnterWorld, isActive = true }: MusicCoreProps) {
  const coreRef = useRef<Mesh>(null);
  const haloRef = useRef<Mesh>(null);
  const coreMaterialRef = useRef<MeshStandardMaterial>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'default';
    };
  }, []);

  useFrame(({ clock }) => {
    if (!isActive) {
      return;
    }
    const t = clock.getElapsedTime();
    const metrics = useAudioStore.getState().metrics;
    if (coreRef.current) {
      coreRef.current.rotation.y = t * 0.12;
      coreRef.current.scale.setScalar(1 + Math.sin(t * 0.9) * 0.02 + metrics.bass * 0.14 + metrics.beatPulse * 0.08);
    }
    if (haloRef.current) {
      haloRef.current.rotation.x = t * 0.08;
      haloRef.current.rotation.z = t * -0.12;
      haloRef.current.scale.setScalar(1 + metrics.energy * 0.2 + metrics.beatPulse * 0.08);
    }
    if (coreMaterialRef.current) {
      coreMaterialRef.current.emissiveIntensity = 0.35 + metrics.energy * 1.1;
    }
  });

  return (
    <group>
      <mesh ref={haloRef} position={[0, 0.1, 0]}>
        <sphereGeometry args={[2.0, 64, 32]} />
        <meshStandardMaterial color="#6ea8ff" transparent opacity={0.09} />
      </mesh>
      <mesh
        ref={coreRef}
        position={[0, 0, 0]}
        onClick={onEnterWorld}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer';
          setIsHovered(true);
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
          setIsHovered(false);
        }}
        scale={isHovered ? 1.05 : 1}
      >
        <icosahedronGeometry args={[1.1, 1]} />
        <meshStandardMaterial
          ref={coreMaterialRef}
          color="#101a2f"
          emissive="#6ea8ff"
          emissiveIntensity={isHovered ? 0.75 : 0.35}
          roughness={0.2}
          metalness={0.7}
          transparent
          opacity={1}
        />
      </mesh>
    </group>
  );
}
