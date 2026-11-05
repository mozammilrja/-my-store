import React from 'react';
import { formatMoney } from '../../lib/format';
import { cn } from '../../lib/utils';
import { PROVIDER_LABEL } from './logistics-format';

/*
 * Live quotes from every configured courier integration
 * (GET /admin/orders/:id/couriers), cheapest first, to pick one before booking.
 * A quote is identified by its integration and its courier id, since
 * Shiprocket's courier 1 and Delhivery's service 1 are different things.
 * Integrations that couldn't be reached are named, so a short list is never
 * mistaken for the whole market.
 */

export const quoteKey = (q) => `${q.provider}:${q.courierId}`;

export function CourierChoice({ data, value, onChange, currency = 'inr', isLoading, error }) {
  if (isLoading) return <p className="text-meta text-muted">Getting live rates…</p>;
  if (error) return <p className="text-meta text-danger">Rates could not be fetched: {error.message}</p>;
  if (!data) return null;
  if (!data.configured) return <p className="text-meta text-muted">Rates need a courier integration and the origin PIN code (SHIPPING_ORIGIN_PINCODE).</p>;

  const recommended = data.recommended ? quoteKey(data.recommended) : null;
  return (
    <div className="flex flex-col gap-space-xs">
      {data.couriers.length === 0 ? (
        <p className="text-meta text-danger">No courier delivers to this PIN code for this payment method.</p>
      ) : (
        <fieldset className="flex flex-col gap-space-xs">
          <legend className="mb-space-xs text-label text-primary">Courier</legend>
          {data.couriers.map((q) => {
            const key = quoteKey(q);
            const checked = value === key;
            return (
              <label
                key={key}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-space-sm rounded-md border p-space-sm text-meta',
                  checked ? 'border-accent bg-surface-subtle' : 'border-subtle'
                )}
              >
                <span className="flex min-w-0 items-center gap-space-sm">
                  <input type="radio" name="courier-quote" value={key} checked={checked} onChange={() => onChange(key, q)} className="accent-[rgb(var(--accent))]" />
                  <span className="min-w-0">
                    <span className="block text-primary">
                      {q.name}
                      {key === recommended && <span className="ml-2 text-micro uppercase text-accent">Recommended</span>}
                    </span>
                    <span className="block text-muted">
                      {PROVIDER_LABEL[q.provider] ?? q.provider}
                      {q.etdDays != null ? ` · ${q.etdDays} ${q.etdDays === 1 ? 'day' : 'days'}` : ''}
                      {q.cod ? ' · collects cash' : ''}
                    </span>
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-primary">{formatMoney(q.rate, currency)}</span>
              </label>
            );
          })}
        </fieldset>
      )}
      {(data.unavailable ?? []).map((u) => (
        <p key={u.provider} className="text-meta text-warning" role="note">
          {PROVIDER_LABEL[u.provider] ?? u.provider} couldn't be reached, so its rates aren't listed: {u.message}
        </p>
      ))}
    </div>
  );
}
