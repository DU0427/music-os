import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh, MeshStandardMaterial } from 'three';
import { useAudioStore } from '../audio/store';

interface MusicCoreProps {
  onEnterWorld: () => void;
  isActive?: boolean;
  disabled?: boolean;
  isPlaying?: boolean;
  isPrimary?: boolean;
}

export default function MusicCore({
  onEnterWorld,
  isActive = true,
  disabled = false,
  isPlaying = false,
  isPrimary = false,
}: MusicCoreProps) {
  const shellRef = useRef<Mesh>(null);
  const coreRef = useRef<Mesh>(null);
  const haloRef = useRef<Mesh>(null);
  const coreMaterialRef = useRef<MeshStandardMaterial>(null);
  const auraRef = useRef<Mesh>(null);
  const detailRingRef = useRef<Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const baseScale = isPrimary ? 1.1 : 1;

  useEffect(() => {
    if (disabled && isHovered) {
      setIsHovered(false);
    }
    if (disabled) {
      document.body.style.cursor = 'default';
    }
    return () => {
      document.body.style.cursor = 'default';
      setIsPressed(false);
    };
  }, [disabled, isHovered]);

  useFrame(({ clock }) => {
    if (!isActive) {
      return;
    }
    const t = clock.getElapsedTime();
    const metrics = useAudioStore.getState().metrics;
    const playbackDrive = isPlaying ? 1 : 0;
    const breath = isPlaying ? 0.018 : 0.006;
    const spinBase = isPlaying ? 0.12 : 0.06;

    if (coreRef.current) {
      coreRef.current.rotation.y = t * spinBase;
      coreRef.current.scale.setScalar(
        1
          + Math.sin(t * (isPlaying ? 0.9 : 0.45)) * breath
          + (metrics.bass * (0.06 + 0.12 * playbackDrive))
          + (metrics.beatPulse * (0.03 + 0.05 * playbackDrive))
          + (isPressed ? 0.08 : 0),
      );
    }

    if (auraRef.current) {
      auraRef.current.rotation.x = Math.PI * 0.5;
      auraRef.current.rotation.y = t * 0.18;
      auraRef.current.rotation.z = t * -0.08;
      auraRef.current.scale.setScalar(baseScale * (1 + metrics.energy * 0.11));
    }

    if (detailRingRef.current) {
      detailRingRef.current.rotation.x = Math.PI * 0.5 + Math.sin(t * 0.18) * 0.08;
      detailRingRef.current.rotation.y = t * -0.24;
      detailRingRef.current.rotation.z = t * 0.12;
      detailRingRef.current.scale.setScalar(1 + metrics.beatPulse * 0.04);
    }

    if (haloRef.current) {
      haloRef.current.rotation.x = t * 0.08;
      haloRef.current.rotation.z = t * (isPlaying ? -0.12 : -0.05);
      haloRef.current.scale.setScalar(baseScale * (1 + metrics.energy * (0.08 + 0.12 * playbackDrive) + metrics.beatPulse * (0.03 + 0.05 * playbackDrive)));
    }

    if (shellRef.current) {
      const shellPulse = 1 + metrics.treble * 0.13 + metrics.mid * 0.08 + breath * 0.4;
      shellRef.current.scale.setScalar(baseScale * shellPulse);
      shellRef.current.rotation.y = t * 0.12;
    }

    if (coreMaterialRef.current) {
      coreMaterialRef.current.emissiveIntensity =
        (disabled ? 0.18 : 0.35)
        + metrics.energy * (disabled ? 0.45 : 0.52 + 0.58 * playbackDrive)
        + (isPressed ? 0.2 : 0);
      coreMaterialRef.current.color.set(isPrimary ? 0x101a2f : 0x1a2742);
    }
  });

  return (
    <group>
      <mesh ref={shellRef} position={[0, 0.08, 0]}>
        <sphereGeometry args={[1.25, 64, 32]} />
        <meshStandardMaterial color="#8dbbff" transparent opacity={0.06} roughness={0.38} metalness={0.2} />
      </mesh>

      <mesh ref={auraRef} position={[0, 0.02, 0]}>
        <torusGeometry args={[1.54, 0.026, 12, 96]} />
        <meshStandardMaterial color="#b6d7ff" emissive="#6ea8ff" emissiveIntensity={0.2} transparent opacity={0.34} />
      </mesh>

      <mesh ref={detailRingRef} position={[0, 0.02, 0]}>
        <torusGeometry args={[0.84, 0.012, 8, 96]} />
        <meshStandardMaterial color="#dceaff" emissive="#8bbcff" emissiveIntensity={0.26} transparent opacity={0.22} />
      </mesh>

      <mesh ref={haloRef} position={[0, 0.1, 0]} scale={1.26}>
        <sphereGeometry args={[1.82, 64, 32]} />
        <meshStandardMaterial
          color="#6ea8ff"
          transparent
          opacity={disabled ? 0.02 : 0.04}
          roughness={1}
          emissive="#6ea8ff"
          emissiveIntensity={disabled ? 0.02 : 0.06}
        />
      </mesh>

      <mesh
        ref={coreRef}
        position={[0, 0, 0]}
        onClick={() => {
          if (disabled) {
            return;
          }
          onEnterWorld();
        }}
        onPointerDown={() => {
          if (disabled) {
            return;
          }
          setIsPressed(true);
        }}
        onPointerOver={() => {
          if (disabled) {
            return;
          }
          document.body.style.cursor = 'pointer';
          setIsHovered(true);
        }}
        onPointerUp={() => setIsPressed(false)}
        onPointerOut={() => {
          if (disabled) {
            return;
          }
          document.body.style.cursor = 'default';
          setIsHovered(false);
          setIsPressed(false);
        }}
        scale={disabled ? 0.98 * baseScale : isHovered || isPressed ? 1.08 * baseScale : baseScale}
      >
        <sphereGeometry args={[1.02, 64, 32]} />
        <meshStandardMaterial
          ref={coreMaterialRef}
          color="#101a2f"
          emissive="#6ea8ff"
          emissiveIntensity={
            disabled
              ? 0.2
              : isHovered || isPressed
                ? isPrimary
                  ? 0.9
                  : 0.75
                : isPrimary
                  ? 0.5
                  : 0.35
          }
          roughness={0.34}
          metalness={0.42}
          transparent
          opacity={disabled ? 0.68 : 1}
        />
      </mesh>
    </group>
  );
}
