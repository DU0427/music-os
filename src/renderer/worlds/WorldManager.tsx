import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { Color, type AmbientLight, type DirectionalLight } from 'three';
import { useRuntimeStore } from '../store/runtime';
import { useAudioStore } from '../audio/store';
import CameraRig from '../camera/CameraRig';
import HomeSpace from './HomeSpace';
import MidnightCityWorld from './MidnightCityWorld';
import SpaceBackdrop from './SpaceBackdrop';

function AudioLighting({ isTransitioning }: { isTransitioning: boolean }) {
  const ambientRef = useRef<AmbientLight>(null);
  const keyLightRef = useRef<DirectionalLight>(null);

  useFrame(() => {
    const metrics = useAudioStore.getState().metrics;
    const transitionInfluence = isTransitioning ? 0.72 : 1;
    if (ambientRef.current) {
      ambientRef.current.intensity = (0.20 + metrics.energy * 0.20) * transitionInfluence;
    }
    if (keyLightRef.current) {
      keyLightRef.current.intensity = (1.0 + metrics.mid * 0.6 + metrics.beatPulse * 0.22) * transitionInfluence;
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.20} />
      <directionalLight ref={keyLightRef} position={[6, 8, 4]} intensity={1.0} />
    </>
  );
}

function AudioAtmosphere({ isTransitioning }: { isTransitioning: boolean }) {
  const { scene } = useThree();

  useFrame(() => {
    const metrics = useAudioStore.getState().metrics;
    const fog = scene.fog;
    const bassInfluence = Math.max(0, metrics.bass - 0.1) * 3;
    const transitionInfluence = isTransitioning ? 0.58 : 1;

    if (fog && 'near' in fog && 'far' in fog) {
      const baseNear = 9;
      const baseFar = 22;
      const energeticNear = Math.max(5.6, baseNear - bassInfluence * 0.7);
      const energeticFar = Math.min(26, baseFar + metrics.energy * 3.2 + metrics.treble * 1.8);
      fog.near = energeticNear * transitionInfluence + baseNear * (1 - transitionInfluence);
      fog.far = energeticFar * transitionInfluence + baseFar * (1 - transitionInfluence);
    }

    const pulse = 0.45 + metrics.energy * 0.35 + metrics.beatPulse * 0.12;
    scene.fog?.color?.set(
      new Color(0.020 + metrics.mid * 0.5, 0.07 + bassInfluence * 0.2, 0.15 + metrics.treble * 0.35).multiplyScalar(
        pulse * transitionInfluence,
      ),
    );
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
  const isTransitioning = useRuntimeStore((state) => state.isTransitioning);

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#050A14' }}>
      <Canvas
        fallback={
          <div style={{ display: 'grid', height: '100%', placeItems: 'center', color: '#dce8ff', background: '#050A14' }}>
            当前环境无法使用 WebGL，页面无法显示。
          </div>
        }
        style={{ width: '100%', height: '100%' }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 1.2, 6], fov: 60 }}
      >
        <color attach="background" args={['#050A14']} />
        <fog attach="fog" args={['#050A14', 9, 22]} />
        <AudioMetricsSampler />
        <AudioAtmosphere isTransitioning={isTransitioning} />
        <AudioLighting isTransitioning={isTransitioning} />
        <SpaceBackdrop />
        <CameraRig currentSpace={currentSpace} />

        <group key={currentSpace}>
          {currentSpace === 'home' ? <HomeSpace /> : currentSpace === 'midnight' ? <MidnightCityWorld /> : null}
        </group>
      </Canvas>
    </div>
  );
}

