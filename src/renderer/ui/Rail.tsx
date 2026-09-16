'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * 横向轨道：隐藏滚动条，支持滚轮（纵向滚轮转横向）与拖拽。
 * 卡片尺寸固定、间距固定，右侧露出的半张卡即为"还有更多"的提示。
 */
export default function Rail({
  children,
  gap,
  style,
}: {
  children: ReactNode;
  gap: number;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return undefined;
    }
    const onWheel = (event: WheelEvent) => {
      // 只把纵向滚轮转成横向滚动；触控板横向滑动保持原生
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || el.scrollWidth <= el.clientWidth) {
        return;
      }
      event.preventDefault();
      el.scrollLeft += event.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div
      ref={ref}
      className="mo-rail"
      onPointerDown={(event) => {
        const el = ref.current;
        if (!el || event.button !== 0) {
          return;
        }
        drag.current = { active: true, startX: event.clientX, startLeft: el.scrollLeft, moved: false };
        el.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const el = ref.current;
        const state = drag.current;
        if (!el || !state.active) {
          return;
        }
        const dx = event.clientX - state.startX;
        if (Math.abs(dx) > 4) {
          state.moved = true;
        }
        el.scrollLeft = state.startLeft - dx;
      }}
      onPointerUp={(event) => {
        const el = ref.current;
        drag.current.active = false;
        el?.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        drag.current.active = false;
      }}
      onClickCapture={(event) => {
        // 拖拽后抑制这一次点击，避免误触发卡片
        if (drag.current.moved) {
          drag.current.moved = false;
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap,
        overflowX: 'auto',
        overflowY: 'hidden',
        padding: '0 40px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
