import React, { useEffect } from 'react';
import { Icon, Button } from '../ui';
import { EmptyState } from '../shared';

/**
 * The store has no notification feed yet, so this panel says so plainly
 * instead of showing sample alerts. When a feed exists, render its items in
 * the list region below and wire each item's action through `onAction`.
 */
export function NotificationsModal({ isOpen, onClose, onAction }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-overlay flex items-start justify-end bg-scrim/30 p-space-lg pt-16 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notifications-title"
        className="flex w-full max-w-sm flex-col overflow-hidden rounded-xl border border-subtle bg-surface-container-lowest shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-subtle p-space-md">
          <div className="flex items-center gap-space-sm">
            <Icon name="notifications" aria-hidden="true" className="material-symbols-outlined text-icon-md text-muted" />
            <h2 id="notifications-title" className="text-subheading text-primary">Notifications</h2>
          </div>
          <Button variant="ghost" size="iconSm" onClick={onClose} title="Close" aria-label="Close notifications">
            <Icon name="close" aria-hidden="true" className="material-symbols-outlined text-icon-md" />
          </Button>
        </div>

        <div className="max-h-96 overflow-y-auto p-space-md">
          <EmptyState
            icon="notifications"
            title="You're all caught up"
            description="Store alerts will appear here when there is something to act on."
            className="p-space-xl"
          />
        </div>
      </div>
    </div>
  );
}
