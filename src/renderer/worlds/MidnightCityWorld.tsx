import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BackSide, DoubleSide } from 'three';
import type { Mesh, MeshStandardMaterial } from 'three';
import { useRuntimeStore } from '../store/runtime';
import CitySilhouette from './CitySilhouette';
import MemoryField from './MemoryField';
import SpatialPortal from './SpatialPortal';
import { useAudioStore } from '../audio/store';

function FloatingNode({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.22, 16, 16]} />
      <meshStandardMaterial color="#b58cff" emissive="#b58cff" emissiveIntensity={0.7} />
    </mesh>
  );
}

export default function MidnightCityWorld() {
  const requestSpace = useRuntimeStore((state) => state.requestSpace);
  const worldContext = useAudioStore((state) => state.track?.worldContext ?? null);
  const worldTone = worldContext?.energyTarget === 'calm' ? '#7de7e2' : '#b58cff';
  const energyRef = useRef<Mesh>(null);
  const energyMaterialRef = useRef<MeshStandardMaterial>(null);
  const nodes = useMemo<Array<[number, number, number]>>(
    () => [
      [-2.5, 1.4, -2],
      [2.2, 1.0, -2.5],
      [1.8, -0.8, -1.8],
      [-1.6, -0.2, -1.2],
      [0.0, 0.8, -1.5],
    ],
    [],
  );

  useFrame(({ clock }) => {
    const metrics = useAudioStore.getState().metrics;
    if (energyRef.current) {
      energyRef.current.rotation.y = clock.getElapsedTime() * 0.08;
      energyRef.current.scale.setScalar(1 + metrics.energy * 0.18 + metrics.beatPulse * 0.12);
    }
    if (energyMaterialRef.current) {
      energyMaterialRef.current.emissiveIntensity = 0.2 + metrics.mid * 0.8;
    }
  });

  return (
    <group>
      <mesh position={[0, 1.4, -5]} scale={[7.5, 4.2, 1.2]}>
        <sphereGeometry args={[1, 32, 16]} />
        <meshBasicMaterial color="#214e91" transparent opacity={0.11} side={BackSide} depthWrite={false} />
      </mesh>
      <CitySilhouette />
      <MemoryField />

      <mesh position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[18, 10, 4, 4]} />
        <meshStandardMaterial color="#010308" roughness={1} side={DoubleSide} />
      </mesh>

      <mesh ref={energyRef} position={[0, 2.8, -4]} rotation={[0.15, 0, 0]}>
        <torusKnotGeometry args={[2.4, 0.25, 128, 32]} />
        <meshStandardMaterial
          ref={energyMaterialRef}
          color={worldTone}
          emissive={worldTone}
          emissiveIntensity={0.2}
          transparent
          opacity={0.25}
        />
      </mesh>

      {nodes.map((node, index) => (
        <FloatingNode key={`${node[0]}-${index}`} position={node} />
      ))}

      <SpatialPortal
        position={[0, 1, 0]}
        color="#f0b56a"
        accent="#ffca7a"
        onActivate={() => requestSpace('home')}
        mode="return"
        size={0.85}
      />
    </group>
  );
}
