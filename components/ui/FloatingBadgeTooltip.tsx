'use client';

import { createPortal } from 'react-dom';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type FloatingBadgeTooltipProps = {
  content: ReactNode;
  children: ReactNode;
  delayMs?: number;
  wrapperClassName?: string;
};

type TooltipPlacement = 'top' | 'bottom';

type TooltipPosition = {
  top: number;
  left: number;
  placement: TooltipPlacement;
};

const VIEWPORT_MARGIN = 10;
const TOOLTIP_GAP = 10;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export default function FloatingBadgeTooltip({
  content,
  children,
  delayMs = 220,
  wrapperClassName,
}: FloatingBadgeTooltipProps) {
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition>({
    top: 0,
    left: 0,
    placement: 'top',
  });

  const isClient = typeof window !== 'undefined' && typeof document !== 'undefined';

  const updatePosition = useCallback(() => {
    const anchorEl = anchorRef.current;
    const tooltipEl = tooltipRef.current;
    if (!anchorEl || !tooltipEl) return;

    const anchorRect = anchorEl.getBoundingClientRect();
    const tooltipRect = tooltipEl.getBoundingClientRect();

    const left = clamp(
      anchorRect.right - tooltipRect.width,
      VIEWPORT_MARGIN,
      Math.max(VIEWPORT_MARGIN, window.innerWidth - tooltipRect.width - VIEWPORT_MARGIN),
    );

    const canOpenAbove = anchorRect.top - tooltipRect.height - TOOLTIP_GAP >= VIEWPORT_MARGIN;
    const top = canOpenAbove
      ? anchorRect.top - tooltipRect.height - TOOLTIP_GAP
      : Math.min(
          window.innerHeight - tooltipRect.height - VIEWPORT_MARGIN,
          anchorRect.bottom + TOOLTIP_GAP,
        );

    setPosition({
      top,
      left,
      placement: canOpenAbove ? 'top' : 'bottom',
    });
  }, []);

  useEffect(() => {
    if (!hovered) {
      setOpen(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setOpen(true);
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hovered, delayMs]);

  useEffect(() => {
    if (!open || !isClient) return;

    const rafId = window.requestAnimationFrame(() => {
      updatePosition();
    });

    const handleViewportChange = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [isClient, open, updatePosition]);

  return (
    <>
      <span
        ref={anchorRef}
        className={`inline-flex ${wrapperClassName || ''}`.trim()}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {children}
      </span>

      {isClient && open
        ? createPortal(
            <div
              ref={tooltipRef}
              role="tooltip"
              aria-hidden="true"
              className="pointer-events-none fixed z-[260] max-w-[280px] rounded-lg border border-cyan-500/40 bg-black/90 px-2.5 py-1.5 text-xs font-normal text-white shadow-[0_0_20px_rgba(0,0,0,0.45)] backdrop-blur-sm"
              style={{
                top: position.top,
                left: position.left,
              }}
            >
              {content}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
