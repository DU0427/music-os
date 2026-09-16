import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { Color, type AmbientLight, type DirectionalLight } from 'three';
import { useRuntimeStore } from '../store/runtime';
import { useAudioStore } from '../audio/store';
import { useMoodStore } from '../store/mood';
import CameraRig from '../camera/CameraRig';
import HomeSpace from './HomeSpace';
import SpaceBackdrop from './SpaceBackdrop';
import CoverParticleField from './CoverParticleField';
import GlobeWorld from './GlobeWorld';

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
    // mood tint（克制：±0.02 内，黑场舞台以中性为主）
    const mood = useMoodStore.getState().activeMood;
    let moodR = 0, moodG = 0, moodB = 0;
    if (mood === 'Calm') { moodR = -0.006; moodG = 0.01; moodB = 0.02; }
    else if (mood === 'Energy') { moodR = 0.02; moodG = 0.008; moodB = -0.01; }
    else if (mood === 'Night') { moodR = -0.004; moodG = -0.005; moodB = 0.015; }
    else if (mood === 'Nostalgia') { moodR = 0.015; moodG = 0.005; moodB = -0.005; }
    scene.fog?.color?.set(
      new Color(
        0.016 + metrics.mid * 0.4 + moodR,
        0.016 + bassInfluence * 0.15 + moodG,
        0.018 + metrics.treble * 0.22 + moodB,
      ).multiplyScalar(pulse * transitionInfluence),
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
<div style={{ position: 'absolute', inset: 0, background: '#050507' }}>
      <Canvas
        fallback={
          <div style={{ display: 'grid', height: '100%', placeItems: 'center', color: '#e8e8ed', background: '#050507' }}>
            当前环境无法使用 WebGL，页面无法显示。
          </div>
        }
        style={{ width: '100%', height: '100%' }}
        dpr={[1, 1.25]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 1.2, 6], fov: 60 }}
      >
        <color attach="background" args={['#050507']} />
        <fog attach="fog" args={['#050507', 9, 22]} />
<AudioMetricsSampler />
        <AudioAtmosphere isTransitioning={isTransitioning} />
        <AudioLighting isTransitioning={isTransitioning} />
        <SpaceBackdrop />
        {/* 播放舞台背景：封面粒子幕（两态透明度，home/library 可见） */}
        <CoverParticleField />
        <CameraRig currentSpace={currentSpace} />

        <group key={currentSpace}>
          {currentSpace === 'home' ? <HomeSpace /> : currentSpace === 'globe' ? <GlobeWorld /> : null}
        </group>
      </Canvas>
    </div>
  );
}

