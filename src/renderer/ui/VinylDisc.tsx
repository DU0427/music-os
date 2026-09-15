import type { CSSProperties } from 'react';

interface VinylDiscProps {
  size: number;
  /** 播放中旋转（有语义的动效：暂停即停）。 */
  spinning?: boolean;
  style?: CSSProperties;
}

/**
 * 黑胶唱盘：沟槽纹理 + 边缘高光弧 + 中心标贴。
 * 空态时它是舞台上的唯一静物；有封面时它从封面右侧露出一段圆弧，播放时缓慢旋转。
 */
export default function VinylDisc({ size, spinning = false, style }: VinylDiscProps) {
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        position: 'absolute',
        background: [
          // 细密沟槽
          'repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,0.032) 0px, rgba(255,255,255,0.032) 1px, transparent 1px, transparent 3px)',
          // 宽间距沟槽（分层感）
          'repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,0.016) 0px, rgba(255,255,255,0.016) 1px, transparent 1px, transparent 9px)',
          // 盘面纵深
          'radial-gradient(circle at 50% 50%, #1b1b1f 0%, #111114 42%, #0a0a0c 68%, #060608 100%)',
        ].join(', '),
        boxShadow:
          'inset 0 0 72px rgba(0,0,0,0.85), inset 0 0 0 1px rgba(255,255,255,0.05), 0 30px 80px rgba(0,0,0,0.55)',
        animation: 'mo-vinyl-spin 14s linear infinite',
        animationPlayState: spinning ? 'running' : 'paused',
        ...style,
      }}
    >
      {/* 边缘高光弧：旋转时可见地扫过，是"在转"的视觉线索 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background:
            'conic-gradient(from 205deg, transparent 0deg, rgba(255,255,255,0.11) 40deg, rgba(255,255,255,0.02) 92deg, transparent 138deg)',
        }}
      />
      {/* 中心标贴 */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: '34%',
          height: '34%',
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 42% 36%, #2a2a30, #151518 72%)',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
        }}
      >
        {/* 中孔 */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 6,
            height: 6,
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            background: '#040406',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
          }}
        />
      </div>
    </div>
  );
}