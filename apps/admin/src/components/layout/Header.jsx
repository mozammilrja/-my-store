import React, { useState } from 'react';
import { Badge, Button, Input, Avatar, AvatarImage, AvatarFallback } from '../ui';

export function Header({ 
  isCollapsed, 
  onOpenCommandPalette, 
  onOpenNotifications, 
  isDarkMode, 
  onToggleDarkMode, 
  currentHub,
  searchQuery,
  onSearchChange,
  unreadCount = 3,
  onToggleMobileMenu
}) {
  const [profileOpen, setProfileOpen] = useState(false);

  const todayStr = new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date());

  return (
    <header 
      className={`fixed top-0 right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-md border-b border-border-subtle z-40 px-4 md:px-space-lg flex items-center justify-between transition-all duration-300 left-0 ${
        isCollapsed ? 'lg:left-[72px]' : 'lg:left-[260px]'
      }`}
    >
      {/* Left: Mobile Hamburger & Search Input Bar */}
      <div className="flex items-center gap-2 md:gap-space-md w-full max-w-md">
        {/* Mobile Hamburger Menu Toggle */}
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-xl text-secondary hover:text-text-primary hover:bg-surface-subtle transition-colors shrink-0"
          title="Open Navigation Menu"
          type="button"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>

        {/* Global Search Bar */}
        <div 
          onClick={onOpenCommandPalette}
          className="relative w-full flex items-center cursor-pointer group"
        >
          <span className="material-symbols-outlined absolute left-3 text-secondary text-[18px] pointer-events-none group-hover:text-primary transition-colors">
            search
          </span>
          <Input 
            readOnly
            value={searchQuery || ''}
            className="pl-9 pr-14 h-9 bg-surface-canvas cursor-pointer group-hover:border-primary/50 text-xs sm:text-sm" 
            placeholder="Search SKU, Order ID, Customer, HSN... (⌘K)" 
            type="text"
          />
          <div className="absolute right-2.5 hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-surface-subtle border border-border-subtle text-text-secondary font-label-xs-caps text-[10px]">
            <span>⌘</span>
            <span>K</span>
          </div>
        </div>
      </div>

      {/* Right Controls & Operational Telemetry */}
      <div className="flex items-center gap-2 sm:gap-space-md">
        {/* Live Sync Status Pill */}
        <div className="hidden xl:flex items-center">
          <Badge variant="success" className="gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-status-success animate-pulse"></span>
            Sync: Live • 1,248 TPS
          </Badge>
        </div>

        {/* Date Display */}
        <div className="hidden md:flex items-center gap-1.5 px-space-sm py-1 rounded-xl bg-surface-subtle border border-border-subtle text-text-primary font-label-sm text-label-sm font-medium">
          <span className="material-symbols-outlined text-[16px] text-secondary">calendar_today</span>
          <span>Today: {todayStr}</span>
        </div>

        {/* Utility Icon Buttons */}
        <div className="flex items-center gap-1 border-l border-border-subtle pl-2 sm:pl-space-md">
          {/* Notifications */}
          <Button 
            variant="ghost"
            size="icon"
            onClick={onOpenNotifications}
            className="relative h-9 w-9 text-secondary hover:text-text-primary" 
            title="Operational Alerts" 
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-status-danger text-on-error font-label-xs-caps text-[10px] flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </Button>

          {/* Help & Documentation */}
          <Button 
            variant="ghost"
            size="icon"
            onClick={onOpenCommandPalette}
            className="h-9 w-9 text-secondary hover:text-text-primary hidden sm:inline-flex" 
            title="Help & Shortcuts" 
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">help_outline</span>
          </Button>

          {/* Theme Toggle (Dark / Light) */}
          <Button 
            variant="ghost"
            size="icon"
            onClick={onToggleDarkMode}
            className="h-9 w-9 text-secondary hover:text-text-primary" 
            title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`} 
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">
              {isDarkMode ? 'dark_mode' : 'light_mode'}
            </span>
          </Button>
        </div>

        {/* User Profile */}
        <div className="relative">
          <div 
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-space-sm pl-2 sm:pl-space-md border-l border-border-subtle cursor-pointer select-none"
          >
            <Avatar className="h-8 w-8 ring-1 ring-border-subtle">
              <AvatarImage 
                alt="Ananya Sharma Profile" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBY9Tgm6nn9TMViDB2K0jV_IgnR1CTQzPSh4UF1qP0xioyqkpMq3i7rxekw2L-XzIqJ7t0oI4QqiK1ZfohmEgXR501aua43kgyya37eW_Pnzg1T4YVEcL0PZnC5nDOlZkUy2t-rC3JITisM8eYFYMI4d6TLZtJcydeuJ8KukkLzD8BdJmW5hA7Jm3FflcjpsXIW5n5FvIgEXboyVtaKgQdoBRB4-htL-mHupOCj5v7x"
              />
              <AvatarFallback>AS</AvatarFallback>
            </Avatar>
            <div className="hidden lg:flex flex-col text-left">
              <span className="font-label-sm text-label-sm font-semibold text-text-primary leading-tight">
                Ananya Sharma
              </span>
              <span className="font-label-xs-caps text-[10px] text-text-secondary leading-tight">
                VP Operations | {currentHub.id}
              </span>
            </div>
            <span className="material-symbols-outlined text-[16px] text-secondary">expand_more</span>
          </div>

          {/* User Profile Dropdown Menu */}
          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-surface-container-lowest rounded-xl shadow-2xl border border-border-subtle p-2 space-y-1 z-50 animate-fade-in">
              <div className="p-2 border-b border-border-subtle">
                <div className="font-semibold text-xs text-text-primary">Ananya Sharma</div>
                <div className="text-[11px] text-text-secondary truncate">admin@everwear.test</div>
                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-status-success font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-success"></span>
                  Active Node: {currentHub.name}
                </div>
              </div>
              <button 
                onClick={() => setProfileOpen(false)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-surface-subtle text-text-primary flex items-center gap-2"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">person</span>
                <span>User Account Settings</span>
              </button>
              <button 
                onClick={() => setProfileOpen(false)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-surface-subtle text-text-primary flex items-center gap-2"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">security</span>
                <span>Role & API Keys</span>
              </button>
              <button 
                onClick={() => setProfileOpen(false)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-surface-subtle text-status-danger flex items-center gap-2"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
