import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { assetSrc, marketplaceApi } from '../../lib/api-marketplace';
import { AppDialog, Badge, Button, Card, EmptyState, Input } from '../ui';
import { marketplaceRights, money, when } from './shared';

/*
 * Listings sellers have sent for review, oldest first. Approving publishes
 * the listing at once; rejecting sends it back to the seller with a note.
 */

export function ListingsReview({ queueQuery, sellerName, role, onShowToast }) {
  const qc = useQueryClient();
  const can = marketplaceRights(role).listings;
  const [rejecting, setRejecting] = useState(null);
  const [note, setNote] = useState('');
  const decide = useMutation({
    mutationFn: ({ id, decision, note: n }) => marketplaceApi.reviewListing(id, decision, n),
    onSuccess: (res, v) => {
      qc.invalidateQueries({ queryKey: ['admin', 'marketplace'] });
      onShowToast?.({ type: 'success', title: v.decision === 'approve' ? `${res.listing.title} is live` : `${res.listing.title} sent back to the seller` });
      setRejecting(null);
      setNote('');
    },
    onError: (err) => onShowToast?.({ type: 'error', title: 'Not done', message: err?.message ?? 'Nothing was changed.' }),
  });
  const listings = queueQuery.data?.listings ?? [];

  if (!listings.length) return <EmptyState icon="task_alt" title="Nothing to review" description="Listings sellers submit appear here, oldest first." className="py-16" />;

  return (
    <>
      {!can && <p className="text-meta text-muted">Store admins and catalogue managers decide on listings; you can view the queue.</p>}
      <ul className="grid grid-cols-1 gap-space-md xl:grid-cols-2" aria-label="Listings waiting for review">
        {listings.map((p) => (
          <li key={p._id}>
            <Card className="flex h-full flex-col gap-space-md p-space-md">
              <div className="flex flex-wrap items-start justify-between gap-space-sm">
                <div className="flex min-w-0 flex-col">
                  <h3 className="text-subheading text-primary">{p.title}</h3>
                  <span className="text-meta text-secondary">
                    {sellerName(p.sellerId)} · sent {when(p.review?.submittedAt)}
                  </span>
                </div>
                <Badge variant="warning">In review</Badge>
              </div>
              {p.images?.length ? (
                <div className="flex gap-space-xs overflow-x-auto">
                  {p.images.map((src, i) => (
                    <img key={src} src={assetSrc(src)} alt={`${p.title}, photo ${i + 1}`} className="size-24 shrink-0 rounded-lg border border-subtle bg-surface-subtle object-cover" loading="lazy" />
                  ))}
                </div>
              ) : (
                <p className="text-meta text-warning">No photos.</p>
              )}
              {p.description && <p className="line-clamp-4 text-meta text-secondary">{p.description}</p>}
              <table className="w-full text-meta">
                <caption className="sr-only">Variants of {p.title}</caption>
                <thead className="text-left text-micro text-muted">
                  <tr>
                    <th className="pb-1 font-medium">SKU</th>
                    <th className="pb-1 font-medium">Options</th>
                    <th className="pb-1 text-right font-medium">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {p.variants.map((v) => (
                    <tr key={v._id} className="border-t border-subtle">
                      <td className="py-1 font-mono text-primary">{v.sku}</td>
                      <td className="py-1 text-secondary">{Object.values(v.options ?? {}).join(' / ') || v.title}</td>
                      <td className="py-1 text-right tabular-nums text-primary">{money(v.prices?.inr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {can && (
                <div className="mt-auto flex gap-space-sm">
                  <Button variant="primary" className="flex-1" disabled={decide.isPending} onClick={() => decide.mutate({ id: p._id, decision: 'approve' })} aria-label={`Approve ${p.title}`}>
                    Approve and publish
                  </Button>
                  <Button variant="outline" className="flex-1" disabled={decide.isPending} onClick={() => setRejecting(p)} aria-label={`Reject ${p.title}`}>
                    Reject
                  </Button>
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>
      <AppDialog
        isOpen={!!rejecting}
        onClose={() => setRejecting(null)}
        title={rejecting ? `Reject ${rejecting.title}` : ''}
        description="The listing goes back to the seller as a draft with your note."
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              Back
            </Button>
            <Button variant="primary" disabled={decide.isPending || note.trim().length < 3} onClick={() => decide.mutate({ id: rejecting._id, decision: 'reject', note: note.trim() })}>
              Reject
            </Button>
          </>
        }
      >
        <label className="flex flex-col gap-1.5 pb-space-md text-label text-secondary">
          What the seller needs to change
          <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} autoFocus />
        </label>
      </AppDialog>
    </>
  );
}
