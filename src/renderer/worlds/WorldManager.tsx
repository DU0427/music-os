import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { Color, type AmbientLight, type DirectionalLight } from 'three';
import { useRuntimeStore } from '../store/runtime';
import { useAudioStore } from '../audio/store';
import CameraRig from '../camera/CameraRig';
import HomeSpace from './HomeSpace';
import MidnightCityWorld from './MidnightCityWorld';
import SpaceBackdrop from './SpaceBackdrop';

function AudioLighting() {
  const ambientRef = useRef<AmbientLight>(null);
  const keyLightRef = useRef<DirectionalLight>(null);

  useFrame(({ clock }) => {
    const metrics = useAudioStore.getState().metrics;
    if (ambientRef.current) {
      ambientRef.current.intensity = 0.24 + metrics.energy * 0.22;
    }
    if (keyLightRef.current) {
      keyLightRef.current.intensity = 1.2 + metrics.mid * 0.75 + metrics.beatPulse * 0.25;
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.24} />
      <directionalLight ref={keyLightRef} position={[6, 8, 4]} intensity={1.2} />
    </>
  );
}

function AudioAtmosphere() {
  const { scene } = useThree();

  useFrame(({ clock }) => {
    const metrics = useAudioStore.getState().metrics;
    const fog = scene.fog;
    const bassInfluence = Math.max(0, metrics.bass - 0.1) * 3;

    if (fog && 'near' in fog && 'far' in fog) {
      const baseNear = 8;
      const baseFar = 20;
      fog.near = Math.max(5.2, baseNear - bassInfluence * 0.9);
      fog.far = Math.min(28, baseFar + metrics.energy * 4.2 + metrics.treble * 2.2);
    }

    const pulse = 0.45 + metrics.energy * 0.35 + metrics.beatPulse * 0.12;
    scene.fog?.color?.set(new Color(0.020 + metrics.mid * 0.5, 0.07 + bassInfluence * 0.2, 0.15 + metrics.treble * 0.35).multiplyScalar(pulse));
  });

  return null;
}

function AudioMetricsSampler() {
  const sampleMetrics = useAudioStore((state) => state.sampleMetrics);
  useFrame(({ clock }) => {
    sampleMetrics(clock.getElapsedTime());
  });
  return null;
}

export default function WorldManager() {
  const currentSpace = useRuntimeStore((state) => state.currentSpace);

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#050A14' }}>
      <Canvas
        fallback={
          <div style={{ display: 'grid', height: '100%', placeItems: 'center', color: '#dce8ff', background: '#050A14' }}>
            WebGL is unavailable in this environment.
          </div>
        }
        style={{ width: '100%', height: '100%' }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 1.2, 6], fov: 60 }}
      >
        <color attach="background" args={['#050A14']} />
        <fog attach="fog" args={['#050A14', 8, 20]} />
        <AudioMetricsSampler />
        <AudioAtmosphere />
        <AudioLighting />
        <SpaceBackdrop />
        <CameraRig currentSpace={currentSpace} />

        <group key={currentSpace}>
          {currentSpace === 'home' ? <HomeSpace /> : <MidnightCityWorld />}
        </group>
      </Canvas>
    </div>
  );
}
