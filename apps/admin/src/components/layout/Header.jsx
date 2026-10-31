import React, { useEffect, useRef, useState } from 'react';
import { Icon, Badge, Button, Avatar, AvatarImage, AvatarFallback } from '../ui';
import { clearToken } from '../../lib/api';
import { useTheme } from '../../lib/theme';
import { cn } from '../../lib/utils';

const THEME_LABEL = { light: 'Light', dark: 'Dark', system: 'System' };

export function Header({
  isCollapsed,
  onOpenCommandPalette,
  onOpenNotifications,
  currentHub,
  searchQuery,
  unreadCount = 3,
  onToggleMobileMenu,
}) {
  const { theme, toggleTheme, isDark } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    if (!profileOpen) return undefined;
    const onPointerDown = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setProfileOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [profileOpen]);

  const todayStr = new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  return (
    <header
      className={cn(
        'fixed right-0 top-0 left-0 z-header flex h-header items-center justify-between gap-space-md border-b border-subtle bg-surface-container-lowest/90 px-4 backdrop-blur-md transition-[left] duration-300 ease-out-expo md:px-space-xl',
        isCollapsed ? 'lg:left-sidebar-collapsed' : 'lg:left-sidebar'
      )}
    >
      {/* Left: mobile menu and global search */}
      <div className="flex w-full min-w-0 max-w-md items-center gap-2 md:gap-space-md">
        <button
          onClick={onToggleMobileMenu}
          className="shrink-0 rounded-lg p-2 text-muted transition-colors hover:bg-surface-subtle hover:text-primary lg:hidden"
          title="Open navigation"
          aria-label="Open navigation"
          type="button"
        >
          <Icon name="menu" className="material-symbols-outlined text-icon-lg" />
        </button>

        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="group relative flex h-9 w-full min-w-0 items-center gap-2 rounded-lg border border-subtle bg-surface-canvas pl-9 pr-3 text-left text-body text-faint transition-colors hover:border-strong hover:bg-surface-subtle"
          aria-label="Open command palette"
        >
          <Icon
            name="search"
            className="material-symbols-outlined pointer-events-none absolute left-2.5 text-icon-md text-faint transition-colors group-hover:text-accent"
          />
          <span className="min-w-0 flex-1 truncate">
            {searchQuery || 'Search SKU, order ID, customer, HSN'}
          </span>
          <kbd className="hidden shrink-0 items-center gap-0.5 rounded border border-subtle bg-surface-subtle px-1.5 py-0.5 text-micro text-muted sm:flex">
            <span>⌘</span>
            <span>K</span>
          </kbd>
        </button>
      </div>

      {/* Right: telemetry, utilities and profile */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-space-md">
        <div className="hidden items-center xl:flex">
          <Badge variant="success" className="gap-2 font-medium">
            <span className="h-2 w-2 shrink-0 rounded-full bg-status-success" />
            Sync live
          </Badge>
        </div>

        <div className="hidden items-center gap-1.5 rounded-lg border border-subtle bg-surface-subtle px-space-sm py-1.5 text-label font-medium text-primary md:flex">
          <Icon name="calendar_today" className="material-symbols-outlined text-icon text-faint" />
          <span className="tabular-nums">{todayStr}</span>
        </div>

        <div className="flex items-center gap-1 border-l border-subtle pl-2 sm:pl-space-md">
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenNotifications}
            className="relative h-9 w-9"
            title="Operational alerts"
            aria-label={`Operational alerts${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            type="button"
          >
            <Icon name="notifications" className="material-symbols-outlined text-icon-lg" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-danger-solid px-1 text-micro font-semibold tabular-nums text-on-accent">
                {unreadCount}
              </span>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenCommandPalette}
            className="hidden h-9 w-9 sm:inline-flex"
            title="Help and shortcuts"
            aria-label="Help and shortcuts"
            type="button"
          >
            <Icon name="help_outline" className="material-symbols-outlined text-icon-lg" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9"
            title={`Theme: ${THEME_LABEL[theme] || theme}`}
            aria-label={`Theme: ${THEME_LABEL[theme] || theme}. Activate to change.`}
            type="button"
          >
            <Icon
              name={theme === 'system' ? 'brightness_auto' : isDark ? 'dark_mode' : 'light_mode'}
              className="material-symbols-outlined text-icon-lg"
            />
          </Button>
        </div>

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            className="flex select-none items-center gap-space-sm rounded-lg border-l border-subtle py-1 pl-2 pr-1 transition-colors hover:bg-surface-subtle sm:pl-space-md"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage
                alt=""
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBY9Tgm6nn9TMViDB2K0jV_IgnR1CTQzPSh4UF1qP0xioyqkpMq3i7rxekw2L-XzIqJ7t0oI4QqiK1ZfohmEgXR501aua43kgyya37eW_Pnzg1T4YVEcL0PZnC5nDOlZkUy2t-rC3JITisM8eYFYMI4d6TLZtJcydeuJ8KukkLzD8BdJmW5hA7Jm3FflcjpsXIW5n5FvIgEXboyVtaKgQdoBRB4-htL-mHupOCj5v7x"
              />
              <AvatarFallback>AS</AvatarFallback>
            </Avatar>
            <span className="hidden flex-col text-left lg:flex">
              <span className="text-label font-semibold leading-tight text-primary">
                Ananya Sharma
              </span>
              <span className="text-micro leading-tight text-muted">
                VP Operations · {currentHub.id}
              </span>
            </span>
            <Icon name="expand_more" className="material-symbols-outlined text-icon text-faint" />
          </button>

          {profileOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-overlay mt-2 w-60 animate-zoom-in rounded-xl border border-subtle bg-overlay p-1.5 shadow-lg"
            >
              <div className="border-b border-subtle p-2 pb-2.5">
                <div className="text-meta font-semibold text-primary">Ananya Sharma</div>
                <div className="truncate text-micro text-muted">admin@everwear.test</div>
                <div className="mt-1.5 flex items-center gap-1.5 text-micro text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-status-success" />
                  Active node: {currentHub.name}
                </div>
              </div>
              <div className="pt-1.5">
                <button
                  role="menuitem"
                  onClick={() => setProfileOpen(false)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-meta text-primary transition-colors hover:bg-surface-subtle"
                  type="button"
                >
                  <Icon name="person" className="material-symbols-outlined text-icon" />
                  <span>Account settings</span>
                </button>
                <button
                  role="menuitem"
                  onClick={() => setProfileOpen(false)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-meta text-primary transition-colors hover:bg-surface-subtle"
                  type="button"
                >
                  <Icon name="security" className="material-symbols-outlined text-icon" />
                  <span>Role & API keys</span>
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    clearToken();
                    setProfileOpen(false);
                    window.location.reload();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-meta text-danger transition-colors hover:bg-status-danger-bg"
                  type="button"
                >
                  <Icon name="logout" className="material-symbols-outlined text-icon" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
