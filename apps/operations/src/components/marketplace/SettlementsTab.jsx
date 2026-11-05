import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { marketplaceApi } from '../../lib/api-marketplace';
import { AppDialog, Badge, Button, DataTable, EmptyState, Input, StatusBadge, TableToolbar } from '../ui';
import { useClientTable } from '../../hooks/useClientTable';
import { LEDGER_KIND, UTR, day, marketplaceRights, money, when } from './shared';

/*
 * Seller payouts. A run gathers each seller's payable ledger lines (return
 * window closed, order paid) into one settlement; finance pays it by bank
 * transfer and records the UTR.
 */

export function SettlementsTab({ settlementsQuery, sellerName, role, onShowToast }) {
  const qc = useQueryClient();
  const can = marketplaceRights(role).finance;
  const [paying, setPaying] = useState(null);
  const [utr, setUtr] = useState('');
  const all = settlementsQuery.data?.settlements ?? [];
  const pager = useClientTable(all);
  const failed = (err) => onShowToast?.({ type: 'error', title: 'Not done', message: err?.message ?? 'Nothing was changed.' });

  const run = useMutation({
    mutationFn: () => marketplaceApi.runSettlements(),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['admin', 'marketplace'] });
      const n = res.settlements.length;
      onShowToast?.({ type: 'success', title: n ? `${n} settlement${n === 1 ? '' : 's'} created` : 'Nothing payable yet', message: n ? `Total ${money(res.settlements.reduce((s, x) => s + x.net, 0))} to pay out.` : 'Sales become payable once their return window closes and the order is paid.' });
    },
    onError: failed,
  });
  const paid = useMutation({
    mutationFn: () => marketplaceApi.markPaid(paying._id, utr.trim().toUpperCase()),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['admin', 'marketplace'] });
      onShowToast?.({ type: 'success', title: `${res.settlement.code} marked paid`, message: `UTR ${res.settlement.payout.utr}` });
      setPaying(null);
      setUtr('');
    },
    onError: failed,
  });
  const utrOk = UTR.test(utr.trim().toUpperCase());

  const columns = [
    {
      key: 'code',
      header: 'Settlement',
      cell: (s) => (
        <div className="flex flex-col">
          <span className="font-mono text-label font-semibold text-accent">{s.code}</span>
          <span className="text-micro text-muted">
            {sellerName(s.sellerId)} · {s.entryIds.length} lines · up to {day(s.periodEnd)}
          </span>
        </div>
      ),
    },
    {
      key: 'breakdown',
      header: 'Breakdown',
      cell: (s) => (
        <ul className="flex min-w-48 flex-col text-micro text-secondary">
          {Object.entries(s.totals)
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <li key={k} className="flex justify-between gap-space-sm">
                <span>{LEDGER_KIND[k] ?? k}</span>
                <span className="tabular-nums">{money(v, s.currency)}</span>
              </li>
            ))}
        </ul>
      ),
    },
    { key: 'net', header: 'Net', align: 'right', fit: true, cell: (s) => <span className="text-meta font-semibold tabular-nums text-primary">{money(s.net, s.currency)}</span> },
    {
      key: 'status',
      header: 'Status',
      fit: true,
      cell: (s) =>
        s.status === 'paid' ? (
          <div className="flex flex-col items-start gap-0.5">
            <StatusBadge status="Paid" variant="success" />
            <span className="font-mono text-micro text-muted">UTR {s.payout.utr}</span>
            <span className="text-micro text-muted">{when(s.payout.paidAt)}</span>
          </div>
        ) : can ? (
          <Button size="sm" variant="outline" onClick={() => setPaying(s)} aria-label={`Record payment for ${s.code}`}>
            Record payment
          </Button>
        ) : (
          <StatusBadge status="To pay" variant="warning" />
        ),
    },
  ];

  return (
    <>
      {all.length === 0 ? (
        <EmptyState
          icon="account_balance"
          title="No settlements yet"
          description="Run settlements to gather each seller's payable sales. Lines become payable once the return window has closed and the order is paid."
          className="py-16"
          action={
            can ? (
              <Button variant="primary" size="sm" disabled={run.isPending} onClick={() => run.mutate()}>
                Run settlements
              </Button>
            ) : null
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={pager.pageRows}
          keyField="_id"
          caption="Settlements"
          toolbar={
            <TableToolbar
              left={
                <>
                  <h3 className="text-subheading text-primary">Settlements</h3>
                  <Badge variant="secondary" className="tabular-nums">
                    {all.filter((s) => s.status === 'pending').length} to pay
                  </Badge>
                </>
              }
              right={
                can ? (
                  <Button variant="primary" size="sm" disabled={run.isPending} onClick={() => run.mutate()}>
                    Run settlements
                  </Button>
                ) : (
                  <span className="text-micro text-muted">Finance runs and pays settlements.</span>
                )
              }
            />
          }
          pagination={{ page: pager.page, pageSize: pager.limit, totalItems: pager.total, onPageChange: pager.setPage, onPageSizeChange: pager.setLimit }}
        />
      )}
      <AppDialog
        isOpen={!!paying}
        onClose={() => setPaying(null)}
        title={paying ? `Record payment for ${paying.code}` : ''}
        description={paying ? `Transfer ${money(paying.net, paying.currency)} to ${sellerName(paying.sellerId)}'s bank account, then enter the bank's reference.` : ''}
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="outline" onClick={() => setPaying(null)}>
              Back
            </Button>
            <Button variant="primary" disabled={paid.isPending || !utrOk} onClick={() => paid.mutate()}>
              Mark paid
            </Button>
          </>
        }
      >
        <label className="flex flex-col gap-1.5 pb-space-md text-label text-secondary">
          UTR (bank transfer reference)
          <Input value={utr} onChange={(e) => setUtr(e.target.value.toUpperCase())} className="font-mono" placeholder="HDFCN52026110512345" maxLength={22} aria-invalid={utr && !utrOk ? true : undefined} aria-describedby="utr-hint" autoFocus />
          <span id="utr-hint" className={utr && !utrOk ? 'text-micro text-danger' : 'text-micro text-muted'}>
            12 to 22 letters and digits, as on the bank statement.
          </span>
        </label>
      </AppDialog>
    </>
  );
}
