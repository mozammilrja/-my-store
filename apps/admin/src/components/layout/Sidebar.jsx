import React, { useState } from 'react';
import { HUBS } from '../../data/mockData';

export function Sidebar({ 
  currentPath, 
  onNavigate, 
  currentHub, 
  onSelectHub, 
  isCollapsed, 
  onToggleCollapse 
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
    <aside 
      className={`fixed left-0 top-0 h-screen bg-surface-container-lowest border-r border-border-subtle z-50 flex flex-col justify-between select-none transition-all duration-300 ${
        isCollapsed ? 'w-[72px]' : 'w-[280px]'
      }`}
    >
      <div className="flex flex-col min-h-0 flex-1">
        {/* Logo and Brand Header */}
        <div className={`h-16 flex items-center border-b border-border-subtle shrink-0 ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
          <div 
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => onNavigate('overview')}
          >
            <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center font-bold text-lg shadow-sm">
              E
            </div>
            {!isCollapsed && (
              <span className="font-headline-sm text-headline-sm text-text-primary tracking-tight font-semibold">
                Everwear
              </span>
            )}
          </div>
          {!isCollapsed && (
            <span className="px-2 py-0.5 rounded-full bg-status-info-bg text-status-info border border-border-subtle font-label-xs-caps text-[10px] tracking-wider font-semibold">
              PROD-IN-01
            </span>
          )}
        </div>

        {/* Scrollable Navigation Tree - Zero Horizontal Overflow */}
        <div className="overflow-y-auto overflow-x-hidden flex-1 px-3 py-3 space-y-3.5">
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
                      onClick={() => onNavigate(item.path)}
                      title={isCollapsed ? item.label : undefined}
                      className={`w-full group flex items-center justify-between px-2.5 py-2 rounded-xl transition-all ${
                        isActive
                          ? 'bg-primary-container text-on-primary font-medium shadow-sm'
                          : 'font-body-sm text-body-sm text-on-surface-variant hover:bg-surface-subtle hover:text-on-surface'
                      } ${isCollapsed ? 'justify-center px-1' : ''}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span 
                          className={`material-symbols-outlined text-[18px] shrink-0 transition-colors ${
                            isActive 
                              ? 'text-on-primary' 
                              : 'text-secondary group-hover:text-on-surface'
                          }`}
                        >
                          {item.icon}
                        </span>
                        {!isCollapsed && (
                          <span className="truncate text-left text-xs font-medium">{item.label}</span>
                        )}
                      </div>
                      {!isCollapsed && item.badge && (
                        <span 
                          className={`shrink-0 ml-1.5 px-2 py-0.5 rounded-full font-label-xs-caps text-[10px] font-semibold whitespace-nowrap border transition-colors ${
                            isActive
                              ? 'bg-white/20 text-white border-white/30'
                              : item.badgeColor 
                              ? `${item.badgeColor} border-border-subtle` 
                              : 'bg-surface-subtle text-text-secondary border-border-subtle'
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

      {/* Footer Node Hub Selector & Collapse Action */}
      <div className="p-3 border-t border-border-subtle bg-surface-container-lowest shrink-0 space-y-2 relative">
        {/* Node Hub Dropdown Menu */}
        {hubDropdownOpen && (
          <div className={`absolute bottom-full left-2 right-2 mb-2 bg-surface-container-lowest rounded-xl shadow-2xl border border-border-subtle p-2 space-y-1 z-50 ${isCollapsed ? 'w-56 left-12' : ''}`}>
            <div className="px-2 py-1 text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Switch Fulfillment Hub
            </div>
            {HUBS.map((hub) => (
              <button
                key={hub.id}
                onClick={() => {
                  onSelectHub(hub);
                  setHubDropdownOpen(false);
                }}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                  currentHub.id === hub.id 
                    ? 'bg-primary-container text-on-primary font-semibold' 
                    : 'hover:bg-surface-subtle text-text-primary'
                }`}
              >
                <div>
                  <div className="font-semibold">{hub.id}</div>
                  <div className={`text-[10px] ${currentHub.id === hub.id ? 'text-on-primary/80' : 'text-text-secondary'}`}>{hub.location}</div>
                </div>
                <span className="text-[10px] font-mono opacity-80">{hub.ping}</span>
              </button>
            ))}
          </div>
        )}

        <div 
          onClick={() => setHubDropdownOpen(!hubDropdownOpen)}
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-surface-subtle border border-border-subtle cursor-pointer hover:border-primary-container transition-all ${
            isCollapsed ? 'justify-center p-2' : ''
          }`}
          title={isCollapsed ? `Active Node: ${currentHub.id}` : 'Click to switch fulfillment node'}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="material-symbols-outlined text-[16px] text-primary shrink-0">hub</span>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="font-label-xs-caps text-[10px] text-text-secondary truncate">NODE HUB</span>
                <span className="font-label-sm text-label-sm font-semibold text-text-primary truncate">
                  {currentHub.id}
                </span>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">unfold_more</span>
          )}
        </div>

        <div className={`flex items-center justify-between pt-0.5 px-1 ${isCollapsed ? 'justify-center' : ''}`}>
          {!isCollapsed && (
            <span className="font-label-xs-caps text-label-xs-caps text-text-secondary text-[11px]">
              Everwear Ops v2.4
            </span>
          )}
          <button 
            onClick={onToggleCollapse}
            className="p-1 text-secondary hover:text-text-primary hover:bg-surface-subtle rounded-lg transition-colors flex items-center" 
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"} 
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">
              {isCollapsed ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left'}
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}
