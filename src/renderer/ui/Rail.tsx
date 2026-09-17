'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * 横向轨道：隐藏滚动条，支持滚轮（纵向滚轮转横向）与拖拽。
 * 悬浮时出现翻页按钮，底部给出与滚动方向一致的进度条
 * （研究结论：横向滚动必须给方向提示和显式控件，否则用户不知道还有内容）。
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
  const [nav, setNav] = useState({ overflow: false, progress: 0, visibleRatio: 1 });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const max = el.scrollWidth - el.clientWidth;
    setNav({
      overflow: max > 8,
      progress: max > 0 ? el.scrollLeft / max : 0,
      visibleRatio: el.scrollWidth > 0 ? el.clientWidth / el.scrollWidth : 1,
    });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return undefined;
    }
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [update]);

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

  const page = (direction: number) => {
    const el = ref.current;
    if (!el) {
      return;
    }
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  const thumbPercent = Math.round(Math.max(12, nav.visibleRatio * 100));
  const arrowStyle: React.CSSProperties = {
    width: 34,
    height: 34,
    background: 'rgba(10,10,13,0.72)',
    border: '1px solid rgba(255,255,255,0.14)',
    color: 'rgba(255,255,255,0.82)',
    cursor: 'pointer',
  };

  return (
    <div className="group relative">
      <div
        ref={ref}
        className="mo-rail"
        onScroll={update}
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

      {nav.overflow ? (
        <>
          <button
            type="button"
            aria-label="向左翻页"
            onClick={() => page(-1)}
            className="pointer-events-none absolute top-1/2 grid -translate-y-1/2 place-items-center rounded-full opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100"
            style={{ ...arrowStyle, left: 52 }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="向右翻页"
            onClick={() => page(1)}
            className="pointer-events-none absolute top-1/2 grid -translate-y-1/2 place-items-center rounded-full opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100"
            style={{ ...arrowStyle, right: 52 }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {/* 方向对齐的进度条：长度 = 可视比例，位置 = 滚动进度 */}
          <div style={{ height: 2, margin: '10px 40px 0', borderRadius: 999, background: 'rgba(255,255,255,0.07)' }}>
            <div
              style={{
                width: `${thumbPercent}%`,
                height: '100%',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.32)',
                transform: `translateX(${Math.round((nav.progress * (100 - thumbPercent) * 100) / thumbPercent)}%)`,
                transition: 'transform 120ms linear',
              }}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
