import React, { useEffect } from 'react';

export function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const bgStyles = {
    success: 'bg-status-success text-on-primary border-emerald-600',
    warning: 'bg-amber-600 text-white border-amber-700',
    danger: 'bg-status-danger text-on-error border-red-700',
    info: 'bg-primary-container text-on-primary border-purple-800',
  }[toast.type || 'info'];

  const iconName = {
    success: 'check_circle',
    warning: 'warning',
    danger: 'error',
    info: 'info',
  }[toast.type || 'info'];

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border ${bgStyles} min-w-[300px] max-w-md`}>
        <span className="material-symbols-outlined text-[20px]">{iconName}</span>
        <div className="flex-1 text-sm font-medium">
          {toast.title && <div className="font-semibold text-xs uppercase tracking-wider opacity-90">{toast.title}</div>}
          <div>{toast.message}</div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          type="button"
          aria-label="Close notification"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    </div>
  );
}
