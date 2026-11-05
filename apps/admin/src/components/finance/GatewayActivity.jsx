import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, StatusBadge } from '../ui';
import { SectionCard } from '../shared/Layout';
import { adminApi } from '../../lib/api';
import { formatMoney } from '../../lib/format';

/*
 * What the payment and courier integrations are doing, straight from the
 * API: whether each is configured (and test or live), Razorpay payment
 * attempts, refunds, and recent provider webhooks with failures flagged.
 */

const ATTEMPT_VARIANT = { paid: 'success', created: 'info', failed: 'destructive', expired: 'secondary', refunded: 'warning' };
const REFUND_VARIANT = { processed: 'success', pending: 'info', requested: 'warning', failed: 'destructive' };
const EVENT_VARIANT = { processed: 'success', ignored: 'secondary', failed: 'destructive', processing: 'info' };
const CARRIER_NAME = { shiprocket: 'Shiprocket', delhivery: 'Delhivery direct' };
const when = (d) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '');

function Row({ children }) {
  return <li className="flex flex-wrap items-center justify-between gap-space-sm border-b border-subtle py-space-xs text-meta last:border-0">{children}</li>;
}

export function GatewayActivity({ onShowToast }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState('attempts');
  const integrations = useQuery({ queryKey: ['admin', 'integrations'], queryFn: () => adminApi.integrations() });
  const attempts = useQuery({ queryKey: ['admin', 'payment-attempts'], queryFn: () => adminApi.paymentAttempts(), enabled: tab === 'attempts' });
  const refunds = useQuery({ queryKey: ['admin', 'refunds'], queryFn: () => adminApi.refunds(), enabled: tab === 'refunds' });
  const events = useQuery({ queryKey: ['admin', 'webhook-events'], queryFn: () => adminApi.webhookEvents(), enabled: tab === 'webhooks' });
  const reconcile = useMutation({
    mutationFn: () => adminApi.reconcile(),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['admin'] });
      onShowToast?.({ type: 'success', title: 'Reconciled', message: `${r.payments} payments settled, ${r.refunds} refunds updated, ${r.shipments} shipments refreshed.` });
    },
    onError: (e) => onShowToast?.({ type: 'error', title: 'Reconcile failed', message: e.message }),
  });

  const rzp = integrations.data?.razorpay;
  const ship = integrations.data?.shipping;
  // Every configured courier integration, the default first; an older API reports only `provider`.
  const carriers = ship?.carriers ?? (ship?.provider && ship.provider !== 'none' ? [{ id: ship.provider, webhook: !!ship.webhook }] : []);
  const failedEvents = (events.data?.events ?? []).filter((e) => e.status === 'failed').length;

  return (
    <SectionCard
      title="Gateway activity"
      description="Razorpay payments and refunds, and courier webhooks, as the API recorded them."
      action={
        <Button size="sm" variant="outline" disabled={reconcile.isPending} onClick={() => reconcile.mutate()}>
          {reconcile.isPending ? 'Reconciling…' : 'Reconcile now'}
        </Button>
      }
    >
      <div className="mb-space-md flex flex-wrap gap-space-sm text-meta">
        <Badge variant={rzp?.configured ? (rzp.mode === 'live' ? 'success' : 'info') : 'secondary'}>
          Razorpay: {rzp?.configured ? `${rzp.mode} mode` : 'not configured'}
        </Badge>
        <Badge variant={rzp?.webhook ? 'success' : 'warning'}>Payment webhook: {rzp?.webhook ? 'secret set' : 'not set'}</Badge>
        {carriers.length ? (
          carriers.map((c, i) => (
            <React.Fragment key={c.id}>
              <Badge variant="success">
                Courier: {CARRIER_NAME[c.id] ?? c.id}
                {i === 0 && carriers.length > 1 ? ' (default)' : ''}
              </Badge>
              <Badge variant={c.webhook ? 'success' : 'warning'}>
                {CARRIER_NAME[c.id] ?? c.id} tracking webhook: {c.webhook ? 'token set' : 'not set'}
              </Badge>
            </React.Fragment>
          ))
        ) : (
          <Badge variant="secondary">Courier: none configured (shipments recorded by hand)</Badge>
        )}
      </div>

      <div className="mb-space-sm flex gap-space-xs" role="tablist" aria-label="Gateway activity">
        {[
          ['attempts', 'Payment attempts'],
          ['refunds', 'Refunds'],
          ['webhooks', failedEvents ? `Webhooks (${failedEvents} failed)` : 'Webhooks'],
        ].map(([id, label]) => (
          <Button key={id} size="sm" variant={tab === id ? 'primary' : 'ghost'} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
            {label}
          </Button>
        ))}
      </div>

      {tab === 'attempts' && (
        <ul>
          {(attempts.data?.attempts ?? []).length === 0 && <li className="text-meta text-muted">No online payment attempts yet.</li>}
          {(attempts.data?.attempts ?? []).map((a) => (
            <Row key={a._id}>
              <span className="font-mono text-primary">{a.providerOrderId}</span>
              <span className="text-primary">{formatMoney(a.amount, a.currency)}</span>
              <span className="text-muted">{when(a.createdAt)}</span>
              <span className="flex items-center gap-space-xs">
                {a.failureReason && <span className="text-muted">{a.failureReason}</span>}
                <StatusBadge status={a.status} variant={ATTEMPT_VARIANT[a.status]} size="sm" />
              </span>
            </Row>
          ))}
        </ul>
      )}

      {tab === 'refunds' && (
        <ul>
          {(refunds.data?.refunds ?? []).length === 0 && <li className="text-meta text-muted">No refunds yet.</li>}
          {(refunds.data?.refunds ?? []).map((r) => (
            <Row key={r._id}>
              <span className="text-primary">Order #{r.displayId}</span>
              <span className="text-primary">{formatMoney(r.amount, r.currency)}</span>
              <span className="text-muted">{r.reason}</span>
              <span className="flex items-center gap-space-xs">
                {r.providerRefundId && <span className="font-mono text-muted">{r.providerRefundId}</span>}
                <StatusBadge status={r.provider === 'manual' ? 'cash' : r.status} variant={REFUND_VARIANT[r.status]} size="sm" />
              </span>
            </Row>
          ))}
        </ul>
      )}

      {tab === 'webhooks' && (
        <ul>
          {(events.data?.events ?? []).length === 0 && <li className="text-meta text-muted">No webhooks received yet.</li>}
          {(events.data?.events ?? []).map((e) => (
            <Row key={e._id}>
              <span className="text-primary">
                {e.provider} · {e.event}
              </span>
              <span className="text-muted">{when(e.createdAt)}</span>
              <span className="flex items-center gap-space-xs">
                {e.error && <span className="text-danger">{e.error}</span>}
                {e.attempts > 1 && <span className="text-muted">{e.attempts} deliveries</span>}
                <StatusBadge status={e.status} variant={EVENT_VARIANT[e.status]} size="sm" />
              </span>
            </Row>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
