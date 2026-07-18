import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import { useAudioStore } from '../audio/store';

interface SpatialPortalProps {
  position: [number, number, number];
  onActivate: () => void;
  color: string;
  accent: string;
  size?: number;
  mode?: 'enter' | 'return';
}

export default function SpatialPortal({
  position,
  onActivate,
  color,
  accent,
  size = 1,
  mode = 'enter',
}: SpatialPortalProps) {
  const [isHovered, setIsHovered] = useState(false);
  const ringRef = useRef<Mesh>(null);
  const coreRef = useRef<Mesh>(null);
  const materialRef = useRef<MeshStandardMaterial>(null);
  const anchorRef = useRef<Group>(null);
  useEffect(() => {
    return () => {
      document.body.style.cursor = 'default';
    };
  }, []);

  useFrame(({ clock }) => {
    const metrics = useAudioStore.getState().metrics;
    const t = clock.getElapsedTime();
    const pulse = 1 + 0.08 * Math.sin(t * 2.6) + 0.14 * metrics.bass;

    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.18;
      ringRef.current.scale.setScalar(size * (isHovered ? 1.06 : 1) * (0.92 + Math.abs(Math.sin(t * 1.2)) * 0.08));
    }

    if (coreRef.current) {
      coreRef.current.scale.setScalar(size * 0.82 * pulse);
      coreRef.current.rotation.y = t * 0.4;
    }

    if (materialRef.current) {
      materialRef.current.emissiveIntensity = (isHovered ? 0.65 : 0.28) + metrics.energy * 0.4;
    }

    if (anchorRef.current) {
      anchorRef.current.rotation.z = (mode === 'return' ? 1 : -1) * t * 0.2;
    }
  });

  return (
    <group
      ref={anchorRef}
      position={position}
      onClick={onActivate}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
        setIsHovered(true);
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
        setIsHovered(false);
      }}
      scale={isHovered ? 1.1 : 1}
    >
      <mesh ref={ringRef} material={undefined}>
        <ringGeometry args={[0.18 * size, 0.74 * size, 34]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          roughness={0.35}
          metalness={0.2}
          emissiveIntensity={isHovered ? 0.72 : 0.34}
          transparent
          opacity={0.86}
        />
      </mesh>

      <mesh
        ref={coreRef}
        position={[0, 0, 0.01 * size]}
        scale={size * 0.45}
      >
        {mode === 'enter' ? (
          <icosahedronGeometry args={[1.1, 1]} />
        ) : (
          <octahedronGeometry args={[1, 0]} />
        )}
        <meshStandardMaterial
          ref={materialRef}
          color={accent}
          emissive={accent}
          transparent
          opacity={0.98}
          roughness={0.18}
        />
      </mesh>

      {isHovered ? (
        <mesh position={[0, 0, 0.03 * size]}>
          <ringGeometry args={[0.25 * size, 0.44 * size, 14]} />
          <meshBasicMaterial color={color} transparent opacity={0.28} />
        </mesh>
      ) : null}
    </group>
  );
}
