import React, { useState } from 'react';
import { Icon,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Separator,
  Thumbnail,
} from '../ui';

export function OrderDetailDrawer({ order, onShowToast, onUpdateOrder, onClose }) {
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressInput, setAddressInput] = useState(order?.customer?.address || '');
  const [showActivityLog, setShowActivityLog] = useState(false);

  if (!order) {
    return (
      <Card className="flex min-h-[400px] min-w-0 flex-col items-center justify-center p-space-lg text-center xl:col-span-4">
        <Icon name="shopping_bag" className="material-symbols-outlined text-icon-2xl text-muted/40" />
        <h3 className="text-subheading font-semibold text-primary mt-2">No Order Selected</h3>
        <p className="text-body text-secondary mt-1">Select an order from the list to view its complete fulfillment telemetry.</p>
      </Card>
    );
  }

  const handlePrintLabel = () => {
    onShowToast({
      type: 'info',
      title: 'Shipping Label Generated',
      message: `Thermal shipping label generated for AWB #${order.courier.awb}. Sent to Zebra Hub Printer.`,
    });
  };

  const handleDownloadSlip = () => {
    onShowToast({
      type: 'success',
      title: 'Packing Slip Exported',
      message: `Packing slip for ${order.id} downloaded in PDF format.`,
    });
  };

  const handleReassignCarrier = () => {
    onShowToast({
      type: 'warning',
      title: 'Carrier Allocation Re-Evaluated',
      message: `Checked 3PL rate cards for ${order.id}. Current optimal: ${order.courier.partner}.`,
    });
  };

  const handleSaveAddress = () => {
    const updated = {
      ...order,
      customer: {
        ...order.customer,
        address: addressInput
      }
    };
    onUpdateOrder(updated);
    setEditingAddress(false);
    onShowToast({
      type: 'success',
      title: 'Address Updated',
      message: 'Consignee delivery address updated for dispatch routing.',
    });
  };

  const handleAdvanceStep = (stepIndex) => {
    const updatedTimeline = order.timeline.map(t => {
      if (t.step <= stepIndex) {
        return { ...t, done: true, isCurrent: t.step === stepIndex };
      }
      return { ...t, done: false, isCurrent: false };
    });
    const updated = {
      ...order,
      currentTimelineStep: stepIndex,
      timeline: updatedTimeline
    };
    onUpdateOrder(updated);
    onShowToast({
      type: 'info',
      title: 'Lifecycle Progressed',
      message: `Order ${order.id} step updated to Step ${stepIndex}.`,
    });
  };

  const handleHoldCancel = () => {
    onShowToast({
      type: 'danger',
      title: 'Order Flagged on Hold',
      message: `Order ${order.id} has been placed in Exception Review Queue.`,
    });
  };

  return (
    <Card className="flex min-w-0 flex-col gap-space-md p-space-md shadow-md xl:col-span-4">
      {/* Drill-Down Header */}
      <div className="flex flex-col gap-2 pb-space-sm bg-surface-subtle -m-space-md p-space-md rounded-t-xl border-b border-subtle">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-status-success" />
            <span className="text-subheading font-semibold text-primary">
              {order.id}
            </span>
            <Badge variant="default" size="sm">
              {order.stageBadge || 'READY TO HANDOVER'}
            </Badge>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1">
            <Button
              variant="outline"
              size="iconSm"
              onClick={handlePrintLabel}
              className="bg-surface-container-lowest"
              title="Print Shipping Label"
            >
              <Icon name="print" className="material-symbols-outlined text-icon-md" />
            </Button>
            <Button
              variant="outline"
              size="iconSm"
              onClick={handleReassignCarrier}
              className="bg-surface-container-lowest"
              title="Re-assign Carrier"
            >
              <Icon name="swap_horiz" className="material-symbols-outlined text-icon-md" />
            </Button>
            <Button
              variant="outline"
              size="iconSm"
              onClick={handleDownloadSlip}
              className="bg-surface-container-lowest"
              title="Download Packing Slip"
            >
              <Icon name="download" className="material-symbols-outlined text-icon-md" />
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 hover:bg-surface-subtle text-muted hover:text-primary ml-1"
                title="Close Details (Expand Table)"
              >
                <Icon name="close" className="material-symbols-outlined text-icon-md" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted">
          <span>Placed: <strong className="text-primary font-medium">{order.orderDate}</strong></span>
          <span>•</span>
          <span>Channel: <strong className="text-primary font-medium">{order.channel}</strong></span>
          <span>•</span>
          <span>Warehouse: <strong className="text-accent font-semibold">{order.nodeFc}</strong></span>
        </div>
      </div>

      {/* Consignee Customer & Delivery Routing Strip */}
      <div className="bg-surface-canvas p-space-sm rounded-lg flex items-start justify-between gap-space-sm border border-subtle/60">
        <div className="flex items-start gap-2.5">
          <Icon name="pin_drop" className="material-symbols-outlined text-accent text-icon-lg mt-0.5" />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-label-lg font-semibold text-primary">
                {order.customer.name}
              </span>
              <Badge variant="success" className="text-micro py-0 px-1.5 font-semibold">
                PINCODE VERIFIED
              </Badge>
              <span className={`px-1.5 py-px rounded text-micro font-semibold ${order.customer.tierBadgeClass}`}>
                {order.customer.tier}
              </span>
            </div>

            {editingAddress ? (
              <div className="mt-2 space-y-2">
                <textarea
                  className="w-full text-meta p-2 rounded-lg border border-primary focus:outline-none bg-surface-container-lowest text-primary"
                  rows="2"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleSaveAddress}
                    className="h-7 text-meta"
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingAddress(false)}
                    className="h-7 text-meta"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-body text-secondary mt-0.5">
                {order.customer.address}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-caption text-muted">
              <span className="font-mono whitespace-nowrap">Phone: {order.customer.phone}</span>
              <span>•</span>
              <span>Delivery Instructions: "{order.customer.deliveryInstructions}"</span>
            </div>
          </div>
        </div>
        {!editingAddress && (
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              setAddressInput(order.customer.address);
              setEditingAddress(true);
            }}
            className="shrink-0 p-0 h-auto text-caption font-semibold"
          >
            Edit
          </Button>
        )}
      </div>

      {/* Line Items Section (Fashion Catalog Presentation) */}
      <div className="space-y-space-xs">
        <div className="flex items-center justify-between">
          <span className="text-caption uppercase tracking-wider font-semibold text-muted">
            Ordered Apparel Items ({order.items.length} SKUs)
          </span>
          <span className="text-caption text-muted">
            Total Weight: <strong className="text-primary">{order.totalWeight}</strong>
          </span>
        </div>
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {order.items.map((it) => (
            <div
              key={it.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-subtle bg-surface-subtle p-2.5 transition-colors hover:bg-surface-container"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Thumbnail src={it.image} alt={it.name} className="w-12 h-14 rounded-md shadow-xs shrink-0" imgClassName="object-cover" />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-label-lg font-semibold text-primary">
                    {it.name}
                  </span>
                  <span className="truncate font-mono text-micro text-muted">
                    SKU: {it.sku} • {it.hsn}
                  </span>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="text-micro py-0 px-1.5 font-normal">
                      Size: <strong className="ml-1 font-semibold">{it.size}</strong>
                    </Badge>
                    <Badge variant="outline" className="text-micro py-0 px-1.5 font-normal">
                      Color: <strong className="ml-1 font-semibold">{it.color}</strong>
                    </Badge>
                    <Badge variant="outline" className="text-micro py-0 px-1.5 font-normal">
                      Qty: <strong className="ml-1 font-semibold">{it.qty}</strong>
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end whitespace-nowrap">
                <span className="text-label-lg font-semibold text-primary tabular-nums">
                  ₹{it.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                {it.mrp && (
                  <span className="line-through text-muted text-micro tabular-nums">
                    ₹{it.mrp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                )}
                <span className="text-micro text-muted mt-0.5">
                  GST {it.gstRate} (₹{it.gstAmount})
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Financial & Intra-State Tax Reconciliation Breakdown */}
      <div className="bg-surface-canvas p-space-sm rounded-lg space-y-1.5 text-body text-body border border-subtle/50">
        <div className="flex justify-between text-muted">
          <span>Subtotal (Taxable Value):</span>
          <span className="font-mono font-medium text-primary tabular-nums whitespace-nowrap">
            ₹{order.payment.taxableValue.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-muted">
          <span>Intra-state CGST (6.0%):</span>
          <span className="font-mono text-primary tabular-nums whitespace-nowrap">
            ₹{order.payment.cgst.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-muted">
          <span>Intra-state SGST (6.0%):</span>
          <span className="font-mono text-primary tabular-nums whitespace-nowrap">
            ₹{order.payment.sgst.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-muted">
          <span>Packaging &amp; shipping</span>
          <span className="text-success uppercase text-caption">
            FREE (Orders &gt; ₹1,499)
          </span>
        </div>
        <Separator className="my-1" />
        <div className="flex justify-between items-center text-subheading pt-0.5">
          <span className="font-semibold text-primary">
            Total Paid ({order.payment.mode})
          </span>
          <span className="font-semibold text-accent tabular-nums">
            ₹{order.payment.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Myntra-Style End-to-End Vertical Order Stepper Timeline */}
      <div className="space-y-space-xs">
        <div className="flex items-center justify-between">
          <span className="text-caption uppercase tracking-wider font-semibold text-muted">
            Fulfillment lifecycle
          </span>
          <span className="font-mono text-micro text-muted whitespace-nowrap">
            {order.courier.partner} AWB #{order.courier.awb}
          </span>
        </div>

        <div className="relative pl-6 space-y-3.5 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border-subtle">
          {order.timeline.map((step) => {
            const isDone = step.done;
            const isCurrent = step.isCurrent;
            return (
              <div 
                key={step.step}
                onClick={() => handleAdvanceStep(step.step)}
                className={`relative flex items-start gap-3 cursor-pointer group ${
 !isDone && !isCurrent ? 'opacity-60' : ''
 }`}
                title="Click to update order stage to this step"
              >
                {/* Step Circle */}
                {isCurrent ? (
                  <span className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-primary-container text-on-accent flex items-center justify-center text-meta shadow-xs ring-4 ring-primary-fixed">
                    <Icon name="cached" className="material-symbols-outlined text-icon-sm" />
                  </span>
                ) : isDone ? (
                  <span className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-status-success-solid text-on-accent flex items-center justify-center text-meta shadow-xs">
                    <Icon name="check" className="material-symbols-outlined text-icon-sm" />
                  </span>
                ) : (
                  <span className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-surface-subtle text-muted flex items-center justify-center text-meta border border-subtle">
                    <Icon name={step.step === 7 ? 'local_shipping' : step.step === 8 ? 'moped' : 'done_all'} className="material-symbols-outlined text-icon-sm" />
                  </span>
                )}

                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className={`text-label font-semibold ${
 isCurrent ? 'text-accent' : isDone ? 'text-primary' : 'text-muted'
 }`}>
                      {step.title}
                    </span>
                    {isCurrent && (
                      <Badge variant="default" className="text-micro py-0 px-1.5 font-semibold">
                        CURRENT STAGE
                      </Badge>
                    )}
                    <span className="font-mono text-micro text-muted whitespace-nowrap">
                      {step.time}
                    </span>
                  </div>
                  <span className="text-meta text-muted mt-0.5">
                    {step.desc}
                  </span>
                  {step.alert && (
                    <span className="text-caption text-warning font-semibold mt-0.5">
                      {step.alert}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Operations & Audit Trail Sticky Drawer Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-subtle bg-surface-subtle p-space-sm">
        <div className="flex min-w-0 items-center gap-2 text-caption text-muted">
          <Icon name="smart_toy" aria-hidden="true" className="material-symbols-outlined shrink-0 text-icon text-accent" />
          <span className="truncate">Auto-assigned to batch #4409</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowActivityLog(!showActivityLog)}
            className="h-8 text-meta font-semibold uppercase"
          >
            Activity Log
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleHoldCancel}
            className="h-8 text-meta font-semibold uppercase"
          >
            Hold / Cancel
          </Button>
        </div>
      </div>

      {/* Activity Log Flyout */}
      {showActivityLog && (
        <div className="p-3 bg-surface-subtle rounded-lg text-meta space-y-1.5 border border-subtle animate-fade-in">
          <div className="font-semibold text-primary flex items-center justify-between">
            <span>Automated Audit Trail</span>
            <Button variant="ghost" size="icon" onClick={() => setShowActivityLog(false)} className="h-6 w-6">✕</Button>
          </div>
          <div className="text-muted space-y-1 font-mono text-micro whitespace-nowrap">
            <div>• 14:28:01 IST: Order ingested from Everwear iOS (Checkout Session #cs_live_994)</div>
            <div>• 14:28:15 IST: Razorpay UPI instant webhook received (Auth Code: 884102)</div>
            <div>• 14:31:00 IST: Multi-hub inventory routing matched BLR-FC1 as lowest SLA hub</div>
            <div>• 15:15:20 IST: Barcode 890412894101 verified via Honeywell scan gun dock 4B</div>
          </div>
        </div>
      )}
    </Card>
  );
}
