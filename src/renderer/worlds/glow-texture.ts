import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter } from 'three';

/**
 * 粒子柔光贴图：中心亮、边缘平滑衰减。
 * 用 128px + 多段衰减，避免小尺寸下出现方块硬边（点径小时尤其明显），
 * 让星尘读起来是「细柔尘埃」而不是粗糙噪点。
 */
export function makeGlowTexture(size = 128): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.16, 'rgba(255,255,255,0.7)');
    gradient.addColorStop(0.38, 'rgba(255,255,255,0.22)');
    gradient.addColorStop(0.64, 'rgba(255,255,255,0.06)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    context.fill();
  }
  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
