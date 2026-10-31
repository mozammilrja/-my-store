import React, { useEffect } from 'react';
import { Icon } from '../ui';
import { cn } from '../../lib/utils';

/**
 * Toast
 * Solid status fills carry white text in both themes, which the plain status
 * tokens cannot: emerald-400 on white in dark mode reads at 1.8:1.
 */
const TONES = {
  success: { fill: 'bg-status-success-solid', icon: 'check_circle' },
  warning: { fill: 'bg-status-warning-solid', icon: 'warning' },
  danger: { fill: 'bg-status-danger-solid', icon: 'error' },
  error: { fill: 'bg-status-danger-solid', icon: 'error' },
  info: { fill: 'bg-primary-container', icon: 'info' },
};

export function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const duration = typeof toast === 'object' && toast?.duration ? toast.duration : 4000;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isObj = typeof toast === 'object';
  const type = (isObj && toast.type) || 'info';
  const title = isObj ? toast.title : null;
  const message = isObj
    ? typeof toast.message === 'string'
      ? toast.message
      : JSON.stringify(toast.message || '')
    : String(toast);

  const tone = TONES[type] || TONES.info;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-overlay animate-fade-in-up"
    >
      <div
        className={cn(
          'flex min-w-[17.5rem] max-w-md items-start gap-3 rounded-xl px-4 py-3 text-on-accent shadow-xl',
          tone.fill
        )}
      >
        <Icon
          name={tone.icon}
          aria-hidden="true"
          className="material-symbols-outlined mt-px shrink-0 text-icon-lg"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {title && (
            <div className="text-caption uppercase tracking-wider opacity-90">
              {title}
            </div>
          )}
          <div className="text-meta leading-relaxed">{message}</div>
        </div>
        <button
          onClick={onClose}
          className="-mr-1 shrink-0 rounded-lg p-1 transition-colors hover:bg-on-status/20"
          type="button"
          title="Dismiss"
          aria-label="Dismiss notification"
        >
          <Icon name="close" aria-hidden="true" className="material-symbols-outlined text-icon" />
        </button>
      </div>
    </div>
  );
}
