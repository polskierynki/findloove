'use client';

import { forwardRef, type ReactNode } from 'react';

type ButtonSize = 'sm' | 'md';
type ButtonVariant = 'cyan' | 'rose';

type HoverHintIconButtonProps = {
  tooltip: string;
  regularIcon: ReactNode;
  filledIcon: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  size?: ButtonSize;
  variant?: ButtonVariant;
  wrapperClassName?: string;
  buttonClassName?: string;
};

function cn(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(' ');
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
};

const variantClasses: Record<ButtonVariant, string> = {
  cyan: 'icon-hint-btn--cyan',
  rose: 'icon-hint-btn--rose',
};

const tooltipClasses: Record<ButtonVariant, string> = {
  cyan: 'icon-hint-tooltip--cyan',
  rose: 'icon-hint-tooltip--rose',
};

const HoverHintIconButton = forwardRef<HTMLButtonElement, HoverHintIconButtonProps>(function HoverHintIconButton(
  {
    tooltip,
    regularIcon,
    filledIcon,
    onClick,
    disabled = false,
    type = 'button',
    size = 'md',
    variant = 'cyan',
    wrapperClassName,
    buttonClassName,
  },
  ref,
) {
  return (
    <div className={cn('icon-hint-wrap', wrapperClassName)}>
      <div className="icon-hint-anchor">
        <button
          ref={ref}
          type={type}
          onClick={onClick}
          disabled={disabled}
          aria-label={tooltip}
          className={cn(
            'icon-hint-btn',
            sizeClasses[size],
            variantClasses[variant],
            buttonClassName,
          )}
        >
          <span className="icon-hint-icon" aria-hidden="true">
            <span className="icon-hint-icon--outline">{regularIcon}</span>
            <span className="icon-hint-icon--fill">{filledIcon}</span>
          </span>
        </button>
        <span role="tooltip" className={cn('icon-hint-tooltip', tooltipClasses[variant])}>
          {tooltip}
        </span>
      </div>
    </div>
  );
});

export default HoverHintIconButton;
