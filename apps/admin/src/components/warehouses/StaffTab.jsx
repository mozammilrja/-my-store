import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { warehousesApi } from '../../lib/api-warehouses';
import { AppDialog, Badge, Button, DataTable, Icon, Input, Select, StatusBadge, TableToolbar } from '../ui';
import { errorText, Field, ROLE_LABEL, RoleNote, usePermissions, useWarehouses, when, WH_KEY } from './shared';

/*
 * Floor staff: separate accounts from admins, signing in to the warehouse
 * app and seeing only the warehouses listed on their account. Their role
 * decides which steps they can do (pick, pack, label, dispatch, inspect).
 */

const ROLE_HINT = {
  picker: 'Picks orders.',
  packer: 'Checks, packs and labels parcels.',
  inspector: 'Grades returned items.',
  dispatcher: 'Accepts orders, labels and hands over to couriers.',
  supervisor: 'Every step, plus stock.',
};

export function StaffTab({ onShowToast }) {
  const can = usePermissions();
  const warehouses = useWarehouses();
  const users = useQuery({ queryKey: [...WH_KEY, 'users'], queryFn: () => warehousesApi.users(), enabled: can.viewStaff });
  const [editing, setEditing] = useState(null); // null | 'new' | user
  const whList = (warehouses.data?.warehouses ?? []).filter((w) => !w.sellerId);
  const codeOf = (id) => warehouses.data?.warehouses.find((w) => w._id === id)?.code ?? id;

  if (!can.viewStaff) return <RoleNote>Warehouse staff accounts are managed by a store admin, inventory manager or owner.</RoleNote>;

  const list = users.data?.users ?? [];
  const columns = [
    {
      key: 'name',
      header: 'Person',
      grow: true,
      cell: (u) => (
        <div className="flex flex-col">
          <span className="text-label font-semibold text-primary">{u.name}</span>
          <span className="text-micro text-muted">{u.email}</span>
        </div>
      ),
    },
    { key: 'role', header: 'Role', cell: (u) => <span className="text-meta">{ROLE_LABEL[u.role] ?? u.role}</span> },
    { key: 'where', header: 'Warehouses', cell: (u) => <span className="font-mono text-meta">{u.warehouseIds.map(codeOf).join(', ')}</span> },
    {
      key: 'status',
      header: 'Status',
      fit: true,
      cell: (u) => <StatusBadge status={u.status === 'active' ? 'Active' : 'Suspended'} variant={u.status === 'active' ? 'success' : 'destructive'} />,
    },
    { key: 'since', header: 'Since', fit: true, cell: (u) => <span className="text-micro text-muted">{when(u.createdAt)}</span> },
  ];

  return (
    <div className="flex flex-col gap-space-md">
      {!can.manageStaff ? <RoleNote>You can see staff accounts. Adding or changing them needs a store admin or owner.</RoleNote> : null}
      <DataTable
        columns={columns}
        data={list}
        keyField="_id"
        isLoading={users.isLoading}
        isError={users.isError}
        errorTitle="Staff could not be loaded"
        errorMessage={users.error?.message}
        onRetry={users.refetch}
        onRowClick={can.manageStaff ? (u) => setEditing(u) : undefined}
        caption="Warehouse staff"
        emptyTitle="No warehouse staff yet"
        emptyMessage="Add the people who pick, pack and dispatch. They sign in to the warehouse app."
        toolbar={
          <TableToolbar
            left={
              <>
                <h2 className="text-subheading text-primary">Warehouse staff</h2>
                <Badge variant="secondary" className="tabular-nums">
                  {list.length}
                </Badge>
              </>
            }
            right={
              can.manageStaff ? (
                <Button variant="primary" size="sm" onClick={() => setEditing('new')} disabled={!whList.length}>
                  <Icon name="person_add" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                  <span>Add staff</span>
                </Button>
              ) : null
            }
          />
        }
      />
      {editing ? <StaffDialog key={editing === 'new' ? 'new' : editing._id} user={editing === 'new' ? null : editing} warehouses={whList} onClose={() => setEditing(null)} onShowToast={onShowToast} /> : null}
    </div>
  );
}

function StaffDialog({ user, warehouses, onClose, onShowToast }) {
  const qc = useQueryClient();
  const creating = !user;
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [role, setRole] = useState(user?.role ?? 'picker');
  const [warehouseIds, setWarehouseIds] = useState(user?.warehouseIds ?? (warehouses[0] ? [warehouses[0]._id] : []));
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const done = (title) => {
    qc.invalidateQueries({ queryKey: [...WH_KEY, 'users'] });
    onShowToast?.({ type: 'success', title });
    onClose();
  };
  const save = useMutation({
    mutationFn: () =>
      creating
        ? warehousesApi.createUser({ name: name.trim(), email: email.trim(), role, warehouseIds, password })
        : warehousesApi.updateUser(user._id, { name: name.trim(), role, warehouseIds, ...(password ? { password } : {}) }),
    onSuccess: (r) => done(creating ? `${r.user.name} can now sign in to the warehouse app` : `${r.user.name} saved`),
    onError: (e) => setError(errorText(e)),
  });
  const status = useMutation({
    mutationFn: (next) => warehousesApi.updateUser(user._id, { status: next }),
    onSuccess: (r) => done(r.user.status === 'suspended' ? `${r.user.name} is suspended and can't sign in` : `${r.user.name} is active again`),
    onError: (e) => setError(errorText(e)),
  });
  const toggle = (id) => setWarehouseIds(warehouseIds.includes(id) ? warehouseIds.filter((x) => x !== id) : [...warehouseIds, id]);
  const ready = name.trim().length >= 2 && warehouseIds.length && (creating ? email.includes('@') && password.length >= 10 : !password || password.length >= 10);

  return (
    <AppDialog
      isOpen
      onClose={onClose}
      title={creating ? 'Add warehouse staff' : user.name}
      description="Staff sign in to the warehouse app and see only the warehouses ticked here."
      maxWidth="max-w-xl"
      footer={
        <>
          {!creating ? (
            <Button
              variant={user.status === 'active' ? 'destructive' : 'outline'}
              className="mr-auto"
              disabled={status.isPending}
              onClick={() => status.mutate(user.status === 'active' ? 'suspended' : 'active')}
            >
              {user.status === 'active' ? 'Suspend' : 'Reactivate'}
            </Button>
          ) : null}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!ready || save.isPending} onClick={() => save.mutate()}>
            {creating ? 'Add staff' : 'Save'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-space-sm pb-space-md sm:grid-cols-2">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email" hint={creating ? 'Their sign-in.' : 'Fixed once created.'}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!creating} />
        </Field>
        <div className="flex flex-col gap-1.5 text-label text-secondary">
          <span>Role</span>
          <Select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
            {Object.entries(ROLE_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
          <span className="text-micro text-muted">{ROLE_HINT[role]}</span>
        </div>
        <Field label={creating ? 'Password' : 'New password'} hint={creating ? 'At least 10 characters. Share it with them in person.' : 'Leave empty to keep the current one.'}>
          <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <fieldset className="flex flex-col gap-space-xs sm:col-span-2">
          <legend className="mb-1 text-label text-secondary">Warehouses</legend>
          <div className="flex flex-wrap gap-space-sm">
            {warehouses.map((w) => (
              <label key={w._id} className="flex items-center gap-space-xs rounded-lg border border-subtle px-space-sm py-1 text-meta text-primary">
                <input type="checkbox" checked={warehouseIds.includes(w._id)} onChange={() => toggle(w._id)} />
                <span className="font-mono">{w.code}</span> {w.name}
              </label>
            ))}
          </div>
        </fieldset>
        {error ? (
          <p role="alert" className="text-meta text-danger sm:col-span-2">
            {error}
          </p>
        ) : null}
      </div>
    </AppDialog>
  );
}
