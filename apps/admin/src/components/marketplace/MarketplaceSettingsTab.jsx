import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { marketplaceApi } from '../../lib/api-marketplace';
import { Alert, Button, Input, SectionCard } from '../ui';
import { marketplaceRights, money } from './shared';

/*
 * Fees, statutory deductions and seller deadlines for the whole marketplace.
 * The owner changes them; everyone else sees them. Changes apply to sales
 * delivered from then on; lines already posted keep the rates they had.
 */

const FIELDS = [
  { key: 'commissionPct', label: 'Commission (%)', hint: 'Of the item price incl. GST. A seller override replaces it.', step: '0.1', max: 60 },
  { key: 'fulfilmentFeePerUnit', label: 'Fulfilment fee per unit (₹)', hint: 'When Everwear stores and ships the seller’s stock.', step: '0.01', max: 10000, rupees: true },
  { key: 'feeGstPct', label: 'GST on fees (%)', hint: 'Charged on commission and the fulfilment fee.', step: '0.1', max: 28 },
  { key: 'tcsPct', label: 'TCS (%)', hint: 'GST section 52, on the net taxable value.', step: '0.01', max: 5 },
  { key: 'tdsPct', label: 'TDS (%)', hint: 'Income Tax section 194-O, on the gross sale.', step: '0.01', max: 5 },
  { key: 'acceptSlaHours', label: 'Accept within (hours)', hint: 'Seller-fulfilled orders, from placement.', step: '1', max: 168, int: true },
  { key: 'dispatchSlaHours', label: 'Hand over within (hours)', hint: 'From acceptance to the courier.', step: '1', max: 336, int: true },
];

const toForm = (s) => Object.fromEntries(FIELDS.map((f) => [f.key, s?.[f.key] == null ? '' : String(f.rupees ? s[f.key] / 100 : s[f.key])]));

export function MarketplaceSettingsTab({ settingsQuery, role, onShowToast }) {
  const qc = useQueryClient();
  const can = marketplaceRights(role).settings;
  const { settings, defaults } = settingsQuery.data ?? {};
  const [form, setForm] = useState(() => toForm(settings));
  useEffect(() => setForm(toForm(settings)), [settings]);

  const value = (f) => {
    const n = Number(form[f.key]);
    return f.rupees ? Math.round(n * 100) : n;
  };
  const invalid = FIELDS.filter((f) => {
    const raw = form[f.key];
    const n = Number(raw);
    return raw === '' || !Number.isFinite(n) || n < 0 || n > f.max || (f.int && !Number.isInteger(n)) || (f.int && n < 1);
  }).map((f) => f.key);
  const changed = FIELDS.filter((f) => settings && value(f) !== settings[f.key]);

  const save = useMutation({
    mutationFn: () => marketplaceApi.updateSettings(Object.fromEntries(changed.map((f) => [f.key, value(f)]))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'marketplace', 'settings'] });
      onShowToast?.({ type: 'success', title: 'Marketplace settings saved', message: 'They apply to sales delivered from now on.' });
    },
    onError: (err) => onShowToast?.({ type: 'error', title: 'Not saved', message: err?.message }),
  });

  const shown = (f, v) => (f.rupees ? money(v) : `${v}${f.int ? ' h' : '%'}`);

  return (
    <div className="flex flex-col gap-space-md">
      <Alert variant="warning">
        Confirm the TCS and TDS rates, and the GST on fees, with the store’s tax adviser before changing them. The store also files GSTR-8 for the TCS it collects.
      </Alert>
      <SectionCard
        title="Fees, deductions and deadlines"
        description={can ? 'Changes apply to sales delivered from now on.' : 'Only the owner can change these.'}
        footer={
          can ? (
            <div className="flex justify-end">
              <Button variant="primary" disabled={save.isPending || invalid.length > 0 || !changed.length} onClick={() => save.mutate()}>
                Save changes
              </Button>
            </div>
          ) : null
        }
      >
        <div className="grid grid-cols-1 gap-space-md md:grid-cols-2">
          {FIELDS.map((f) => (
            <label key={f.key} className="flex flex-col gap-1.5 text-label text-secondary">
              {f.label}
              <Input
                type="number"
                min="0"
                max={f.max}
                step={f.step}
                value={form[f.key]}
                disabled={!can}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                aria-invalid={invalid.includes(f.key) || undefined}
                aria-describedby={`mkt-${f.key}`}
              />
              <span id={`mkt-${f.key}`} className={invalid.includes(f.key) ? 'text-micro text-danger' : 'text-micro text-muted'}>
                {f.hint}
                {defaults ? ` Default ${shown(f, defaults[f.key])}.` : ''}
              </span>
            </label>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
