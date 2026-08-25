import { useThree, useFrame } from '@react-three/fiber';
import gsap from 'gsap';
import { useEffect, useMemo, useRef } from 'react';
import { PerspectiveCamera, Vector3 } from 'three';
import type { SpaceType } from '../../shared/types/world';
import { useRuntimeStore } from '../store/runtime';

const CAMERA_PRESETS: Record<SpaceType, { position: [number, number, number]; lookAt: [number, number, number]; fov: number }> = {
  home: { position: [0, 1.2, 6], lookAt: [0, 0.2, 0], fov: 60 },
  midnight: { position: [0, 1.8, 11], lookAt: [0, 1, 0], fov: 55 },
  library: { position: [0, 1.4, 7], lookAt: [0, 0.4, 0], fov: 58 },
  memory: { position: [0, 1.2, 6.5], lookAt: [0, 0.3, 0], fov: 60 },
  mood: { position: [0, 1.2, 6], lookAt: [0, 0.2, 0], fov: 60 },
  visualizer: { position: [0, 1.6, 9], lookAt: [0, 0.8, 0], fov: 56 },
};

export default function CameraRig({ currentSpace }: { currentSpace: SpaceType }) {
  const { camera } = useThree();
  const cameraRef = useRef(camera as PerspectiveCamera);
  const preset = CAMERA_PRESETS[currentSpace];
  const desiredPosition = useMemo(() => new Vector3(...preset.position), [preset]);
  const desiredLook = useMemo(() => new Vector3(...preset.lookAt), [preset]);
  const targetPos = useRef(camera.position.clone());
  const targetLook = useRef(new Vector3(...preset.lookAt));
  const targetFov = useRef((camera as PerspectiveCamera).fov);
  const transition = useRef({ progress: 1 });
  const setTransitioning = useRuntimeStore((state) => state.setTransitioning);
  const isInitialized = useRef(false);

  useEffect(() => {
    transition.current.progress = 0;
    if (!isInitialized.current) {
      isInitialized.current = true;
      return () => {
        setTransitioning(false);
      };
    }

    const transitionFallbackMs = 1850;
    const fallbackTimer = window.setTimeout(() => setTransitioning(false), transitionFallbackMs);
    setTransitioning(true);
    const tween = gsap.to(transition.current, {
      progress: 1,
      duration: 1.6,
      ease: 'power3.inOut',
      onComplete: () => {
        window.clearTimeout(fallbackTimer);
        setTransitioning(false);
      },
    });
    return () => {
      tween.kill();
      window.clearTimeout(fallbackTimer);
      setTransitioning(false);
    };
  }, [currentSpace, setTransitioning]);

  useFrame((_, delta) => {
    const smoothing = 1 - Math.exp(-(2.8 + transition.current.progress * 2.2) * delta);
    targetPos.current.lerp(desiredPosition, smoothing);
    targetLook.current.lerp(desiredLook, smoothing);
    targetFov.current += (preset.fov - targetFov.current) * smoothing;

    cameraRef.current.position.copy(targetPos.current);
    cameraRef.current.lookAt(targetLook.current);
    cameraRef.current.fov = targetFov.current;
    cameraRef.current.updateProjectionMatrix();
  });

  return null;
}
