import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Icon,
  Badge,
  Button,
  Card,
  Input,
  Select,
  Separator,
  PageContainer,
  PageHeader,
  PageBody,
  ContentGrid,
  StatsCard,
  StatusBadge,
  SectionCard,
  DataTable,
  TableToolbar,
  SearchInput,
  SkeletonPage,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '../ui';
import { EmptyState } from '../shared/FeedbackAndOverlays';
import { useClientTable } from '../../hooks/useClientTable';
import { useSession } from '../../lib/session';
import { notificationsApi } from '../../lib/api-notifications';
import { CHANNEL_LABEL, EVENT_LABEL, PROVIDER_LABEL, RECIPIENT_LABEL, STATUS, TEMPLATE_VARIABLES, when } from './notification-meta';

/*
 * Outbound notifications, from the API (/admin/notifications/*, /admin/outbox):
 * which channels can send right now, every message and what became of it,
 * the provider templates SMS and WhatsApp need, and background events that
 * kept failing. Retrying and changing templates are owner actions; other
 * roles see the same records read-only.
 */

const KEY = ['admin', 'notifications'];
const OWNER_NOTE = 'Only an owner can retry messages or change templates.';

export function NotificationCentre({ onShowToast }) {
  const { isOwner } = useSession();
  const [tab, setTab] = useState('log');
  const status = useQuery({ queryKey: [...KEY, 'status'], queryFn: () => notificationsApi.status() });

  if (status.isLoading) return <SkeletonPage variant="table" stats={4} statsCols={4} columns={6} label="Loading notifications" />;

  const counts = status.data?.deliveries ?? {};
  const channels = status.data?.channels;
  const live = channels ? [channels.email, channels.sms, channels.whatsapp, channels.push?.webPush || channels.push?.fcm].filter(Boolean).length : 0;

  return (
    <PageContainer>
      <PageHeader
        kicker="Settings & admin"
        title="Notifications"
        description="Email, SMS, WhatsApp and push messages to customers, riders and warehouse staff, and what became of each."
        actions={
          <Button variant="outline" size="sm" onClick={() => status.refetch()} disabled={status.isFetching}>
            <Icon name="refresh" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
            <span>Refresh</span>
          </Button>
        }
      />
      <PageBody error={status.error} hasData={status.data != null} title="Notifications could not be loaded" onRetry={status.refetch}>
        <ContentGrid cols={4}>
          <StatsCard title="Channels sending" value={`${live} of 4`} icon="send" iconColor={live ? 'text-success' : 'text-warning'} trendLabel={live ? 'With a provider configured' : 'No provider configured yet'} />
          <StatsCard title="Sent" value={String(counts.sent ?? 0)} icon="done_all" iconColor="text-success" trendLabel="Accepted by the provider" />
          <StatsCard
            title="Dead letters"
            value={String(counts.dead ?? 0)}
            icon="report_problem"
            iconColor="text-danger"
            trendLabel="Gave up after retries; retry by hand"
          />
          <StatsCard title="Failed background events" value={String(status.data?.failedOutbox ?? 0)} icon="outbox" iconColor="text-warning" trendLabel="Outbox events that kept failing" />
        </ContentGrid>

        {!isOwner && (
          <p className="rounded-lg border border-subtle bg-surface-subtle p-space-sm text-meta text-secondary" role="note">
            {OWNER_NOTE}
          </p>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList aria-label="Notification views">
            <TabsTrigger value="log" className="gap-space-xs">
              <span>Delivery log</span>
              {counts.dead ? (
                <Badge variant="destructive" size="sm" className="tabular-nums">
                  {counts.dead}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="status">Channels</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="outbox" className="gap-space-xs">
              <span>Outbox</span>
              {status.data?.failedOutbox ? (
                <Badge variant="warning" size="sm" className="tabular-nums">
                  {status.data.failedOutbox}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="log">
            <DeliveryLog isOwner={isOwner} onShowToast={onShowToast} />
          </TabsContent>
          <TabsContent value="status">
            <ChannelStatus channels={channels} events={status.data?.events ?? {}} />
          </TabsContent>
          <TabsContent value="templates">
            <Templates isOwner={isOwner} channels={channels} events={status.data?.events ?? {}} onShowToast={onShowToast} />
          </TabsContent>
          <TabsContent value="outbox">
            <Outbox isOwner={isOwner} onShowToast={onShowToast} />
          </TabsContent>
        </Tabs>
      </PageBody>
    </PageContainer>
  );
}

/* ---------- Channels ---------- */

function ChannelStatus({ channels, events }) {
  const rows = [
    { id: 'email', provider: channels?.email, note: 'NOTIFY_EMAIL_PROVIDER: SMTP or Amazon SES' },
    { id: 'sms', provider: channels?.sms, note: 'NOTIFY_SMS_PROVIDER: MSG91 (needs a DLT flow per event) or Twilio' },
    { id: 'whatsapp', provider: channels?.whatsapp, note: 'NOTIFY_WHATSAPP_PROVIDER: Meta Cloud API or Gupshup; approved templates only' },
    {
      id: 'push',
      provider: [channels?.push?.webPush && 'webpush', channels?.push?.fcm && 'fcm'].filter(Boolean).join(' + ') || null,
      note: 'VAPID keys for web push; a service account for FCM',
    },
  ];
  const eventIds = Object.keys(events);
  return (
    <div className="grid grid-cols-1 gap-space-lg lg:grid-cols-12">
      <SectionCard title="Providers" description="Which provider each channel sends through right now, from the API's configuration." className="lg:col-span-5">
        <ul className="flex flex-col">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-start justify-between gap-space-sm border-b border-subtle py-space-sm last:border-0">
              <span className="flex flex-col">
                <span className="text-label font-semibold text-primary">{CHANNEL_LABEL[r.id]}</span>
                <span className="text-micro text-muted">{r.note}</span>
              </span>
              <StatusBadge
                status={r.provider ? r.provider.split(' + ').map((p) => PROVIDER_LABEL[p] ?? p).join(' + ') : 'Not configured'}
                variant={r.provider ? 'success' : 'secondary'}
                size="sm"
              />
            </li>
          ))}
        </ul>
        <p className="mt-space-sm text-micro text-muted">A channel without a provider skips its messages and records why; nothing is reported as sent that wasn't.</p>
      </SectionCard>
      <SectionCard title="Events and channels" description="Which channels each event uses, before customer preferences." className="min-w-0 lg:col-span-7">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-meta">
            <caption className="sr-only">Channels used by each notification event</caption>
            <thead>
              <tr className="text-left text-micro text-muted">
                <th scope="col" className="py-space-xs pr-space-sm font-medium">Event</th>
                {['email', 'sms', 'whatsapp', 'push'].map((c) => (
                  <th key={c} scope="col" className="px-space-xs py-space-xs text-center font-medium">
                    {CHANNEL_LABEL[c]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {eventIds.map((e) => (
                <tr key={e} className="border-t border-subtle">
                  <th scope="row" className="py-space-xs pr-space-sm text-left font-normal text-primary">
                    {EVENT_LABEL[e] ?? e}
                  </th>
                  {['email', 'sms', 'whatsapp', 'push'].map((c) => (
                    <td key={c} className="px-space-xs py-space-xs text-center">
                      {events[e].includes(c) ? (
                        <Icon name="check" className="material-symbols-outlined text-icon-sm text-success" aria-label={`${CHANNEL_LABEL[c]}: yes`} />
                      ) : (
                        <span className="text-muted" aria-label={`${CHANNEL_LABEL[c]}: no`}>
                          –
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

/* ---------- Delivery log ---------- */

const ALL = 'all';

function DeliveryLog({ isOwner, onShowToast }) {
  const qc = useQueryClient();
  const [channel, setChannel] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [event, setEvent] = useState(ALL);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const query = { limit: 500, ...(channel !== ALL ? { channel } : {}), ...(status !== ALL ? { status } : {}), ...(event !== ALL ? { event } : {}) };
  const list = useQuery({ queryKey: [...KEY, 'deliveries', query], queryFn: () => notificationsApi.deliveries(query) });
  const all = list.data?.deliveries ?? [];
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? all.filter((d) => d.recipient.to.toLowerCase().includes(q) || d.recipient.id.toLowerCase().includes(q)) : all;
  }, [all, search]);
  const pager = useClientTable(rows);
  const selected = rows.find((d) => d._id === selectedId) ?? null;

  const retry = useMutation({
    mutationFn: (id) => notificationsApi.retryDelivery(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      onShowToast?.({ type: 'success', title: 'Queued to send again', message: 'The message goes out on the next delivery run.' });
    },
    onError: (e) => onShowToast?.({ type: 'error', title: 'Not retried', message: e.message }),
  });

  const filtered = channel !== ALL || status !== ALL || event !== ALL || search;
  const clear = () => {
    setChannel(ALL);
    setStatus(ALL);
    setEvent(ALL);
    setSearch('');
  };

  const columns = [
    {
      key: 'event',
      header: 'Message',
      cell: (d) => (
        <div className="flex flex-col">
          <span className="text-label font-semibold text-primary">{EVENT_LABEL[d.event] ?? d.event}</span>
          <span className="text-micro text-muted">
            {CHANNEL_LABEL[d.channel]} · {when(d.createdAt)}
          </span>
        </div>
      ),
    },
    {
      key: 'to',
      header: 'Recipient',
      cell: (d) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-meta text-primary">{d.recipient.to || 'Their devices'}</span>
          <span className="text-micro text-muted">{RECIPIENT_LABEL[d.recipient.type] ?? d.recipient.type}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Outcome',
      fit: true,
      cell: (d) => (
        <div className="flex flex-col items-start gap-0.5">
          <StatusBadge status={STATUS[d.status]?.label ?? d.status} variant={STATUS[d.status]?.variant} size="sm" />
          {d.status === 'queued' && d.lastError ? <span className="text-micro text-warning">Retrying after an error</span> : null}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex flex-col gap-space-sm rounded-xl border border-subtle bg-surface-container-lowest p-space-sm shadow-xs lg:flex-row lg:flex-wrap lg:items-center">
        <Select
          aria-label="Channel"
          value={channel}
          onValueChange={setChannel}
          wrapperClassName="min-w-36"
          options={[{ value: ALL, label: 'All channels' }, ...Object.entries(CHANNEL_LABEL).map(([value, label]) => ({ value, label }))]}
        />
        <Select
          aria-label="Outcome"
          value={status}
          onValueChange={setStatus}
          wrapperClassName="min-w-36"
          options={[{ value: ALL, label: 'All outcomes' }, ...Object.entries(STATUS).map(([value, s]) => ({ value, label: s.label }))]}
        />
        <Select
          aria-label="Event"
          value={event}
          onValueChange={setEvent}
          wrapperClassName="min-w-52"
          options={[{ value: ALL, label: 'All events' }, ...Object.entries(EVENT_LABEL).map(([value, label]) => ({ value, label }))]}
        />
        <SearchInput label="Search recipients" placeholder="Email, phone or account id" value={search} onChange={setSearch} onClear={() => setSearch('')} className="w-full lg:ml-auto lg:w-72" />
      </div>

      {list.isError ? (
        <Card className="p-space-md text-body text-danger" role="alert">
          {list.error?.message}{' '}
          <Button variant="link" size="sm" onClick={() => list.refetch()}>
            Try again
          </Button>
        </Card>
      ) : list.isLoading ? (
        <Card className="p-space-md text-body text-muted" role="status" aria-busy="true">
          Loading messages…
        </Card>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={filtered ? 'search' : 'notifications'}
          title={filtered ? 'No messages match' : 'No messages yet'}
          description={filtered ? 'Change or clear the filters.' : 'Messages appear here as orders, deliveries and returns move along.'}
          action={
            filtered ? (
              <Button variant="outline" size="sm" onClick={clear}>
                Clear filters
              </Button>
            ) : null
          }
          className="py-12"
        />
      ) : (
        <div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
          <div className={`min-w-0 ${selected ? 'lg:col-span-7 xl:col-span-8' : 'lg:col-span-12'}`}>
            <DataTable
              columns={columns}
              data={pager.pageRows}
              keyField="_id"
              activeRowId={selected?._id}
              onRowClick={(d) => setSelectedId(d._id)}
              caption="Notification messages"
              toolbar={
                <TableToolbar
                  left={
                    <>
                      <h3 className="text-subheading text-primary">Messages</h3>
                      <Badge variant="secondary" className="tabular-nums">
                        {rows.length}
                        {all.length === 500 ? '+' : ''}
                      </Badge>
                    </>
                  }
                  right={
                    <Button variant="ghost" size="iconSm" onClick={() => list.refetch()} title="Refresh" aria-label="Refresh messages">
                      <Icon name="refresh" aria-hidden="true" className="material-symbols-outlined text-icon-md" />
                    </Button>
                  }
                />
              }
              pagination={{ page: pager.page, pageSize: pager.limit, totalItems: pager.total, onPageChange: pager.setPage, onPageSizeChange: pager.setLimit }}
            />
          </div>
          {selected && (
            <div className="min-w-0 lg:col-span-5 xl:col-span-4">
              <DeliveryDetail d={selected} isOwner={isOwner} busy={retry.isPending} onRetry={() => retry.mutate(selected._id)} onClose={() => setSelectedId(null)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-micro text-muted">{label}</dt>
      <dd className="break-words text-meta text-primary">{children}</dd>
    </div>
  );
}

function DeliveryDetail({ d, isOwner, busy, onRetry, onClose }) {
  return (
    <Card className="flex flex-col gap-space-md p-space-md" aria-label="Message details">
      <div className="flex items-start justify-between gap-space-sm">
        <div className="flex min-w-0 flex-col gap-1">
          <StatusBadge status={STATUS[d.status]?.label ?? d.status} variant={STATUS[d.status]?.variant} className="self-start" />
          <h2 className="text-subheading text-primary">
            {EVENT_LABEL[d.event] ?? d.event} · {CHANNEL_LABEL[d.channel]}
          </h2>
        </div>
        <Button variant="ghost" size="iconSm" onClick={onClose} aria-label="Close message details" title="Close">
          <Icon name="close" aria-hidden="true" className="material-symbols-outlined text-icon-md" />
        </Button>
      </div>
      <dl className="grid grid-cols-1 gap-space-sm sm:grid-cols-2">
        <Field label="To">{d.recipient.to || 'Their registered devices'}</Field>
        <Field label="Recipient">
          {RECIPIENT_LABEL[d.recipient.type] ?? d.recipient.type} · <span className="font-mono">{d.recipient.id}</span>
        </Field>
        <Field label="Created">{when(d.createdAt)}</Field>
        <Field label="Attempts">{d.attempts}</Field>
        {d.provider && <Field label="Provider">{PROVIDER_LABEL[d.provider] ?? d.provider}</Field>}
        {d.providerMessageId && (
          <Field label="Provider message id">
            <span className="font-mono">{d.providerMessageId}</span>
          </Field>
        )}
        {d.sentAt && <Field label={d.status === 'skipped' ? 'Skipped' : 'Sent'}>{when(d.sentAt)}</Field>}
        {d.status === 'queued' && <Field label="Next attempt">{when(d.nextAttemptAt)}</Field>}
      </dl>
      {d.skipReason && <p className="rounded-lg bg-surface-subtle p-space-sm text-meta text-secondary">Skipped: {d.skipReason}</p>}
      {d.lastError && <p className="rounded-lg bg-status-danger-bg p-space-sm text-meta text-danger">Last error: {d.lastError}</p>}
      <Separator />
      <div className="flex flex-col gap-space-xs">
        <span className="text-micro text-muted">What it says</span>
        {d.content.subject && <span className="text-label font-semibold text-primary">{d.content.subject}</span>}
        {d.content.title && !d.content.subject && <span className="text-label font-semibold text-primary">{d.content.title}</span>}
        <p className="whitespace-pre-wrap text-meta text-secondary">{d.content.text}</p>
        {d.content.params?.length > 0 && (
          <p className="text-micro text-muted">
            Template variables: {d.content.params.map((p, i) => `${i + 1}. ${p || '(empty)'}`).join(' · ')}
          </p>
        )}
      </div>
      {d.status === 'dead' &&
        (isOwner ? (
          <Button variant="primary" className="w-full" disabled={busy} onClick={onRetry}>
            {busy ? 'Queuing…' : 'Send again'}
          </Button>
        ) : (
          <p className="text-meta text-muted">{OWNER_NOTE}</p>
        ))}
      {d.status === 'queued' && d.lastError && <p className="text-meta text-muted">The API is still retrying this one on its own.</p>}
    </Card>
  );
}

/* ---------- Templates ---------- */

const NEEDS_TEMPLATE = (channels) => channels.includes('sms') || channels.includes('whatsapp');

function Templates({ isOwner, channels, events, onShowToast }) {
  const list = useQuery({ queryKey: [...KEY, 'templates'], queryFn: () => notificationsApi.templates() });
  if (list.isLoading)
    return (
      <Card className="p-space-md text-body text-muted" role="status" aria-busy="true">
        Loading templates…
      </Card>
    );
  if (list.isError)
    return (
      <Card className="p-space-md text-body text-danger" role="alert">
        {list.error?.message}
      </Card>
    );
  const saved = list.data?.templates ?? {};
  const templated = Object.keys(events).filter((e) => NEEDS_TEMPLATE(events[e]));
  return (
    <div className="flex flex-col gap-space-md">
      <p className="text-meta text-secondary">
        Email and push are written by the store and need nothing here. SMS through MSG91 and every WhatsApp message use templates registered with the provider (DLT for SMS, Meta approval for WhatsApp); enter their ids here.
        Register each template with its variables in the order shown.
        {channels?.sms === 'twilio' ? ' Twilio sends plain text, so SMS needs no template.' : ''}
      </p>
      <div className="grid grid-cols-1 gap-space-md xl:grid-cols-2">
        {templated.map((e) => (
          <TemplateCard key={e} event={e} uses={events[e]} saved={saved[e] ?? {}} isOwner={isOwner} channels={channels} onShowToast={onShowToast} />
        ))}
      </div>
    </div>
  );
}

function TemplateCard({ event, uses, saved, isOwner, channels, onShowToast }) {
  const qc = useQueryClient();
  const [flow, setFlow] = useState(saved.msg91FlowId ?? '');
  const [waName, setWaName] = useState(saved.whatsapp?.name ?? '');
  const [waLang, setWaLang] = useState(saved.whatsapp?.language ?? 'en');
  const [gupshup, setGupshup] = useState(saved.gupshupTemplateId ?? '');
  const id = `tpl-${event}`;
  const vars = TEMPLATE_VARIABLES[event] ?? [];
  const configured = !!(saved.msg91FlowId || saved.whatsapp || saved.gupshupTemplateId);

  const save = useMutation({
    mutationFn: (body) => notificationsApi.saveTemplates(event, body),
    onSuccess: (_r, body) => {
      qc.invalidateQueries({ queryKey: [...KEY, 'templates'] });
      onShowToast?.({ type: 'success', title: Object.keys(body).length ? `Templates saved for ${EVENT_LABEL[event] ?? event}` : `Templates cleared for ${EVENT_LABEL[event] ?? event}` });
    },
    onError: (e) => onShowToast?.({ type: 'error', title: 'Not saved', message: e.message }),
  });

  const body = () => ({
    ...(uses.includes('sms') && flow.trim() ? { msg91FlowId: flow.trim() } : {}),
    ...(uses.includes('whatsapp') && waName.trim() ? { whatsapp: { name: waName.trim(), language: waLang.trim() || 'en' } } : {}),
    ...(uses.includes('whatsapp') && gupshup.trim() ? { gupshupTemplateId: gupshup.trim() } : {}),
  });

  return (
    <SectionCard
      title={EVENT_LABEL[event] ?? event}
      description={`Uses ${uses.map((c) => CHANNEL_LABEL[c]).join(', ')}`}
      action={<StatusBadge status={configured ? 'Set' : 'Not set'} variant={configured ? 'success' : 'secondary'} size="sm" />}
    >
      <form
        className="flex flex-col gap-space-sm"
        aria-label={`Templates for ${EVENT_LABEL[event] ?? event}`}
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(body());
        }}
      >
        <div className="rounded-lg bg-surface-subtle p-space-sm">
          <span className="text-micro text-muted">Variables, in order</span>
          <ol className="mt-1 flex flex-wrap gap-x-space-md gap-y-1 text-meta text-primary">
            {vars.map((v, i) => (
              <li key={v}>
                <span className="font-mono text-accent">{`{{${i + 1}}}`}</span> {v}
                {uses.includes('sms') ? <span className="text-micro text-muted"> (var{i + 1})</span> : null}
              </li>
            ))}
          </ol>
        </div>
        {uses.includes('sms') && (
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-flow`} className="text-label text-secondary">
              MSG91 flow id
            </label>
            <Input id={`${id}-flow`} value={flow} onChange={(e) => setFlow(e.target.value)} disabled={!isOwner} pattern="[A-Za-z0-9]{8,40}" title="8 to 40 letters and digits" placeholder="e.g. 65f1c2a9d6fc0533a12b4c71" className="font-mono" />
          </div>
        )}
        {uses.includes('whatsapp') && (
          <>
            <div className="grid grid-cols-1 gap-space-sm sm:grid-cols-3">
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label htmlFor={`${id}-wa`} className="text-label text-secondary">
                  WhatsApp template name (Meta)
                </label>
                <Input id={`${id}-wa`} value={waName} onChange={(e) => setWaName(e.target.value)} disabled={!isOwner} pattern="[a-z0-9_]{1,512}" title="Lowercase letters, digits and underscores" placeholder={event} className="font-mono" />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor={`${id}-lang`} className="text-label text-secondary">
                  Language
                </label>
                <Input id={`${id}-lang`} value={waLang} onChange={(e) => setWaLang(e.target.value)} disabled={!isOwner} pattern="[a-z]{2,3}(_[A-Z]{2})?" title="A language code such as en or en_US" className="font-mono" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={`${id}-gs`} className="text-label text-secondary">
                Gupshup template id
              </label>
              <Input id={`${id}-gs`} value={gupshup} onChange={(e) => setGupshup(e.target.value)} disabled={!isOwner} minLength={8} maxLength={64} className="font-mono" />
            </div>
            {channels?.whatsapp && <p className="text-micro text-muted">Sending through {PROVIDER_LABEL[channels.whatsapp]}; it uses {channels.whatsapp === 'meta' ? 'the Meta template name' : 'the Gupshup template id'}.</p>}
          </>
        )}
        {isOwner ? (
          <div className="flex flex-wrap gap-space-sm">
            <Button type="submit" variant="primary" size="sm" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
            {configured && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={save.isPending}
                onClick={() => {
                  setFlow('');
                  setWaName('');
                  setGupshup('');
                  save.mutate({});
                }}
              >
                Clear
              </Button>
            )}
          </div>
        ) : null}
      </form>
    </SectionCard>
  );
}

/* ---------- Outbox ---------- */

const TOPIC_LABEL = {
  'order.placed': 'Order placed: confirmation messages',
  'fulfilment.assigned': 'Order allocated: warehouse alert',
  'delivery.offered': 'Delivery offered: rider alert',
};

function Outbox({ isOwner, onShowToast }) {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: [...KEY, 'outbox'], queryFn: () => notificationsApi.outbox('failed') });
  const retry = useMutation({
    mutationFn: (id) => notificationsApi.retryOutbox(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      onShowToast?.({ type: 'success', title: 'Event queued again', message: 'The background worker picks it up within a minute.' });
    },
    onError: (e) => onShowToast?.({ type: 'error', title: 'Not retried', message: e.message }),
  });
  if (list.isLoading)
    return (
      <Card className="p-space-md text-body text-muted" role="status" aria-busy="true">
        Loading events…
      </Card>
    );
  if (list.isError)
    return (
      <Card className="p-space-md text-body text-danger" role="alert">
        {list.error?.message}
      </Card>
    );
  const events = list.data?.events ?? [];
  return (
    <SectionCard title="Failed background events" description="Events written with an order or delivery that failed five times. Retrying runs them again from the start; messages already sent are not sent twice.">
      {events.length === 0 ? (
        <EmptyState icon="task_alt" title="Nothing failed" description="Every background event has been processed." className="py-10" />
      ) : (
        <ul className="flex flex-col">
          {events.map((e) => (
            <li key={e._id} className="flex flex-wrap items-start justify-between gap-space-sm border-b border-subtle py-space-sm last:border-0">
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-label font-semibold text-primary">{TOPIC_LABEL[e.topic] ?? e.topic}</span>
                <span className="text-micro text-muted">
                  <span className="font-mono">{e.topic}</span> · {when(e.createdAt)} · {e.retryCount} attempts
                  {e.payload?.orderId ? (
                    <>
                      {' '}
                      · order <span className="font-mono">{e.payload.orderId}</span>
                    </>
                  ) : null}
                </span>
                {e.lastError && <span className="text-meta text-danger">{e.lastError}</span>}
              </span>
              {isOwner ? (
                <Button size="sm" variant="outline" disabled={retry.isPending} onClick={() => retry.mutate(e._id)} aria-label={`Retry ${e.topic} event`}>
                  Retry
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {!isOwner && events.length > 0 && <p className="mt-space-sm text-meta text-muted">{OWNER_NOTE}</p>}
    </SectionCard>
  );
}
