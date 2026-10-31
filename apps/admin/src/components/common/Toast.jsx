import React, { useEffect } from 'react';
import { Icon } from '../ui';

export function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const duration = typeof toast === 'object' && toast?.duration ? toast.duration : 4000;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isObj = typeof toast === 'object';
  const type = isObj && toast.type ? toast.type : 'info';
  const title = isObj ? toast.title : null;
  const message = isObj
    ? (typeof toast.message === 'string' ? toast.message : JSON.stringify(toast.message || ''))
    : String(toast);

  const bgStyles = {
    success: 'bg-status-success text-on-primary border-emerald-600',
    warning: 'bg-amber-600 text-white border-amber-700',
    danger: 'bg-status-danger text-on-error border-red-700',
    error: 'bg-status-danger text-on-error border-red-700',
    info: 'bg-primary-container text-on-primary border-purple-800',
  }[type] || 'bg-primary-container text-on-primary border-purple-800';

  const iconName = {
    success: 'check_circle',
    warning: 'warning',
    danger: 'error',
    error: 'error',
    info: 'info',
  }[type] || 'info';

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border ${bgStyles} min-w-[280px] max-w-md`}>
        <Icon name={iconName} className="material-symbols-outlined text-[20px]" />
        <div className="flex-1 text-sm font-medium">
          {title && <div className="font-semibold text-xs uppercase tracking-wider opacity-90">{title}</div>}
          <div className="text-xs leading-relaxed">{message}</div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
          type="button"
          aria-label="Close notification"
        >
          <Icon name="close" className="material-symbols-outlined text-[16px]" />
        </button>
      </div>
    </div>
  );
}
