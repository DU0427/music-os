import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CanvasTexture, SRGBColorSpace, type Sprite, type Texture } from 'three';

interface WorldLabelProps {
  text: string;
  position: [number, number, number];
  color?: string;
  background?: string;
  scale?: number;
}

const buildLabelTexture = (text: string, color: string, background: string): Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;

  const context = canvas.getContext('2d');
  if (!context) {
    const fallback = new CanvasTexture(canvas);
    fallback.needsUpdate = true;
    return fallback;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = '400 22px Inter, "Trebuchet MS", Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  context.fillStyle = background;
  context.fillRect(10, 28, canvas.width - 20, 72);

  context.strokeStyle = 'rgba(164,190,231,0.10)';
  context.lineWidth = 1;
  context.strokeRect(10, 28, canvas.width - 20, 72);

  context.fillStyle = color;
  context.shadowColor = 'rgba(0,0,0,0.28)';
  context.shadowBlur = 4;
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
};

export default function WorldLabel({
  text,
  position,
  color = '#cee5ff',
  background = 'rgba(10,18,32,0.56)',
  scale = 1,
}: WorldLabelProps) {
  const { camera } = useThree();
  const spriteRef = useRef<Sprite>(null);

  const texture = useMemo(() => buildLabelTexture(text, color, background), [text, color, background]);

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  useFrame(({ clock }) => {
    if (!spriteRef.current) {
      return;
    }
    spriteRef.current.quaternion.copy(camera.quaternion);

    const pulse = 1 + Math.sin(clock.getElapsedTime() * 1.8) * 0.012;
    spriteRef.current.scale.set(scale * 2.0 * pulse, scale * 0.52 * pulse, 1);
  });

  return (
    <sprite ref={spriteRef} position={position} scale={[scale * 2.0, scale * 0.52, 1]}>
      <spriteMaterial attach="material" map={texture} transparent depthWrite={false} opacity={0.92} />
    </sprite>
  );
}
