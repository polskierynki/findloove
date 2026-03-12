'use client';

import { useEffect, useMemo, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import EmojiPicker, { Theme } from 'emoji-picker-react';

type EmojiPopoverProps = {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  width?: number;
  height?: number;
  zIndex?: number;
  searchPlaceholder?: string;
};

type DesktopPosition = {
  top: number;
  left: number;
  arrowLeft: number;
  placement: 'top' | 'bottom';
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getDesktopPosition(anchorEl: HTMLElement, panelWidth: number, panelHeight: number): DesktopPosition {
  const margin = 12;
  const gap = 10;
  const rect = anchorEl.getBoundingClientRect();

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const left = clamp(
    rect.right - panelWidth,
    margin,
    Math.max(margin, viewportWidth - panelWidth - margin),
  );

  const openAbove = rect.top - panelHeight - gap >= margin;
  const top = openAbove
    ? rect.top - panelHeight - gap
    : Math.min(rect.bottom + gap, viewportHeight - panelHeight - margin);

  const anchorCenter = rect.left + rect.width / 2;
  const arrowLeft = clamp(anchorCenter - left - 8, 16, panelWidth - 20);

  return {
    top,
    left,
    arrowLeft,
    placement: openAbove ? 'top' : 'bottom',
  };
}

export default function EmojiPopover({
  open,
  anchorRef,
  onClose,
  onSelect,
  width = 336,
  height = 380,
  zIndex = 260,
  searchPlaceholder = 'Szukaj emoji',
}: EmojiPopoverProps) {
  const isClient = typeof window !== 'undefined' && typeof document !== 'undefined';
  const isMobileLayout = isClient && window.innerWidth < 768;

  useEffect(() => {
    if (!open || !isClient) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isClient, onClose, open]);

  const desktopPosition = useMemo(() => {
    if (!isClient) {
      return { top: 0, left: 0, arrowLeft: 24, placement: 'top' as const };
    }

    const anchorEl = anchorRef.current;
    if (!anchorEl) {
      return {
        top: Math.max(16, window.innerHeight - height - 16),
        left: Math.max(16, window.innerWidth - width - 16),
        arrowLeft: width - 46,
        placement: 'top' as const,
      };
    }

    return getDesktopPosition(anchorEl, width, height);
  }, [anchorRef, height, isClient, width, open]);

  const mobileHeight = isClient
    ? Math.min(360, Math.max(270, window.innerHeight - 170))
    : 320;

  if (!open || !isClient) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/25 backdrop-blur-[1px]"
        style={{ zIndex }}
        onClick={onClose}
        aria-hidden="true"
      />

      {isMobileLayout ? (
        <div
          role="dialog"
          aria-label="Wybierz emoji"
          className="emoji-popover-panel fixed left-2 right-2 rounded-2xl border border-cyan-500/30 bg-[#0d0919]/95 p-2 shadow-[0_22px_60px_rgba(0,0,0,0.6),0_0_25px_rgba(0,255,255,0.18)]"
          style={{
            zIndex: zIndex + 1,
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)',
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-white/20" />
          <EmojiPicker
            onEmojiClick={(emojiData) => onSelect(emojiData.emoji)}
            width="100%"
            height={mobileHeight}
            theme={Theme.DARK}
            autoFocusSearch={false}
            searchPlaceholder={searchPlaceholder}
            lazyLoadEmojis
            previewConfig={{ showPreview: false }}
          />
        </div>
      ) : (
        <div
          role="dialog"
          aria-label="Wybierz emoji"
          className="emoji-popover-panel fixed rounded-2xl border border-cyan-500/30 bg-[#0d0919]/95 p-2 shadow-[0_22px_60px_rgba(0,0,0,0.65),0_0_25px_rgba(0,255,255,0.18)]"
          style={{
            zIndex: zIndex + 1,
            top: desktopPosition.top,
            left: desktopPosition.left,
            width,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <span
            aria-hidden="true"
            className={`absolute h-3 w-3 rotate-45 border border-cyan-500/30 bg-[#0d0919] ${
              desktopPosition.placement === 'top' ? '-bottom-1.5 border-t-0 border-l-0' : '-top-1.5 border-r-0 border-b-0'
            }`}
            style={{ left: desktopPosition.arrowLeft }}
          />
          <EmojiPicker
            onEmojiClick={(emojiData) => onSelect(emojiData.emoji)}
            width={width - 16}
            height={height}
            theme={Theme.DARK}
            autoFocusSearch={false}
            searchPlaceholder={searchPlaceholder}
            lazyLoadEmojis
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}
    </>,
    document.body,
  );
}
