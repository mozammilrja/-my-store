import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../ui';
import { BrandMark } from './BrandMark';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { MENU_SECTIONS } from '../../routes';
import { useDashboardQuery } from '../../hooks/useAdminQueries';
import { HUBS } from '../../data/mockData';


const BADGE_TONES = {
  warning: 'border-status-warning/20 bg-status-warning-bg text-warning',
  info: 'border-status-info/20 bg-status-info-bg text-info',
  success: 'border-status-success/20 bg-status-success-bg text-success',
};

export function Sidebar({
  currentPath,
  onNavigate,
  currentHub,
  onSelectHub,
  isCollapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) {
  const [hubDropdownOpen, setHubDropdownOpen] = useState(false);
  // Nav counters come from the same figures the overview reports, so the
  // sidebar cannot claim a backlog the dashboard disagrees with.
  const { data: dashboard } = useDashboardQuery();
  const attention = dashboard?.attention ?? {};
  const hubRef = useRef(null);

  useEffect(() => {
    if (!hubDropdownOpen) return undefined;
    const onPointerDown = (e) => {
      if (hubRef.current && !hubRef.current.contains(e.target)) setHubDropdownOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setHubDropdownOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [hubDropdownOpen]);

  useEffect(() => {
    if (isCollapsed) setHubDropdownOpen(false);
  }, [isCollapsed]);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-header bg-scrim/50 backdrop-blur-xs lg:hidden animate-fade-in"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Primary"
        className={cn(
          'fixed left-0 top-0 z-sidebar flex h-screen select-none flex-col justify-between border-r border-subtle bg-surface-container-lowest transition-[width,transform] duration-300 ease-out-expo',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          isCollapsed ? 'w-sidebar-collapsed' : 'w-sidebar'
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Brand */}
          <div
            className={cn(
              'flex h-header shrink-0 items-center border-b border-subtle',
              isCollapsed ? 'justify-center px-2' : 'justify-between gap-2 px-4'
            )}
          >
            <button
              type="button"
              className="flex items-center gap-2.5 rounded-lg text-primary"
              onClick={() => {
                onNavigate('overview');
                onCloseMobile?.();
              }}
              title="AVELIQ Admin"
            >
              <BrandMark
                src="/brand/aveliq-monogram-mark.svg"
                label="AVELIQ"
                className="h-7 w-7"
              />
              {!isCollapsed && (
                <BrandMark
                  src="/brand/aveliq-wordmark-mark.svg"
                  label="AVELIQ"
                  className="h-4 w-[92px]"
                  style={{ WebkitMaskPosition: 'left center', maskPosition: 'left center' }}
                />
              )}
            </button>

            {!isCollapsed && (
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="rounded-full border border-status-info/20 bg-status-info-bg px-2 py-0.5 text-micro font-semibold tracking-wider text-info">
                  PROD-IN-01
                </span>
                <button
                  onClick={onCloseMobile}
                  className="rounded-lg p-1 text-muted hover:bg-surface-subtle hover:text-primary lg:hidden"
                  type="button"
                  title="Close navigation"
                  aria-label="Close navigation"
                >
                  <Icon name="close" className="material-symbols-outlined text-icon-md" />
                </button>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="no-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-3 py-3">
            {MENU_SECTIONS.map((section) => (
              <div key={section.title} className="flex flex-col gap-1">
                {!isCollapsed ? (
                  <div className="px-2.5 py-0.5 text-caption uppercase tracking-wider text-faint">
                    {section.title}
                  </div>
                ) : (
                  <div className="mx-auto my-1 h-px w-6 bg-border-subtle" aria-hidden="true" />
                )}

                <nav aria-label={section.title} className="flex flex-col gap-0.5">
                  {section.items.map((item) => {
                    const isActive = currentPath === item.path;
                    const badge = item.badgeKey ? attention[item.badgeKey] : undefined;
                    return (
                      <NavLink
                        key={item.path}
                        to={`/${item.path}`}
                        onClick={() => onCloseMobile?.()}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'group flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-body transition-colors',
                          isCollapsed && 'justify-center px-0',
                          isActive
                            ? 'bg-primary-container font-medium text-on-accent'
                            : 'text-muted hover:bg-surface-subtle hover:text-primary'
                        )}
                        title={item.label}
                      >
                        <Icon
                          name={item.icon}
                          className={cn(
                            'material-symbols-outlined shrink-0 text-icon-md transition-colors',
                            isActive ? 'text-on-accent' : 'text-faint group-hover:text-primary'
                          )}
                        />
                        {!isCollapsed && (
                          <>
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            {badge > 0 && (
                              <span
                                className={cn(
                                  'shrink-0 rounded-full border px-1.5 py-px text-micro tabular-nums',
                                  isActive
                                    ? 'border-on-accent/25 bg-scrim/25 text-on-accent'
                                    : BADGE_TONES[item.badgeTone] || BADGE_TONES.info
                                )}
                              >
                                {badge}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
        </div>

        {/* Hub switcher and collapse control */}
        <div className="shrink-0 border-t border-subtle bg-surface-container-lowest p-3">
          {!isCollapsed ? (
            <div className="relative" ref={hubRef}>
              <button
                onClick={() => setHubDropdownOpen((open) => !open)}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-subtle bg-surface-subtle px-2.5 py-2 text-left transition-colors hover:bg-surface-container"
                type="button"
                aria-haspopup="listbox"
                aria-expanded={hubDropdownOpen}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Icon name="hub" className="material-symbols-outlined shrink-0 text-icon text-faint" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-caption uppercase tracking-wider text-faint">
                      Node hub
                    </span>
                    <span className="truncate text-label font-semibold text-primary">
                      {currentHub.name}
                    </span>
                  </span>
                </span>
                <Icon name="unfold_more" className="material-symbols-outlined shrink-0 text-icon-md text-faint" />
              </button>

              {hubDropdownOpen && (
                <div
                  role="listbox"
                  aria-label="Fulfillment node"
                  className="absolute bottom-full left-0 right-0 z-overlay mb-1.5 animate-zoom-in rounded-xl border border-subtle bg-overlay p-1.5 shadow-lg"
                >
                  <div className="px-2 py-1 text-caption uppercase tracking-wider text-faint">
                    Fulfillment node
                  </div>
                  {HUBS.map((hub) => {
                    const isActive = currentHub.id === hub.id;
                    return (
                      <button
                        key={hub.id}
                        role="option"
                        aria-selected={isActive}
                        onClick={() => {
                          onSelectHub(hub);
                          setHubDropdownOpen(false);
                        }}
                        className={cn(
                          'flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-meta transition-colors',
                          isActive
                            ? 'bg-primary-container font-medium text-on-accent'
                            : 'text-primary hover:bg-surface-subtle'
                        )}
                        type="button"
                      >
                        <span className="flex min-w-0 flex-col text-left">
                          <span className="truncate font-semibold">{hub.name}</span>
                          <span className={cn('truncate text-micro', isActive ? 'text-on-accent/80' : 'text-muted')}>
                            {hub.location}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-micro tabular-nums whitespace-nowrap">{hub.capacity}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={onToggleCollapse}
                className="rounded-lg bg-surface-subtle p-2 text-muted hover:bg-surface-container hover:text-primary"
                title={`Active hub: ${currentHub.name}`}
                aria-label={`Active hub: ${currentHub.name}`}
                type="button"
              >
                <Icon name="hub" className="material-symbols-outlined text-icon-md" />
              </button>
            </div>
          )}

          <div className={cn('flex items-center pt-2', isCollapsed ? 'justify-center' : 'justify-between px-1')}>
            {!isCollapsed && (
              <span className="text-caption uppercase tracking-wider text-faint">
                AVELIQ Ops
              </span>
            )}
            <button
              onClick={onToggleCollapse}
              className="flex items-center rounded-lg p-1 text-muted transition-colors hover:bg-surface-subtle hover:text-primary"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              type="button"
            >
              <Icon
                name={isCollapsed ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left'}
                className="material-symbols-outlined text-icon"
              />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
