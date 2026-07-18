import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { MeshStandardMaterial, Mesh } from 'three';
import { useAudioStore } from '../audio/store';

interface Building {
  x: number;
  width: number;
  height: number;
  depth: number;
  glow: number;
}

const BUILDINGS: Building[] = [
  { x: -5.4, width: 1.1, height: 2.5, depth: 1.1, glow: 0.18 },
  { x: -4.1, width: 1.4, height: 4.4, depth: 1.2, glow: 0.24 },
  { x: -2.4, width: 1.7, height: 3.1, depth: 1.4, glow: 0.16 },
  { x: -0.6, width: 1.2, height: 5.3, depth: 1.1, glow: 0.28 },
  { x: 1.0, width: 1.8, height: 3.6, depth: 1.5, glow: 0.2 },
  { x: 2.9, width: 1.2, height: 4.8, depth: 1.1, glow: 0.3 },
  { x: 4.4, width: 1.6, height: 2.8, depth: 1.4, glow: 0.18 },
  { x: 5.8, width: 1.1, height: 3.8, depth: 1.1, glow: 0.22 },
];

function ReactiveBuilding({
  data,
}: {
  data: Building;
}) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const metrics = useAudioStore.getState().metrics;
    if (meshRef.current) {
      meshRef.current.position.y = data.height / 2 + Math.sin(t * 0.9 + data.x) * 0.06 * metrics.bass;
      meshRef.current.scale.y = 1 + metrics.mid * 0.22;
    }
    if (materialRef.current) {
      materialRef.current.emissiveIntensity = data.glow + metrics.energy * 0.4 + metrics.bass * 0.15;
    }
  });

  return (
    <mesh ref={meshRef} position={[data.x, data.height / 2, 0]}>
      <boxGeometry args={[data.width, data.height, data.depth]} />
      <meshStandardMaterial
        ref={materialRef}
        color="#071020"
        emissive="#173d78"
        emissiveIntensity={data.glow}
        roughness={0.86}
        metalness={0.18}
      />
    </mesh>
  );
}

export default function CitySilhouette() {
  const buildings = useMemo(() => BUILDINGS, []);

  return (
    <group position={[0, -1.2, -5]}>
      {buildings.map((building) => (
        <ReactiveBuilding key={building.x} data={building} />
      ))}
      <mesh position={[0, 0.08, 0.04]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 2.4]} />
        <meshBasicMaterial color="#214e91" transparent opacity={0.08} />
      </mesh>
    </group>
  );
}
