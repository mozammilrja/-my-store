import React from 'react';
import { Icon, Badge, Button, Separator } from '../ui';

export function NotificationsModal({ isOpen, onClose, onAction }) {
  if (!isOpen) return null;

  const notifications = [
    {
      id: 1,
      type: 'danger',
      icon: 'error',
      title: 'Critical Buffer Breach Alert',
      time: '2 mins ago',
      desc: '42 apparel SKUs in Bengaluru Hub (BLR-FC1) fell below safe threshold (< 15 units).',
      action: 'Auto-Rebalance Inventory',
      badge: 'URGENT'
    },
    {
      id: 2,
      type: 'warning',
      icon: 'warning',
      title: '3PL Carrier Latency in Bhiwandi',
      time: '18 mins ago',
      desc: 'Delhivery express scans delayed 45 mins at BOM-FC2 dock. Risking flight handoff cutoff.',
      action: 'Reroute to BlueDart Aviation',
      badge: 'CARRIER SLA'
    },
    {
      id: 3,
      type: 'info',
      icon: 'rocket_launch',
      title: 'Festive Drop Staging Complete',
      time: '42 mins ago',
      desc: 'Autumn Atelier drop pre-allocated into pick-bin fast paths across 4 national fulfillment centers.',
      action: 'View Staging Matrix',
      badge: 'EVENT'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 pt-16 bg-black/30 backdrop-blur-xs animate-fade-in" onClick={onClose}>
      <div 
        className="w-full max-w-sm bg-surface-container-lowest rounded-2xl shadow-2xl border border-border-subtle overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="notifications_active" className="material-symbols-outlined text-primary text-[20px]" />
            <span className="font-headline-sm text-sm font-bold text-text-primary">Ops Notifications</span>
            <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-bold">3</Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 text-secondary hover:text-text-primary">
            <Icon name="close" className="material-symbols-outlined text-[18px]" />
          </Button>
        </div>

        <div className="divide-y divide-border-subtle max-h-[420px] overflow-y-auto">
          {notifications.map((n) => (
            <div key={n.id} className="p-4 hover:bg-surface-subtle transition-colors flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <Badge 
                  variant={n.type === 'danger' ? 'destructive' : n.type === 'warning' ? 'warning' : 'info'}
                  className="text-[10px] font-bold tracking-wider uppercase py-0"
                >
                  {n.badge}
                </Badge>
                <span className="text-[11px] text-text-secondary">{n.time}</span>
              </div>
              <h4 className="font-semibold text-xs text-text-primary flex items-center gap-1.5">
                <Icon name={n.icon} className={`material-symbols-outlined text-[16px] ${
                  n.type === 'danger' ? 'text-status-danger' :
                  n.type === 'warning' ? 'text-status-warning' : 'text-status-info'
                }`} />
                {n.title}
              </h4>
              <p className="text-xs text-text-secondary leading-relaxed">{n.desc}</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  onAction(n.action);
                  onClose();
                }}
                className="p-0 h-auto justify-start text-xs font-semibold text-primary"
              >
                {n.action} <Icon name="arrow_forward" className="material-symbols-outlined text-[14px] ml-1" />
              </Button>
            </div>
          ))}
        </div>

        <div className="p-3 bg-surface-subtle border-t border-border-subtle text-center">
          <Button 
            variant="ghost"
            size="sm"
            onClick={() => {
              onAction('mark-all-read');
              onClose();
            }}
            className="text-xs font-semibold text-text-secondary hover:text-text-primary h-auto py-1"
          >
            Mark all 3 alerts as acknowledged
          </Button>
        </div>
      </div>
    </div>
  );
}
