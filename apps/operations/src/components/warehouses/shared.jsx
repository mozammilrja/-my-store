import React, { useId } from 'react';
import { useQuery } from '@tanstack/react-query';
import { warehousesApi } from '../../lib/api-warehouses';
import { useSession } from '../../lib/session';

/* Pieces the warehouse operations tabs share. */

export const WH_KEY = ['admin', 'warehouse-ops'];

/** Every warehouse, the store's and marketplace sellers', default first. */
export function useWarehouses() {
  return useQuery({ queryKey: [...WH_KEY, 'warehouses'], queryFn: () => warehousesApi.warehouses() });
}

export const when = (d) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

/**
 * What the signed-in role may do here, mirroring the API's checks
 * (routes/admin/fulfilment.ts). The API refuses anything else regardless.
 */
export function usePermissions() {
  const { role } = useSession();
  const any = (...roles) => role === 'owner' || roles.includes(role);
  return {
    role,
    moveStock: any('inventory_manager', 'store_admin'),
    viewStaff: any('store_admin', 'inventory_manager'),
    manageStaff: any('store_admin'),
    reassign: any('store_admin', 'order_manager', 'inventory_manager'),
  };
}

/** A labelled form control; the hint is its description, not part of its name. */
export function Field({ label, hint, children, className = '' }) {
  const id = useId();
  const control = React.isValidElement(children)
    ? React.cloneElement(children, { id: children.props.id ?? id, ...(hint ? { 'aria-describedby': `${id}-hint` } : {}) })
    : children;
  return (
    <div className={`flex flex-col gap-1.5 text-label text-secondary ${className}`}>
      <label htmlFor={children?.props?.id ?? id}>{label}</label>
      {control}
      {hint ? (
        <span id={`${id}-hint`} className="text-micro text-muted">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

/** Says why an action isn't offered instead of hiding it silently. */
export function RoleNote({ children }) {
  return (
    <p className="flex items-center gap-space-xs rounded-lg border border-subtle bg-surface-subtle px-space-sm py-space-xs text-meta text-muted">
      {children}
    </p>
  );
}

export const errorText = (e) => e?.message ?? 'Something went wrong. Nothing was changed.';

export const FULFILMENT_STATUS = {
  assigned: { label: 'Assigned', variant: 'warning' },
  picking_pending: { label: 'To pick', variant: 'warning' },
  picking: { label: 'Picking', variant: 'info' },
  picked: { label: 'Picked', variant: 'info' },
  qc_passed: { label: 'Checked', variant: 'info' },
  packed: { label: 'Packed', variant: 'info' },
  label_generated: { label: 'Labelled', variant: 'info' },
  ready_to_dispatch: { label: 'Ready to dispatch', variant: 'info' },
  manifested: { label: 'On manifest', variant: 'info' },
  handed_over: { label: 'Handed over', variant: 'success' },
  dispatched: { label: 'Dispatched', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'secondary' },
};

export const ROLE_LABEL = {
  picker: 'Picker',
  packer: 'Packer',
  inspector: 'Returns inspector',
  dispatcher: 'Dispatcher',
  supervisor: 'Supervisor',
};
