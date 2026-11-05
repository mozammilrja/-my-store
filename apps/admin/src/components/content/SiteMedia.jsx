import React, { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Icon, PageBody, PageContainer, PageHeader, SectionCard, SkeletonPage } from '../ui';
import { adminApi, describeUploadProblem, UPLOAD_TYPES } from '../../lib/api';

const KEY = ['site-media'];

/**
 * Site media: every banner and editorial image the storefront shows, grouped
 * by where it appears. Replacing one uploads the file and points the slot at
 * it; the storefront picks it up within a minute. Reset puts the shipped
 * image back.
 */
export function SiteMedia({ onShowToast }) {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: KEY, queryFn: () => adminApi.siteMedia() });
  const media = data?.media;

  const groups = useMemo(() => {
    const out = new Map();
    for (const item of media ?? []) {
      if (!out.has(item.group)) out.set(item.group, []);
      out.get(item.group).push(item);
    }
    return [...out.entries()];
  }, [media]);

  const replaceInCache = (next) =>
    queryClient.setQueryData(KEY, (old) =>
      old ? { media: old.media.map((m) => (m.key === next.key ? next : m)) } : old
    );

  const reset = useMutation({
    mutationFn: (key) => adminApi.resetSiteMedia(key),
    onSuccess: ({ media: next }) => {
      replaceInCache(next);
      onShowToast?.({ type: 'success', title: 'Image reset', message: `${next.label} is back to the original image.` });
    },
    onError: (e) => onShowToast?.({ type: 'error', title: 'Reset failed', message: e.message }),
  });

  if (isLoading) return <SkeletonPage variant="cards" stats={0} label="Loading site media" />;

  const custom = (media ?? []).filter((m) => !m.isDefault).length;

  return (
    <PageContainer>
      <PageHeader
        kicker="Catalog & inventory"
        title="Site media"
        description="Banners, editorial and concierge images on the storefront. Product and category photos are edited on the product."
        badge={media ? `${custom} of ${media.length} replaced` : undefined}
        badgeVariant="info"
      />
      <PageBody error={error} hasData={media != null} title="Site media could not be loaded" onRetry={refetch}>
        <div className="flex flex-col gap-space-lg">
          {groups.map(([group, items]) => (
            <SectionCard key={group} title={group} description={`${items.length} ${items.length === 1 ? 'image' : 'images'}`}>
              <ul className="grid grid-cols-1 gap-space-md sm:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                  <MediaSlot
                    key={item.key}
                    item={item}
                    onReplaced={(next) => {
                      replaceInCache(next);
                      onShowToast?.({ type: 'success', title: 'Image replaced', message: `${next.label} updated. The storefront shows it within a minute.` });
                    }}
                    onError={(message) => onShowToast?.({ type: 'error', title: 'Upload failed', message })}
                    onReset={() => reset.mutate(item.key)}
                    resetting={reset.isPending && reset.variables === item.key}
                  />
                ))}
              </ul>
            </SectionCard>
          ))}
        </div>
      </PageBody>
    </PageContainer>
  );
}

function MediaSlot({ item, onReplaced, onError, onReset, resetting }) {
  const input = useRef(null);
  const [progress, setProgress] = useState(null);
  const [busy, setBusy] = useState(false);

  const choose = async (file) => {
    if (!file) return;
    const problem = describeUploadProblem(file);
    if (problem) return onError(problem);
    setBusy(true);
    setProgress(0);
    try {
      const uploaded = await adminApi.uploadImage(file, { onProgress: setProgress });
      const { media } = await adminApi.updateSiteMedia(item.key, { url: uploaded.path });
      onReplaced(media);
    } catch (e) {
      onError(e.message);
    } finally {
      setBusy(false);
      setProgress(null);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <li className="flex flex-col overflow-hidden rounded-lg border border-subtle bg-surface-container-lowest" data-testid="site-media-slot">
      <div className="relative aspect-[4/3] bg-surface-subtle">
        <img src={item.previewUrl ?? item.url} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-label font-medium text-white">
            {progress == null ? 'Uploading…' : `Uploading ${progress}%`}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-space-xs p-space-md">
        <div className="flex items-start justify-between gap-space-sm">
          <span className="text-body font-medium text-primary">{item.label}</span>
          <Badge variant={item.isDefault ? 'secondary' : 'info'}>{item.isDefault ? 'Original' : 'Replaced'}</Badge>
        </div>
        <span className="text-meta text-muted">Shown on: {item.usedOn.join(' · ')}</span>
        <div className="mt-auto flex items-center gap-space-sm pt-space-sm">
          <input
            ref={input}
            type="file"
            accept={UPLOAD_TYPES.join(',')}
            className="sr-only"
            aria-label={`Replace ${item.label}`}
            onChange={(e) => choose(e.target.files?.[0])}
          />
          <Button variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
            <Icon name="upload" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
            <span>Replace</span>
          </Button>
          {!item.isDefault && (
            <Button variant="ghost" size="sm" disabled={busy || resetting} onClick={onReset}>
              {resetting ? 'Resetting…' : 'Reset to original'}
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
