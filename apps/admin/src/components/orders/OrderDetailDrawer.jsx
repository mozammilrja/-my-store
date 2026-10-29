import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Separator,
} from '../ui';

export function OrderDetailDrawer({ order, onShowToast, onUpdateOrder, onClose }) {
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressInput, setAddressInput] = useState(order?.customer?.address || '');
  const [showActivityLog, setShowActivityLog] = useState(false);

  if (!order) {
    return (
      <Card className="xl:col-span-4 p-space-lg flex flex-col items-center justify-center text-center min-h-[400px]">
        <span className="material-symbols-outlined text-[48px] text-secondary/40">shopping_bag</span>
        <h3 className="font-headline-sm text-headline-sm font-semibold text-text-primary mt-2">No Order Selected</h3>
        <p className="font-body-sm text-body-sm text-text-secondary mt-1">Select an order from the list to view its complete fulfillment telemetry.</p>
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
    <Card className="xl:col-span-4 p-space-md flex flex-col space-y-space-md shadow-md">
      {/* Drill-Down Header */}
      <div className="flex flex-col gap-2 pb-space-sm bg-surface-subtle -m-space-md p-space-md rounded-t-xl border-b border-border-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-status-success animate-ping"></span>
            <span className="font-headline-sm text-headline-sm font-bold text-text-primary">
              {order.id}
            </span>
            <Badge variant="default" className="text-[10px] font-bold">
              {order.stageBadge || 'READY TO HANDOVER'}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrintLabel}
              className="h-8 w-8 bg-surface-container-lowest"
              title="Print Shipping Label"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleReassignCarrier}
              className="h-8 w-8 bg-surface-container-lowest"
              title="Re-assign Carrier"
            >
              <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleDownloadSlip}
              className="h-8 w-8 bg-surface-container-lowest"
              title="Download Packing Slip"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 hover:bg-surface-subtle text-text-secondary hover:text-text-primary ml-1"
                title="Close Details (Expand Table)"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-label-xs-caps text-label-xs-caps text-text-secondary">
          <span>Placed: <strong className="text-text-primary font-medium">{order.orderDate}</strong></span>
          <span>•</span>
          <span>Channel: <strong className="text-text-primary font-medium">{order.channel}</strong></span>
          <span>•</span>
          <span>Warehouse: <strong className="text-primary font-semibold">{order.nodeFc}</strong></span>
        </div>
      </div>

      {/* Consignee Customer & Delivery Routing Strip */}
      <div className="bg-surface-canvas p-space-sm rounded-lg flex items-start justify-between gap-space-sm border border-border-subtle/60">
        <div className="flex items-start gap-2.5">
          <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">pin_drop</span>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-label-md text-label-md font-bold text-text-primary">
                {order.customer.name}
              </span>
              <Badge variant="success" className="text-[9px] py-0 px-1.5 font-bold">
                PINCODE VERIFIED
              </Badge>
              <span className={`px-1.5 py-0.2 rounded font-label-xs-caps text-[9px] font-bold ${order.customer.tierBadgeClass}`}>
                {order.customer.tier}
              </span>
            </div>

            {editingAddress ? (
              <div className="mt-2 space-y-2">
                <textarea
                  className="w-full text-xs p-2 rounded-lg border border-primary focus:outline-none bg-surface-container-lowest text-text-primary"
                  rows="2"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleSaveAddress}
                    className="h-7 text-xs"
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingAddress(false)}
                    className="h-7 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                {order.customer.address}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-1.5 font-label-xs-caps text-label-xs-caps text-text-secondary">
              <span className="font-mono">Phone: {order.customer.phone}</span>
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
            className="shrink-0 p-0 h-auto font-label-xs-caps text-label-xs-caps font-semibold"
          >
            Edit
          </Button>
        )}
      </div>

      {/* Line Items Section (Fashion Catalog Presentation) */}
      <div className="space-y-space-xs">
        <div className="flex items-center justify-between">
          <span className="font-label-xs-caps text-label-xs-caps uppercase tracking-wider font-semibold text-text-secondary">
            Ordered Apparel Items ({order.items.length} SKUs)
          </span>
          <span className="font-label-xs-caps text-label-xs-caps text-text-secondary">
            Total Weight: <strong className="text-text-primary">{order.totalWeight}</strong>
          </span>
        </div>
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {order.items.map((it) => (
            <div
              key={it.id}
              className="p-2.5 bg-surface-canvas rounded-lg flex items-center justify-between gap-3 hover:bg-surface-subtle transition-colors border border-border-subtle/50"
            >
              <div className="flex items-center gap-3">
                <img
                  className="w-12 h-14 object-cover rounded-md bg-surface-subtle shadow-xs shrink-0"
                  alt={it.name}
                  src={it.image}
                />
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md font-semibold text-text-primary line-clamp-1">
                    {it.name}
                  </span>
                  <span className="font-mono text-[11px] text-text-secondary">
                    SKU: {it.sku} • {it.hsn}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                      Size: <strong className="ml-1 font-semibold">{it.size}</strong>
                    </Badge>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                      Color: <strong className="ml-1 font-semibold">{it.color}</strong>
                    </Badge>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                      Qty: <strong className="ml-1 font-semibold">{it.qty}</strong>
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className="font-label-md text-label-md font-bold text-text-primary tabular-nums">
                  ₹{it.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                {it.mrp && (
                  <span className="line-through text-text-secondary text-[11px] tabular-nums">
                    ₹{it.mrp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                )}
                <span className="font-label-xs-caps text-[10px] text-text-secondary mt-0.5">
                  GST {it.gstRate} (₹{it.gstAmount})
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Financial & Intra-State Tax Reconciliation Breakdown */}
      <div className="bg-surface-canvas p-space-sm rounded-lg space-y-1.5 text-body-sm text-body-sm border border-border-subtle/50">
        <div className="flex justify-between text-text-secondary">
          <span>Subtotal (Taxable Value):</span>
          <span className="font-mono font-medium text-text-primary tabular-nums">
            ₹{order.payment.taxableValue.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-text-secondary">
          <span>Intra-state CGST (6.0%):</span>
          <span className="font-mono text-text-primary tabular-nums">
            ₹{order.payment.cgst.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-text-secondary">
          <span>Intra-state SGST (6.0%):</span>
          <span className="font-mono text-text-primary tabular-nums">
            ₹{order.payment.sgst.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-text-secondary">
          <span>Packaging & Express Shipping:</span>
          <span className="text-status-success font-semibold uppercase text-[11px]">
            FREE (Orders &gt; ₹1,499)
          </span>
        </div>
        <Separator className="my-1" />
        <div className="flex justify-between items-center font-headline-sm text-headline-sm pt-0.5">
          <span className="font-bold text-text-primary">
            Total Paid ({order.payment.mode})
          </span>
          <span className="font-bold text-primary tabular-nums">
            ₹{order.payment.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Myntra-Style End-to-End Vertical Order Stepper Timeline */}
      <div className="space-y-space-xs">
        <div className="flex items-center justify-between">
          <span className="font-label-xs-caps text-label-xs-caps uppercase tracking-wider font-semibold text-text-secondary">
            Fulfillment Lifecycle & Live Audit Stepper
          </span>
          <span className="font-mono text-[10px] text-text-secondary">
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
                  <span className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-[12px] shadow-xs ring-4 ring-primary-fixed">
                    <span className="material-symbols-outlined text-[14px]">cached</span>
                  </span>
                ) : isDone ? (
                  <span className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-status-success text-on-primary flex items-center justify-center text-[12px] shadow-xs">
                    <span className="material-symbols-outlined text-[14px]">check</span>
                  </span>
                ) : (
                  <span className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-surface-subtle text-secondary flex items-center justify-center text-[12px] border border-border-subtle">
                    <span className="material-symbols-outlined text-[14px]">
                      {step.step === 7 ? 'local_shipping' : step.step === 8 ? 'moped' : 'done_all'}
                    </span>
                  </span>
                )}

                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className={`font-label-sm text-label-sm font-semibold ${
                      isCurrent ? 'text-primary' : isDone ? 'text-text-primary' : 'text-text-secondary'
                    }`}>
                      {step.title}
                    </span>
                    {isCurrent && (
                      <Badge variant="default" className="text-[9px] py-0 px-1.5 font-bold">
                        CURRENT STAGE
                      </Badge>
                    )}
                    <span className="font-mono text-[10px] text-text-secondary">
                      {step.time}
                    </span>
                  </div>
                  <span className="font-body-sm text-[12px] text-text-secondary mt-0.5">
                    {step.desc}
                  </span>
                  {step.alert && (
                    <span className="font-label-xs-caps text-label-xs-caps text-status-warning font-semibold mt-0.5">
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
      <div className="bg-surface-canvas p-space-sm rounded-lg flex items-center justify-between border border-border-subtle/50">
        <div className="flex items-center gap-2 text-text-secondary font-label-xs-caps text-label-xs-caps">
          <span className="material-symbols-outlined text-[16px] text-primary">smart_toy</span>
          <span>Auto-assigned to batch #4409 by System Dispatcher Bot</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowActivityLog(!showActivityLog)}
            className="h-8 text-xs font-semibold uppercase"
          >
            Activity Log
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleHoldCancel}
            className="h-8 text-xs font-bold uppercase"
          >
            Hold / Cancel
          </Button>
        </div>
      </div>

      {/* Activity Log Flyout */}
      {showActivityLog && (
        <div className="p-3 bg-surface-subtle rounded-lg text-xs space-y-1.5 border border-border-subtle animate-fade-in">
          <div className="font-semibold text-text-primary flex items-center justify-between">
            <span>Automated Audit Trail</span>
            <Button variant="ghost" size="icon" onClick={() => setShowActivityLog(false)} className="h-6 w-6">✕</Button>
          </div>
          <div className="text-text-secondary space-y-1 font-mono text-[11px]">
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
