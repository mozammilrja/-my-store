import React, { useState, useEffect } from 'react';
import { Icon } from '../ui';

export function CommandPalette({ isOpen, onClose, onNavigate, onAction }) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open
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

  const items = [
    { type: 'view', title: 'Executive Operations Overview', subtitle: 'Consolidated real-time fashion telemetry', path: 'overview', icon: 'dashboard' },
    { type: 'view', title: 'Enterprise Fashion Analytics & Revenue Operations', subtitle: 'Multi-channel unit economics, GMV run-rate, SKU margins', path: 'analytics-and-reports', icon: 'insights' },
    { type: 'view', title: 'Order Management & Fulfillment Dispatch', subtitle: '84,210 orders, carrier allocation, live tracking', path: 'order-management', icon: 'shopping_bag' },
    { type: 'view', title: 'Returns, Reverse Logistics & Refund Operations', subtitle: 'Inbound QC dock, Grade A-C triage, instant UPI refunds', path: 'returns-and-exchanges', icon: 'swap_horizontal_circle' },
    { type: 'view', title: 'Omnichannel Inventory & Multi-Node Warehousing', subtitle: 'Real-time stock ledger, bin allocations, cycle counts', path: 'inventory-and-warehouses', icon: 'warehouse' },
    { type: 'view', title: 'Purchase Orders & Supplier Relationship Management', subtitle: '14 Mill partners, organic cotton & silk procurement', path: 'purchase-orders-and-suppliers', icon: 'local_shipping' },
    { type: 'view', title: 'GST Compliance, Tax Invoices & E-Way Bills', subtitle: 'GSTR-1 JSON, IRN verification, HSN rate master', path: 'gst-and-tax-invoices', icon: 'receipt_long' },
    { type: 'view', title: 'Payment Gateway Settlement & Financial Reconciliation', subtitle: 'Razorpay, PayU, Stripe UTR matching & COD remittances', path: 'payments-and-reconciliation', icon: 'account_balance_wallet' },
    { type: 'view', title: 'Fashion Product Catalog & Variant Master', subtitle: 'Atelier mulberry silk, SKU matrices, GST setup', path: 'products', icon: 'checkroom' },
    { type: 'order', title: 'EVR-984210-BLR (Priyanka Sengupta)', subtitle: '₹4,890.00 • BlueDart Express • Ready to handover', path: 'order-management', orderId: 'EVR-984210-BLR', icon: 'local_shipping' },
    { type: 'order', title: 'EVR-984209-BOM (Karan Mehra)', subtitle: '₹3,450.00 • Delhivery • Allocating Picker', path: 'order-management', orderId: 'EVR-984209-BOM', icon: 'local_shipping' },
    { type: 'sku', title: 'EVR-WDR-2024-MULB (Mulberry Silk Pleated Dress)', subtitle: 'Autumn / Atelier 24 • 10 Variants Active', path: 'products', icon: 'texture' },
    { type: 'action', title: 'Flash Sync All 4 Node Hubs', subtitle: 'Bengaluru, Mumbai, Delhi, Kolkata', action: 'flash-sync', icon: 'sync' },
    { type: 'action', title: 'Export GST Compliance CSV', subtitle: 'Monthly GSTIN tax register', action: 'export-gst', icon: 'receipt_long' },
    { type: 'action', title: 'Generate Courier Batch Manifest', subtitle: 'Batch #4409 (14 staged orders)', action: 'bulk-manifest', icon: 'inventory_2' },
  ];

  const filtered = items.filter(item => 
    item.title.toLowerCase().includes(query.toLowerCase()) || 
    item.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-border-subtle overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-border-subtle gap-3">
          <Icon name="search" className="material-symbols-outlined text-secondary text-[22px]" />
          <input
            autoFocus
            type="text"
            className="flex-1 bg-transparent text-text-primary text-base placeholder:text-text-secondary focus:outline-none"
            placeholder="Type a command, SKU, Order ID, customer name or action..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="px-2 py-0.5 rounded bg-surface-subtle text-text-secondary text-xs border border-border-subtle">ESC</kbd>
        </div>

        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-text-secondary text-sm">
              No matching commands or resources found for "{query}".
            </div>
          ) : (
            filtered.map((item, index) => (
              <button
                key={index}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-surface-subtle transition-colors text-left group"
                onClick={() => {
                  if (item.action) {
                    onAction(item.action);
                  } else {
                    onNavigate(item.path, item.orderId);
                  }
                  onClose();
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-subtle group-hover:bg-primary-container group-hover:text-on-primary flex items-center justify-center text-primary transition-colors">
                    <Icon name={item.icon} className="material-symbols-outlined text-[18px]" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-text-primary group-hover:text-primary transition-colors">{item.title}</div>
                    <div className="text-xs text-text-secondary">{item.subtitle}</div>
                  </div>
                </div>
                <span className="text-xs text-secondary/60 group-hover:text-primary font-mono flex items-center gap-1">
                  Select <Icon name="arrow_forward" className="material-symbols-outlined text-[14px]" />
                </span>
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-2.5 bg-surface-subtle border-t border-border-subtle flex items-center justify-between text-xs text-text-secondary">
          <div className="flex items-center gap-4">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
            <span>ESC to close</span>
          </div>
          <span className="font-semibold text-primary">Everwear Omnichannel Engine</span>
        </div>
      </div>
    </div>
  );
}
