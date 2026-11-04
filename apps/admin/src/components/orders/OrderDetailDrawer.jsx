import { formatMoney } from '../../lib/format';
import React, { useState } from 'react';
import {
  Icon,
  Card,
  Button,
  Separator,
  Textarea,
  Thumbnail,
  StatusBadge,
  EmptyState,
  ConfirmDialog,
} from '../ui';

/** Minor units in, a localised amount out. */
const money = (minor, currency) => formatMoney(Number(minor) || 0, currency);

const STATUS_VARIANT = {
  Delivered: 'success',
  Shipped: 'info',
  Cancelled: 'destructive',
  Returned: 'secondary',
  Unfulfilled: 'warning',
};

/**
 * The order inspector beside the table. Everything here is read off the
 * order the API returned; the status actions are the transitions
 * POST /admin/orders/:id/status and /cancel accept, and nothing else.
 */
export function OrderDetailDrawer({ order, onShowToast, onUpdateOrder, onClose, isUpdating = false }) {
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressInput, setAddressInput] = useState(order?.customer?.address || '');
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (!order) {
    return (
      <EmptyState
        icon="shopping_bag"
        title="No order selected"
        description="Select an order from the list to see its items, totals and status."
        className="min-w-0 xl:col-span-4"
      />
    );
  }

  const raw = order.rawBackend ?? {};
  const isCancelled = order.status === 'Cancelled';
  const canShip = !isCancelled && order.status === 'Unfulfilled';
  const canDeliver = !isCancelled && order.status === 'Shipped';
  // The API refuses to cancel a shipped order or one that has been paid.
  const canCancel = !isCancelled && order.status === 'Unfulfilled' && order.payment.paymentStatus !== 'paid';
  const currency = order.payment.currency;

  const setStatus = (status) => onUpdateOrder({ ...order, status });

  const handleSaveAddress = () => {
    onUpdateOrder({ ...order, customer: { ...order.customer, address: addressInput } });
    setEditingAddress(false);
    onShowToast({
      type: 'info',
      title: 'Address changed in this view',
      message: 'The stored order keeps its original address.',
    });
  };

  return (
    <Card className="flex min-w-0 flex-col overflow-hidden xl:col-span-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-space-sm border-b border-subtle bg-surface-subtle p-space-md">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex min-w-0 flex-wrap items-center gap-space-sm">
            <h2 className="font-mono text-subheading text-primary">{order.id}</h2>
            <StatusBadge status={order.status} variant={STATUS_VARIANT[order.status]} showDot size="sm" />
            <StatusBadge status={order.payment.statusBadge} variant={order.payment.statusVariant} size="sm" />
          </div>
          <span className="text-meta text-muted">
            {[order.orderDate && `Placed ${order.orderDate}`, order.shippingMethod].filter(Boolean).join(' · ')}
          </span>
        </div>
        {onClose && (
          <Button variant="ghost" size="iconSm" onClick={onClose} title="Close details" aria-label="Close order details">
            <Icon name="close" aria-hidden="true" className="material-symbols-outlined text-icon-md" />
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-space-lg p-space-md">
        {/* Customer and delivery address */}
        <section className="flex flex-col gap-space-sm">
          <div className="flex items-center justify-between gap-space-sm">
            <h3 className="text-subheading text-primary">Customer</h3>
            {!editingAddress && order.customer.address && (
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  setAddressInput(order.customer.address);
                  setEditingAddress(true);
                }}
              >
                Edit address
              </Button>
            )}
          </div>
          <div className="flex flex-col gap-0.5 text-meta">
            <span className="text-label text-primary">{order.customer.name}</span>
            <span className="truncate text-muted">{order.customer.email}</span>
            {order.customer.phone && <span className="text-muted">{order.customer.phone}</span>}
          </div>
          {editingAddress ? (
            <div className="flex flex-col gap-space-sm">
              <Textarea
                rows={2}
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                aria-label="Delivery address"
              />
              <div className="flex items-center gap-space-sm">
                <Button size="sm" variant="primary" onClick={handleSaveAddress}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingAddress(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-meta text-secondary">{order.customer.address ?? 'No delivery address on the order.'}</p>
          )}
        </section>

        <Separator />

        {/* Line items */}
        <section className="flex flex-col gap-space-sm">
          <h3 className="text-subheading text-primary">
            Items <span className="text-meta font-normal text-muted">({order.items.length})</span>
          </h3>
          {order.items.length === 0 ? (
            <p className="text-meta text-muted">This order has no line items.</p>
          ) : (
            <ul className="flex max-h-56 flex-col gap-space-sm overflow-y-auto">
              {order.items.map((it) => (
                <li key={it.id} className="flex items-center gap-space-sm">
                  <Thumbnail src={it.image} alt="" className="h-12 w-10 rounded-md" imgClassName="object-cover" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-label text-primary">{it.name}</span>
                    {it.variant && <span className="truncate text-micro text-muted">{it.variant}</span>}
                    {it.sku && <span className="truncate font-mono text-micro text-muted">{it.sku}</span>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <span className="whitespace-nowrap text-num tabular-nums text-primary">{it.price}</span>
                    <span className="text-micro tabular-nums text-muted">× {it.qty}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Totals, straight from the order's own totals block. The API reports
            one tax figure, so no intra/inter-state split is invented. */}
        <dl className="flex flex-col gap-space-xs rounded-lg border border-subtle bg-surface-subtle p-space-md text-body">
          <div className="flex justify-between gap-space-md">
            <dt className="text-secondary">Item subtotal</dt>
            <dd className="whitespace-nowrap tabular-nums text-primary">{money(order.payment.itemSubtotal, currency)}</dd>
          </div>
          {order.payment.discountTotal > 0 && (
            <div className="flex justify-between gap-space-md">
              <dt className="text-secondary">Discount</dt>
              <dd className="whitespace-nowrap tabular-nums text-success">−{money(order.payment.discountTotal, currency)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-space-md">
            <dt className="text-secondary">Shipping</dt>
            <dd className="whitespace-nowrap tabular-nums text-primary">
              {order.payment.shippingTotal > 0 ? money(order.payment.shippingTotal, currency) : 'Free'}
            </dd>
          </div>
          <div className="flex justify-between gap-space-md">
            <dt className="text-secondary">Tax</dt>
            <dd className="whitespace-nowrap tabular-nums text-primary">{money(order.payment.taxTotal, currency)}</dd>
          </div>
          <Separator className="my-space-xs" />
          <div className="flex justify-between gap-space-md text-subheading">
            <dt className="text-primary">Total <span className="text-meta font-normal text-muted">({order.payment.method})</span></dt>
            <dd className="whitespace-nowrap tabular-nums text-primary">{money(order.payment.total, currency)}</dd>
          </div>
        </dl>

        {/* Shipment */}
        <section className="flex flex-col gap-space-sm">
          <h3 className="text-subheading text-primary">Shipment</h3>
          {order.shipment ? (
            <dl className="flex flex-col gap-space-xs text-meta">
              <div className="flex justify-between gap-space-md">
                <dt className="text-muted">Carrier</dt>
                <dd className="text-primary">{order.shipment.carrier}</dd>
              </div>
              <div className="flex justify-between gap-space-md">
                <dt className="text-muted">AWB</dt>
                <dd className="font-mono text-primary">{order.shipment.awb}</dd>
              </div>
              {order.shipment.status && (
                <div className="flex justify-between gap-space-md">
                  <dt className="text-muted">Carrier status</dt>
                  <dd className="text-primary">{String(order.shipment.status).replace(/_/g, ' ')}</dd>
                </div>
              )}
              {raw.shipment?.labelUrl && (
                <a
                  href={raw.shipment.labelUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-label text-accent hover:underline"
                >
                  Open shipping label
                </a>
              )}
            </dl>
          ) : (
            <p className="text-meta text-muted">
              {isCancelled ? 'This order was cancelled before it shipped.' : 'No shipment has been booked yet.'}
            </p>
          )}
        </section>
      </div>

      {/* Status actions */}
      {(canShip || canDeliver || canCancel) && (
        <div className="flex flex-wrap items-center justify-end gap-space-sm border-t border-subtle bg-surface-subtle p-space-md">
          {canCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmCancel(true)}
              disabled={isUpdating}
              className="text-danger hover:bg-status-danger-bg hover:text-danger"
            >
              Cancel order
            </Button>
          )}
          {canShip && (
            <Button variant="primary" size="sm" onClick={() => setStatus('Shipped')} disabled={isUpdating}>
              <Icon name="local_shipping" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
              <span>Mark as shipped</span>
            </Button>
          )}
          {canDeliver && (
            <Button variant="primary" size="sm" onClick={() => setStatus('Delivered')} disabled={isUpdating}>
              <Icon name="check" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
              <span>Mark as delivered</span>
            </Button>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => {
          setConfirmCancel(false);
          setStatus('Cancelled');
        }}
        title={`Cancel order ${order.id}?`}
        message="The order is cancelled and its stock is released. This cannot be undone."
        confirmText="Cancel order"
        cancelText="Keep order"
        isLoading={isUpdating}
      />
    </Card>
  );
}
