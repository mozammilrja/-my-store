import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from '../ui';
import { cn } from '../../lib/utils';
import { MENU_SECTIONS } from '../../routes';

/**
 * Every page the sidebar offers, under the same label, so the palette and the
 * nav can never drift apart. The subtitle is the sidebar section it lives in.
 */
const VIEW_ITEMS = MENU_SECTIONS.flatMap((section) =>
  section.items.map((item) => ({
    type: 'view',
    title: item.label,
    subtitle: section.title,
    path: item.path,
    icon: item.icon,
  }))
);

export function CommandPalette({ isOpen, onClose, onNavigate, onAction }) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return VIEW_ITEMS;
    return VIEW_ITEMS.filter(
      (item) => item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, isOpen]);

  const select = (item) => {
    if (!item) return;
    if (item.action) {
      onAction?.(item.action);
    } else {
      onNavigate(item.path);
    }
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          setQuery('');
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const onInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (filtered.length ? (i + 1) % filtered.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      select(filtered[activeIndex]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-overlay flex items-start justify-center bg-scrim/50 px-space-lg pt-20 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Go to page"
        className="flex w-full max-w-xl flex-col overflow-hidden rounded-xl border border-subtle bg-surface-container-lowest shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-space-md border-b border-subtle px-space-lg py-space-md">
          <Icon name="search" aria-hidden="true" className="material-symbols-outlined text-icon-lg text-muted" />
          <input
            autoFocus
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-activedescendant={filtered[activeIndex] ? `command-item-${activeIndex}` : undefined}
            aria-label="Search pages"
            className="flex-1 bg-transparent text-body-lg text-primary placeholder:text-muted focus:outline-none"
            placeholder="Search pages…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
          />
          <kbd className="rounded border border-subtle bg-surface-subtle px-1.5 py-0.5 text-micro text-muted">Esc</kbd>
        </div>

        <div id="command-palette-list" role="listbox" className="flex max-h-96 flex-col gap-0.5 overflow-y-auto p-space-sm">
          {filtered.length === 0 ? (
            <div className="p-space-xl text-center text-body text-muted">
              No pages match “{query}”.
            </div>
          ) : (
            filtered.map((item, index) => {
              const active = index === activeIndex;
              return (
                <button
                  key={item.path}
                  id={`command-item-${index}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={cn(
                    'group flex w-full items-center justify-between gap-space-md rounded-lg px-space-md py-space-sm text-left transition-colors',
                    active ? 'bg-surface-subtle' : 'hover:bg-surface-subtle'
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => select(item)}
                >
                  <div className="flex min-w-0 items-center gap-space-md">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-subtle bg-surface-container-lowest text-muted">
                      <Icon name={item.icon} aria-hidden="true" className="material-symbols-outlined text-icon-md" />
                    </span>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-body font-medium text-primary">{item.title}</span>
                      <span className="truncate text-meta text-muted">{item.subtitle}</span>
                    </div>
                  </div>
                  <Icon
                    name="arrow_forward"
                    aria-hidden="true"
                    className={cn(
                      'material-symbols-outlined shrink-0 text-icon-sm text-faint transition-opacity',
                      active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    )}
                  />
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-space-lg border-t border-subtle bg-surface-subtle px-space-lg py-space-sm text-micro text-muted">
          <span>↑↓ to navigate</span>
          <span>↵ to open</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}
