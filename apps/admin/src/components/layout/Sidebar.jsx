import React, { useState } from 'react';
import { Icon } from '../ui';
import { HUBS } from '../../data/mockData';

export function Sidebar({ 
  currentPath, 
  onNavigate, 
  currentHub, 
  onSelectHub, 
  isCollapsed, 
  onToggleCollapse,
  mobileOpen,
  onCloseMobile
}) {
  const [hubDropdownOpen, setHubDropdownOpen] = useState(false);

  const menuSections = [
    {
      title: 'CORE',
      items: [
        { path: 'overview', label: 'Overview', icon: 'dashboard' },
        { path: 'analytics-and-reports', label: 'Analytics & Reports', icon: 'insights' },
      ],
    },
    {
      title: 'CATALOG & INVENTORY',
      items: [
        { path: 'products', label: 'Products', icon: 'checkroom' },
        { path: 'categories-and-collections', label: 'Categories & Collections', icon: 'folder_open' },
        { path: 'inventory-and-warehouses', label: 'Inventory & Warehouses', icon: 'warehouse', badge: '12 Low', badgeColor: 'bg-status-warning-bg text-status-warning' },
        { path: 'purchase-orders-and-suppliers', label: 'Purchase Orders & Suppliers', icon: 'local_shipping' },
      ],
    },
    {
      title: 'FULFILLMENT & ORDERS',
      items: [
        { path: 'order-management', label: 'Order Management', icon: 'shopping_bag', badge: '84 New', badgeColor: 'bg-status-info-bg text-status-info' },
        { path: 'returns-and-exchanges', label: 'Returns & Exchanges', icon: 'swap_horizontal_circle', badge: '19 Pending', badgeColor: 'bg-status-warning-bg text-status-warning' },
        { path: 'shipments-and-dispatch', label: 'Shipments & Dispatch', icon: 'flight_takeoff' },
      ],
    },
    {
      title: 'FINANCE & COMPLIANCE',
      items: [
        { path: 'gst-and-tax-invoices', label: 'GST & Tax Invoices', icon: 'receipt_long' },
        { path: 'payments-and-reconciliation', label: 'Payments & Reconciliation', icon: 'account_balance_wallet' },
        { path: 'credit-notes-and-refunds', label: 'Credit Notes & Refunds', icon: 'currency_exchange' },
      ],
    },
    {
      title: 'SETTINGS & ADMIN',
      items: [
        { path: 'customers-and-loyalty', label: 'Customers & Loyalty', icon: 'group' },
        { path: 'promotions-and-coupons', label: 'Promotions & Coupons', icon: 'sell' },
        { path: 'users-and-role-access', label: 'Users & Role Access', icon: 'admin_panel_settings' },
        { path: 'system-settings', label: 'System Settings', icon: 'settings' },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside 
        className={`fixed left-0 top-0 h-screen bg-surface-container-lowest border-r border-border-subtle z-50 flex flex-col justify-between select-none transition-all duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          isCollapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
      >
        <div className="flex flex-col min-h-0 flex-1">
          {/* Logo and Brand Header */}
          <div className={`h-16 flex items-center border-b border-border-subtle shrink-0 ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
            <div 
              className="flex items-center gap-2.5 cursor-pointer"
              onClick={() => {
                onNavigate('overview');
                onCloseMobile?.();
              }}
            >
              <img
                src="/brand/aveliq-monogram-mark.svg"
                alt=""
                className="w-8 h-8 shrink-0"
              />
              {!isCollapsed && (
                <img
                  src="/brand/aveliq-wordmark-mark.svg"
                  alt="AVELIQ"
                  className="h-5 w-auto"
                />
              )}
            </div>
            {!isCollapsed && (
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full bg-status-info-bg text-status-info border border-border-subtle font-label-xs-caps text-[10px] tracking-wider font-semibold">
                  PROD-IN-01
                </span>
                <button 
                  onClick={onCloseMobile}
                  className="lg:hidden p-1 text-secondary hover:text-text-primary rounded-lg"
                  type="button"
                >
                  <Icon name="close" className="material-symbols-outlined text-[18px]" />
                </button>
              </div>
            )}
          </div>

          {/* Scrollable Navigation Tree */}
          <div className="overflow-y-auto overflow-x-hidden flex-1 px-3 py-3 space-y-3.5 no-scrollbar">
            {menuSections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-1">
                {!isCollapsed && (
                  <div className="px-2 py-0.5 font-label-xs-caps text-label-xs-caps text-text-secondary uppercase tracking-wider font-semibold text-[11px]">
                    {section.title}
                  </div>
                )}
                <nav className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = currentPath === item.path;
                    return (
                      <button
                        key={item.path}
                        onClick={() => {
                          onNavigate(item.path);
                          onCloseMobile?.();
                        }}
                        className={`w-full group flex items-center justify-between px-2.5 py-1.5 rounded-xl font-body-sm text-body-sm transition-all text-left ${
                          isActive
                            ? 'bg-primary-container text-on-primary font-medium shadow-xs'
                            : 'text-on-surface-variant hover:bg-surface-subtle hover:text-on-surface'
                        }`}
                        title={isCollapsed ? item.label : undefined}
                        type="button"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon name={item.icon} 
                            className={`material-symbols-outlined text-[18px] shrink-0 transition-colors ${
                              isActive 
                                ? 'text-on-primary' 
                                : 'text-secondary group-hover:text-on-surface'
                            }`}
                           />
                          {!isCollapsed && (
                            <span className="truncate">{item.label}</span>
                          )}
                        </div>
                        {!isCollapsed && item.badge && (
                          <span 
                            className={`px-1.5 py-0.5 rounded-full font-label-xs-caps text-[10px] border border-border-subtle shrink-0 ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : item.badgeColor
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Area: Node Hub Selector & Collapse Button */}
        <div className="p-3 border-t border-border-subtle bg-surface-container-lowest shrink-0 space-y-2">
          {/* Node Hub Dropdown Switcher */}
          {!isCollapsed ? (
            <div className="relative">
              <button 
                onClick={() => setHubDropdownOpen(!hubDropdownOpen)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-surface-subtle border border-border-subtle hover:bg-surface-container transition-colors text-left"
                type="button"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <Icon name="hub" className="material-symbols-outlined text-[16px] text-secondary shrink-0" />
                  <div className="flex flex-col truncate">
                    <span className="font-label-xs-caps text-[9px] text-text-secondary truncate">
                      NODE HUB
                    </span>
                    <span className="font-label-sm text-[12px] font-semibold text-text-primary truncate">
                      {currentHub.name}
                    </span>
                  </div>
                </div>
                <Icon name="unfold_more" className="material-symbols-outlined text-[18px] text-secondary shrink-0" />
              </button>

              {/* Hub Dropdown Menu */}
              {hubDropdownOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1.5 bg-surface-container-lowest rounded-xl shadow-xl border border-border-subtle p-1.5 space-y-0.5 z-50">
                  <div className="px-2 py-1 font-label-xs-caps text-[10px] text-text-secondary uppercase">
                    Select National Fulfillment Node
                  </div>
                  {HUBS.map((hub) => (
                    <button
                      key={hub.id}
                      onClick={() => {
                        onSelectHub(hub);
                        setHubDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors ${
                        currentHub.id === hub.id 
                          ? 'bg-primary-container text-on-primary font-medium' 
                          : 'hover:bg-surface-subtle text-text-primary'
                      }`}
                      type="button"
                    >
                      <div className="flex flex-col text-left">
                        <span className="font-semibold">{hub.name}</span>
                        <span className="text-[10px] opacity-75">{hub.location}</span>
                      </div>
                      <span className="text-[10px] font-mono">{hub.capacity}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-center">
              <button 
                onClick={() => setHubDropdownOpen(!hubDropdownOpen)}
                className="p-2 rounded-xl bg-surface-subtle hover:bg-surface-container text-secondary hover:text-text-primary"
                title={`Active Hub: ${currentHub.name}`}
                type="button"
              >
                <Icon name="hub" className="material-symbols-outlined text-[18px]" />
              </button>
            </div>
          )}

          {/* Version & Collapse Toggle */}
          <div className="flex items-center justify-between pt-1 px-1">
            {!isCollapsed && (
              <span className="font-label-xs-caps text-[10px] text-text-secondary">
                AVELIQ Ops
              </span>
            )}
            <button
              onClick={onToggleCollapse}
              className={`p-1 text-secondary hover:text-text-primary hover:bg-surface-subtle rounded-lg transition-colors flex items-center ${
                isCollapsed ? 'mx-auto' : ''
              }`}
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              type="button"
            >
              <Icon name={isCollapsed ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left'} className="material-symbols-outlined text-[16px]" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
