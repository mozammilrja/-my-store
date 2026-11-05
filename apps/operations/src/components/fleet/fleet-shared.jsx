import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AppDialog, Button, Input } from '../ui';
import { formatMoney } from '../../lib/format';
import { useSession } from '../../lib/session';

/* Labels, roles and small pieces shared by the fleet and cash screens. */

export const TASK_STATUS = {
  unassigned: { label: 'Waiting for a rider', variant: 'warning' },
  offered: { label: 'Offered', variant: 'info' },
  assigned: { label: 'Assigned', variant: 'info' },
  picked_up: { label: 'Picked up', variant: 'info' },
  out_for_delivery: { label: 'Out for delivery', variant: 'info' },
  attempt_failed: { label: 'Attempt failed', variant: 'destructive' },
  delivered: { label: 'Delivered', variant: 'success' },
  rto: { label: 'Returning to hub', variant: 'warning' },
  returned: { label: 'Back at hub', variant: 'secondary' },
  cancelled: { label: 'Cancelled', variant: 'secondary' },
};

export const RIDER_STATUS = {
  pending: { label: 'Awaiting checks', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  suspended: { label: 'Suspended', variant: 'destructive' },
  rejected: { label: 'Rejected', variant: 'secondary' },
};

export const DOC_LABEL = {
  driving_licence: 'Driving licence',
  vehicle_rc: 'Vehicle RC',
  aadhaar: 'Aadhaar',
  pan: 'PAN',
  insurance: 'Insurance',
};

export const FAIL_REASON = {
  customer_unavailable: 'Customer unavailable',
  customer_refused: 'Customer refused',
  address_not_found: 'Address not found',
  customer_rescheduled: 'Customer rescheduled',
  cash_not_ready: 'Cash not ready',
  premises_closed: 'Premises closed',
  unsafe_location: 'Unsafe location',
  other: 'Other',
};

export const REMITTANCE_STATUS = {
  submitted: { label: 'To count', variant: 'warning' },
  reconciled: { label: 'Reconciled', variant: 'success' },
  mismatch: { label: 'Mismatch', variant: 'destructive' },
};

export const money = (paise) => formatMoney(paise ?? 0, 'inr');
export const when = (v) => (v ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

/** What the API lets each role do here (routes/admin/fleet.ts); owners can do everything. */
export function useFleetRoles() {
  const { role } = useSession();
  const owner = role === 'owner';
  return {
    role,
    canDispatch: owner || role === 'store_admin' || role === 'order_manager',
    canSettings: owner,
    canReconcile: owner || role === 'finance_manager',
  };
}

/** A mutation that refreshes the fleet queries and reports through the module's toast. */
export function useFleetAction(onShowToast) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ run }) => run(),
    onSuccess: (res, { done }) => {
      qc.invalidateQueries({ queryKey: ['fleet'] });
      if (done) onShowToast?.({ type: 'success', title: typeof done === 'function' ? done(res) : done });
    },
    onError: (err) => onShowToast?.({ type: 'error', title: 'Not done', message: err?.message ?? 'Nothing was changed.' }),
  });
}

/** Asks for the reason the API requires (at least three characters) before an action. */
export function ReasonDialog({ ask, onClose, busy, onConfirm }) {
  const [reason, setReason] = useState('');
  const close = () => {
    setReason('');
    onClose();
  };
  return (
    <AppDialog
      isOpen={!!ask}
      onClose={close}
      title={ask?.title}
      description={ask?.description}
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={close}>
            Back
          </Button>
          <Button
            variant={ask?.danger ? 'destructive' : 'primary'}
            disabled={busy || reason.trim().length < 3}
            onClick={() => Promise.resolve(onConfirm(reason.trim())).then(() => setReason(''))}
          >
            {ask?.confirm ?? 'Confirm'}
          </Button>
        </>
      }
    >
      <div className="pb-space-md">
        <label className="flex flex-col gap-1.5 text-label text-secondary">
          {ask?.label ?? 'Reason'}
          <Input value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
        </label>
      </div>
    </AppDialog>
  );
}

/** One label and value in a detail panel. */
export function Fact({ label, children }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="text-micro text-muted">{label}</dt>
      <dd className="truncate text-label text-primary">{children}</dd>
    </div>
  );
}
