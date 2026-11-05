import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Icon, Input, Select, StatusBadge } from '../ui';
import { adminApi } from '../../lib/api';
import { formatMoney } from '../../lib/format';
import { CourierChoice, quoteKey } from '../logistics/CourierChoice';

/*
 * Payments and shipment for one order, all from the API: Razorpay attempts and
 * refunds, and the courier workflow (book, courier, label, pickup, tracking,
 * cancel, failed-delivery actions) with whichever integrations are set up:
 * Shiprocket (courier and AWB assigned after booking) and Delhivery direct
 * (the AWB comes with the booking). Nothing here sets a status by itself; each
 * button is one backend call, and the API decides what is allowed.
 */

const SHIPMENT_LABEL = {
  pending: 'Booking',
  ready_to_ship: 'Ready to ship',
  shipment_created: 'Shipment created',
  pickup_scheduled: 'Pickup scheduled',
  picked_up: 'Picked up',
  in_transit: 'In transit',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  delivery_failed: 'Delivery failed',
  rto_initiated: 'RTO initiated',
  rto_in_transit: 'RTO in transit',
  rto_delivered: 'RTO delivered',
  cancelled: 'Cancelled',
};
const SHIPMENT_VARIANT = {
  delivered: 'success',
  delivery_failed: 'destructive',
  rto_initiated: 'warning',
  rto_in_transit: 'warning',
  rto_delivered: 'secondary',
  cancelled: 'secondary',
  out_for_delivery: 'info',
  in_transit: 'info',
};
const REFUND_VARIANT = { processed: 'success', pending: 'info', requested: 'warning', failed: 'destructive' };

const CARRIER_NAME = { shiprocket: 'Shiprocket', delhivery: 'Delhivery' };
const COURIER_PROVIDERS = ['shiprocket', 'delhivery'];

const when = (d) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '');

export function OrderLogisticsPanel({ order, onShowToast }) {
  const raw = order.rawBackend ?? {};
  const orderId = raw.id;
  const currency = order.payment.currency;
  const qc = useQueryClient();
  const keys = { payments: ['admin', 'order-payments', orderId], shipments: ['admin', 'order-shipments', orderId] };

  const integrations = useQuery({ queryKey: ['admin', 'integrations'], queryFn: () => adminApi.integrations(), staleTime: 60_000 });
  const payments = useQuery({ queryKey: keys.payments, queryFn: () => adminApi.orderPayments(orderId), enabled: !!orderId });
  const shipments = useQuery({
    queryKey: keys.shipments,
    queryFn: async () => (await adminApi.shipments()).shipments.filter((s) => s.orderId === orderId),
    enabled: !!orderId,
  });
  const live = (shipments.data ?? []).find((s) => !s.isReturn && s.status !== 'cancelled');
  const returns = (shipments.data ?? []).filter((s) => s.isReturn);
  const shipping = integrations.data?.shipping;
  // The configured integrations, the default first; older APIs report only `provider`.
  const carriers = shipping?.carriers?.map((c) => c.id) ?? (COURIER_PROVIDERS.includes(shipping?.provider) ? [shipping.provider] : []);
  const courierApi = carriers.length > 0;
  const [showCouriers, setShowCouriers] = useState(false);
  const [quote, setQuote] = useState('');
  const couriers = useQuery({ queryKey: ['admin', 'couriers', orderId], queryFn: () => adminApi.orderCouriers(orderId), enabled: showCouriers && courierApi });
  const chosen = (couriers.data?.couriers ?? []).find((q) => quoteKey(q) === quote) ?? null;

  /** Books with the chosen quote's integration; for Shiprocket the chosen courier is then assigned straight away. */
  const book = (q) => async () => {
    const carrier = q?.provider ?? carriers[0];
    const { shipment } = await adminApi.createShipment(orderId, { carrier, ...(q && carrier === 'delhivery' ? { courierId: q.courierId } : {}) });
    if (q && carrier === 'shiprocket' && shipment && !shipment.awb) await adminApi.assignCourier(shipment._id, q.courierId);
    return shipment;
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: keys.payments });
    qc.invalidateQueries({ queryKey: keys.shipments });
    qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
    qc.invalidateQueries({ queryKey: ['admin', 'shipments'] });
  };
  const act = useMutation({
    mutationFn: ({ run }) => run(),
    onSuccess: (_, { done }) => {
      refresh();
      if (done) onShowToast?.({ type: 'success', title: done });
    },
    onError: (e) => onShowToast?.({ type: 'error', title: 'Not done', message: e.message }),
  });
  const busy = act.isPending;
  const run = (fn, done) => act.mutate({ run: fn, done });

  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [courierId, setCourierId] = useState('');
  const [manual, setManual] = useState({ carrier: '', awb: '', trackingUrl: '' });
  const [ndrComment, setNdrComment] = useState('');

  const paid = ['paid', 'partially_refunded'].includes(raw.paymentStatus);
  const refunds = payments.data?.refunds ?? [];
  const refunded = refunds.filter((r) => ['pending', 'processed', 'requested'].includes(r.status)).reduce((s, r) => s + r.amount, 0);
  const refundable = Math.max(0, (raw.totals?.total ?? 0) - refunded);
  const canShip = order.status === 'Unfulfilled' && !live && (raw.paymentMethod === 'cod' || raw.paymentStatus === 'paid');

  return (
    <>
      {/* Payment */}
      <section className="flex flex-col gap-space-sm" aria-labelledby="order-payment-h">
        <h3 id="order-payment-h" className="text-subheading text-primary">Payment</h3>
        {raw.paymentMethod === 'razorpay' && raw.paymentDetails?.razorpayPaymentId && (
          <dl className="flex flex-col gap-space-xs text-meta">
            <div className="flex justify-between gap-space-md">
              <dt className="text-muted">Razorpay payment</dt>
              <dd className="font-mono text-primary">{raw.paymentDetails.razorpayPaymentId}</dd>
            </div>
            <div className="flex justify-between gap-space-md">
              <dt className="text-muted">Razorpay order</dt>
              <dd className="font-mono text-primary">{raw.paymentDetails.razorpayOrderId}</dd>
            </div>
          </dl>
        )}
        {(payments.data?.attempts ?? []).length > 1 && (
          <p className="text-meta text-muted">{payments.data.attempts.length} payment attempts on this checkout (see Payments for details).</p>
        )}
        {refunds.length > 0 && (
          <ul className="flex flex-col gap-space-xs">
            {refunds.map((r) => (
              <li key={r._id} className="flex flex-wrap items-center justify-between gap-space-sm rounded-md border border-subtle p-space-sm text-meta">
                <span className="text-primary">
                  {formatMoney(r.amount, currency)} · {r.reason}
                </span>
                <span className="flex items-center gap-space-xs">
                  {r.providerRefundId && <span className="font-mono text-muted">{r.providerRefundId}</span>}
                  <StatusBadge status={r.provider === 'manual' ? 'Cash refund' : r.status} variant={REFUND_VARIANT[r.status]} size="sm" />
                </span>
                {r.failureReason && <span className="w-full text-danger">{r.failureReason}</span>}
              </li>
            ))}
          </ul>
        )}
        {paid && refundable > 0 && (
          <div className="flex flex-col gap-space-xs rounded-md bg-surface-subtle p-space-sm">
            <span className="text-label text-primary">
              Refund up to {formatMoney(refundable, currency)}
              {raw.paymentMethod === 'cod' ? ' (records a cash refund; no money is sent)' : ' through Razorpay'}
            </span>
            <div className="flex flex-wrap gap-space-xs">
              <Input
                className="w-32"
                inputMode="decimal"
                placeholder="Full amount"
                aria-label="Refund amount in rupees"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
              <Input className="min-w-40 flex-1" placeholder="Reason" aria-label="Refund reason" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
              <Button
                size="sm"
                variant="outline"
                disabled={busy || refundReason.trim().length < 3}
                onClick={() => {
                  const amount = refundAmount ? Math.round(Number(refundAmount) * 100) : undefined;
                  if (amount !== undefined && (!Number.isFinite(amount) || amount <= 0)) return onShowToast?.({ type: 'error', title: 'Enter a valid amount' });
                  run(() => adminApi.refundOrder(orderId, { amount, reason: refundReason.trim() }), 'Refund requested');
                  setRefundAmount('');
                  setRefundReason('');
                }}
              >
                Refund
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Shipment */}
      <section className="flex flex-col gap-space-sm" aria-labelledby="order-shipment-h">
        <div className="flex items-center justify-between gap-space-sm">
          <h3 id="order-shipment-h" className="text-subheading text-primary">Shipment</h3>
          {live && <StatusBadge status={SHIPMENT_LABEL[live.status] ?? live.status} variant={SHIPMENT_VARIANT[live.status] ?? 'info'} size="sm" />}
        </div>

        {live ? (
          <>
            <dl className="flex flex-col gap-space-xs text-meta">
              <div className="flex justify-between gap-space-md">
                <dt className="text-muted">Courier</dt>
                <dd className="text-primary">{live.carrier || 'Not assigned yet'}</dd>
              </div>
              <div className="flex justify-between gap-space-md">
                <dt className="text-muted">AWB</dt>
                <dd className="font-mono text-primary">{live.awb || '—'}</dd>
              </div>
              {live.providerStatus && (
                <div className="flex justify-between gap-space-md">
                  <dt className="text-muted">Courier says</dt>
                  <dd className="text-primary">{live.providerStatus}</dd>
                </div>
              )}
              {live.pickup?.scheduledFor && (
                <div className="flex justify-between gap-space-md">
                  <dt className="text-muted">Pickup</dt>
                  <dd className="text-primary">{when(live.pickup.scheduledFor)}</dd>
                </div>
              )}
              {live.ndr && (
                <div className="flex justify-between gap-space-md">
                  <dt className="text-muted">Failed delivery</dt>
                  <dd className="text-danger">
                    {live.ndr.reason} (attempt {live.ndr.attempts}){live.ndr.action ? ` · asked to ${live.ndr.action}` : ''}
                  </dd>
                </div>
              )}
            </dl>
            <div className="flex flex-wrap gap-space-xs">
              {live.labelUrl && (
                <a href={live.labelUrl} target="_blank" rel="noreferrer" className="text-label text-accent hover:underline">
                  Shipping label
                </a>
              )}
              {live.trackingUrl && (
                <a href={live.trackingUrl} target="_blank" rel="noreferrer" className="text-label text-accent hover:underline">
                  Courier tracking
                </a>
              )}
            </div>

            {COURIER_PROVIDERS.includes(live.provider) && (
              <div className="flex flex-wrap items-center gap-space-xs">
                {live.provider === 'shiprocket' && !live.awb && (
                  <>
                    {showCouriers && couriers.data?.couriers?.length > 0 && (
                      <Select value={courierId} onChange={(e) => setCourierId(e.target.value)} wrapperClassName="min-w-56" aria-label="Courier">
                        <option value="">Recommended courier</option>
                        {couriers.data.couriers.filter((c) => c.provider === 'shiprocket').map((c) => (
                          <option key={c.courierId} value={c.courierId}>
                            {c.name} · {formatMoney(c.rate, currency)}
                            {c.etdDays != null ? ` · ${c.etdDays} days` : ''}
                          </option>
                        ))}
                      </Select>
                    )}
                    {!showCouriers && (
                      <Button size="sm" variant="ghost" onClick={() => setShowCouriers(true)}>
                        Compare couriers
                      </Button>
                    )}
                    <Button size="sm" variant="primary" disabled={busy} onClick={() => run(() => adminApi.assignCourier(live._id, courierId ? Number(courierId) : undefined), 'Courier assigned')}>
                      Assign courier & AWB
                    </Button>
                  </>
                )}
                {live.awb && !live.labelUrl && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => adminApi.shipmentLabel(live._id), 'Label ready')}>
                    Generate label
                  </Button>
                )}
                {live.awb && !live.pickup && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => adminApi.shipmentPickup(live._id), 'Pickup requested')}>
                    Request pickup
                  </Button>
                )}
                {live.awb && (
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => adminApi.syncShipment(live._id), 'Tracking refreshed')}>
                    <Icon name="sync" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                    Refresh tracking
                  </Button>
                )}
                {['pending', 'ready_to_ship', 'shipment_created', 'pickup_scheduled'].includes(live.status) && (
                  <Button size="sm" variant="ghost" className="text-danger" disabled={busy} onClick={() => run(() => adminApi.cancelShipment(live._id), 'Shipment cancelled')}>
                    Cancel shipment
                  </Button>
                )}
              </div>
            )}

            {live.status === 'delivery_failed' && !live.ndr?.action && (
              <div className="flex flex-wrap gap-space-xs rounded-md bg-status-danger-bg p-space-sm">
                <Input className="min-w-40 flex-1" placeholder="Note for the courier" aria-label="Note for the courier" value={ndrComment} onChange={(e) => setNdrComment(e.target.value)} />
                <Button size="sm" variant="outline" disabled={busy || ndrComment.trim().length < 3} onClick={() => run(() => adminApi.ndrAction(live._id, { action: 'reattempt', comment: ndrComment.trim() }), 'Re-attempt requested')}>
                  Re-attempt
                </Button>
                {live.provider === 'delhivery' ? (
                  <span className="w-full text-meta text-muted">To have Delhivery send it back, raise the return in Delhivery One (NDR); its scans will show the return here.</span>
                ) : (
                  <Button size="sm" variant="ghost" disabled={busy || ndrComment.trim().length < 3} onClick={() => run(() => adminApi.ndrAction(live._id, { action: 'return', comment: ndrComment.trim() }), 'Return to origin requested')}>
                    Return to us
                  </Button>
                )}
              </div>
            )}

            {live.provider === 'manual' && !['delivered', 'cancelled'].includes(live.status) && (
              <div className="flex flex-wrap gap-space-xs">
                <span className="w-full text-meta text-muted">Booked outside the courier integration: update it as the courier reports.</span>
                {['in_transit', 'out_for_delivery', 'delivered', 'delivery_failed'].map((st) => (
                  <Button key={st} size="sm" variant="ghost" disabled={busy} onClick={() => run(() => adminApi.manualShipmentStatus(live._id, { status: st, note: 'Reported by courier' }), 'Status updated')}>
                    {SHIPMENT_LABEL[st]}
                  </Button>
                ))}
              </div>
            )}

            {(live.trackingEvents ?? []).length > 0 && (
              <ol className="flex flex-col gap-space-xs border-l border-subtle pl-space-sm text-meta">
                {[...live.trackingEvents].reverse().slice(0, 6).map((e, i) => (
                  <li key={i}>
                    <span className="text-primary">{e.status}</span>
                    {e.location ? <span className="text-muted"> · {e.location}</span> : null}
                    <span className="block text-muted">{when(e.timestamp)}{e.note ? ` · ${e.note}` : ''}</span>
                  </li>
                ))}
              </ol>
            )}
          </>
        ) : canShip ? (
          <div className="flex flex-col gap-space-sm">
            {courierApi ? (
              <div className="flex flex-col gap-space-sm">
                {showCouriers ? (
                  <CourierChoice
                    data={couriers.data}
                    isLoading={couriers.isLoading}
                    error={couriers.error}
                    currency={currency}
                    value={quote}
                    onChange={(key) => setQuote(key)}
                  />
                ) : null}
                <div className="flex flex-wrap gap-space-xs">
                  {chosen ? (
                    <Button size="sm" variant="primary" disabled={busy} onClick={() => run(book(chosen), `Booked with ${chosen.name}`)}>
                      <Icon name="local_shipping" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                      Book {chosen.name}
                    </Button>
                  ) : (
                    <Button size="sm" variant="primary" disabled={busy} onClick={() => run(book(null), `Booked with ${CARRIER_NAME[carriers[0]]}`)}>
                      <Icon name="local_shipping" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                      Book with {CARRIER_NAME[carriers[0]]}
                    </Button>
                  )}
                  {!showCouriers && (
                    <Button size="sm" variant="ghost" onClick={() => setShowCouriers(true)}>
                      Compare couriers{carriers.length > 1 ? ` (${carriers.map((c) => CARRIER_NAME[c]).join(' and ')})` : ''}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-meta text-muted">No courier integration is configured, so shipments are recorded by hand.</p>
            )}
            <details className="text-meta">
              <summary className="cursor-pointer text-label text-primary">Record a shipment booked elsewhere</summary>
              <div className="mt-space-xs flex flex-col gap-space-xs">
                <Input placeholder="Courier (e.g. Blue Dart)" aria-label="Courier" value={manual.carrier} onChange={(e) => setManual({ ...manual, carrier: e.target.value })} />
                <Input placeholder="AWB from the courier" aria-label="AWB" value={manual.awb} onChange={(e) => setManual({ ...manual, awb: e.target.value })} />
                <Input placeholder="Tracking link (optional)" aria-label="Tracking link" value={manual.trackingUrl} onChange={(e) => setManual({ ...manual, trackingUrl: e.target.value })} />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || manual.carrier.trim().length < 2 || manual.awb.trim().length < 4}
                  onClick={() =>
                    run(
                      () =>
                        adminApi.createShipment(orderId, {
                          manual: { carrier: manual.carrier.trim(), awb: manual.awb.trim(), ...(manual.trackingUrl.trim() ? { trackingUrl: manual.trackingUrl.trim() } : {}) },
                        }),
                      'Shipment recorded'
                    )
                  }
                >
                  Record shipment
                </Button>
              </div>
            </details>
          </div>
        ) : (
          <p className="text-meta text-muted">
            {order.status === 'Cancelled'
              ? 'This order was cancelled before it shipped.'
              : raw.paymentMethod !== 'cod' && raw.paymentStatus !== 'paid'
                ? 'Online orders ship once payment is verified.'
                : 'No shipment.'}
          </p>
        )}

        {returns.length > 0 && (
          <ul className="flex flex-col gap-space-xs text-meta">
            {returns.map((r) => (
              <li key={r._id} className="flex justify-between gap-space-sm">
                <span className="text-muted">Return pickup {r.awb ? `· ${r.awb}` : ''}</span>
                <span className="text-primary">{SHIPMENT_LABEL[r.status] ?? r.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
