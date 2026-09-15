'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useDominantColor, withAlpha } from '../hooks/useDominantColor';
import type { ProviderPlaylistSummary } from '../../shared/music/providers';

const COVER_SIZE = 196;

function RackCover({
  item,
  index,
  onOpen,
}: {
  item: ProviderPlaylistSummary;
  index: number;
  onOpen: (playlist: ProviderPlaylistSummary) => void;
}) {
  const accent = useDominantColor(item.coverUrl, '#f5f5f7');
  const [hovered, setHovered] = useState(false);
  const tilt = index % 2 === 0 ? -1.8 : 1.8;

  return (
    <div
      className="group shrink-0 cursor-pointer select-none"
      style={{ width: COVER_SIZE }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onOpen(item)}
    >
      <div
        style={{
          position: 'relative',
          transform: hovered ? 'translateY(-10px) rotate(0deg)' : `rotate(${tilt}deg)`,
          transition: 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* 封面自己的光晕 */}
        <div
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            inset: '-16%',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${withAlpha(accent, hovered ? 0.42 : 0.2)}, transparent 68%)`,
            filter: 'blur(34px)',
            transition: 'background 420ms var(--mo-ease)',
          }}
        />
        <div
          style={{
            position: 'relative',
            width: COVER_SIZE,
            height: COVER_SIZE,
            borderRadius: 12,
            background: item.coverUrl
              ? `url(${item.coverUrl}) center / cover no-repeat`
              : 'conic-gradient(from 210deg at 50% 50%, #2a2a2e, transparent 32%, #0a0a0c 56%, #3a3a3e 80%, #2a2a2e)',
            border: `1px solid ${hovered ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
            boxShadow: hovered
              ? `0 26px 64px rgba(0,0,0,0.7), 0 0 36px ${withAlpha(accent, 0.3)}`
              : '0 18px 44px rgba(0,0,0,0.55)',
            transition: 'box-shadow 420ms var(--mo-ease), border-color 420ms var(--mo-ease)',
          }}
        />
        {item.kind === 'toplist' && index < 99 ? (
          <div
            className="absolute font-mono"
            style={{
              top: -9,
              left: -9,
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--mo-ink)',
              background: 'rgba(10,10,12,0.72)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 999,
              padding: '2px 8px',
              backdropFilter: 'blur(10px)',
            }}
          >
            {index + 1}
          </div>
        ) : null}
      </div>

      <div className="mt-3.5">
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 1.35,
            color: hovered ? 'var(--mo-ink)' : 'var(--mo-ink-soft)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            transition: 'color 300ms var(--mo-ease)',
          }}
        >
          {item.title}
        </div>
        <div className="mt-1" style={{ fontSize: 10, color: 'var(--mo-ink-faint)' }}>
          {item.trackCount ? `${item.trackCount} 首` : ''}
        </div>
      </div>
    </div>
  );
}

/** 一排唱片架：横向滚动（滚轮/拖拽），封面轻微倾斜，脚下有光池与架面细线。 */
export default function RackRow({
  title,
  items,
  onOpen,
}: {
  title: string;
  items: ProviderPlaylistSummary[];
  onOpen: (playlist: ProviderPlaylistSummary) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startLeft: number; dragging: boolean }>({
    startX: 0,
    startLeft: 0,
    dragging: false,
  });

  /* 滚轮 → 横向滚动（页面本身不需要纵向滚动） */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      return undefined;
    }
    const onWheel = (event: WheelEvent) => {
      const delta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (delta === 0) {
        return;
      }
      el.scrollLeft += delta;
      event.preventDefault();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  /* 拖拽滚动（拖动超过阈值时抑制点击） */
  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    dragState.current = { startX: event.clientX, startLeft: el.scrollLeft, dragging: false };
    el.setPointerCapture(event.pointerId);
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el || !el.hasPointerCapture(event.pointerId)) return;
    const dx = event.clientX - dragState.current.startX;
    if (Math.abs(dx) > 6) {
      dragState.current.dragging = true;
    }
    if (dragState.current.dragging) {
      el.scrollLeft = dragState.current.startLeft - dx;
    }
  }, []);

  const onPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (el?.hasPointerCapture(event.pointerId)) {
      el.releasePointerCapture(event.pointerId);
    }
  }, []);

  const scrollByViewport = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <section className="relative" style={{ minWidth: 0 }}>
      {/* 架头 */}
      <div className="flex items-baseline justify-between" style={{ padding: '0 40px' }}>
        <div className="flex items-baseline gap-3">
          <h2 style={{ fontSize: 17, fontWeight: 500, color: 'var(--mo-ink)', letterSpacing: '-0.01em' }}>
            {title}
          </h2>
          <span className="font-mono" style={{ fontSize: 10, color: 'var(--mo-ink-faint)' }}>
            {items.length}
          </span>
        </div>
        <button
          type="button"
          aria-label={`查看更多${title}`}
          onClick={scrollByViewport}
          className="flex items-center gap-1 transition-colors"
          style={{ fontSize: 11, color: 'var(--mo-ink-faint)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--mo-ink)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--mo-ink-faint)';
          }}
        >
          更多
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 货架 */}
      <div
        ref={scrollRef}
        className="mo-rack-scroll flex overflow-x-auto"
        style={{
          gap: 22,
          padding: '20px 40px 30px',
          maskImage: 'linear-gradient(90deg, transparent 0, #000 36px, #000 calc(100% - 36px), transparent 100%)',
          WebkitMaskImage: 'linear-gradient(90deg, transparent 0, #000 36px, #000 calc(100% - 36px), transparent 100%)',
          cursor: 'grab',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {items.map((item, index) => (
          <RackCover key={item.id} item={item} index={index} onOpen={onOpen} />
        ))}
      </div>

      {/* 架面：细线 + 光池 */}
      <div aria-hidden className="pointer-events-none" style={{ margin: '0 40px' }}>
        <div
          style={{
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)',
          }}
        />
        <div
          style={{
            height: 46,
            marginTop: -46,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.035), transparent)',
          }}
        />
      </div>
    </section>
  );
}