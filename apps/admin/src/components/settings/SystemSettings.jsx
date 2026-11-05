import React, { useState, useEffect } from 'react';
import {
  Icon,
  Button,
  Badge,
  Select,
  Input,
  Checkbox,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  PageContainer,
  PageHeader,
  SectionCard,
  PageBody,
  SkeletonPage,
  FormGrid,
  FormInput,
} from '../ui';
import { adminApi } from '../../lib/api';
import { useSettingsQuery, useUpdateSettingsMutation } from '../../hooks/useAdminQueries';
import { useSession } from '../../lib/session';

const SECTIONS = [
  { id: 'general', label: 'General', icon: 'hub' },
  { id: 'tax', label: 'GST & compliance', icon: 'receipt_long' },
  { id: 'integrations', label: 'Webhooks', icon: 'webhook' },
  { id: 'security', label: 'Security', icon: 'security' },
];

const WEBHOOKS = [
  { name: 'Razorpay instant settlement', url: 'https://api.everwear.in/v2/webhooks/razorpay-settle' },
  { name: 'HDFC SmartHub payment hook', url: 'https://api.everwear.in/v2/webhooks/hdfc-pg' },
  { name: 'Bluedart manifest telemetry', url: 'https://api.everwear.in/v2/webhooks/bluedart-track' },
];

/** One setting: its name and explanation on the left, the control on the right. */
function SettingRow({ id, title, description, children }) {
  return (
    <div className="flex flex-col gap-space-sm p-space-md sm:flex-row sm:items-center sm:justify-between sm:gap-space-lg">
      <div className="flex min-w-0 flex-col gap-0.5">
        <label htmlFor={id} className="text-label font-medium text-primary">{title}</label>
        {description && <p className="text-meta text-muted">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** Seller-of-record fields, in form order. Keys match the API's settings.seller. */
const SELLER_FIELDS = [
  { key: 'legalName', label: 'Legal name', placeholder: 'Everwear Studios India Private Limited' },
  { key: 'gstin', label: 'GSTIN', placeholder: '15 characters, e.g. 07AABCE1234F1Z8' },
  { key: 'cin', label: 'CIN', placeholder: '21 characters' },
  { key: 'state', label: 'State (GST code)', placeholder: 'Delhi (07)' },
  { key: 'address', label: 'Registered address', placeholder: 'Street, city, PIN, country' },
  { key: 'email', label: 'Invoice email', type: 'email', placeholder: 'support@…' },
  { key: 'phone', label: 'Phone', type: 'tel', placeholder: '+91 …' },
];

const EMPTY_SELLER = Object.fromEntries(SELLER_FIELDS.map(({ key }) => [key, '']));

export function SystemSettings({ onNavigate, onShowToast }) {
  const [activeSection, setActiveSection] = useState('general');
  const [autoReconcile, setAutoReconcile] = useState(true);
  const [marginShield, setMarginShield] = useState(true);
  const [ipWhitelisting, setIpWhitelisting] = useState(true);
  const [cloudSyncInterval, setCloudSyncInterval] = useState('15');
  const [activeLogLevel, setActiveLogLevel] = useState('INFO');

  // TanStack Query for store settings
  const {
    data: settingsData,
    isLoading,
    isError: isSettingsError,
    error: settingsError,
    refetch: refetchSettings,
  } = useSettingsQuery();
  const updateSettingsMutation = useUpdateSettingsMutation();
  // PATCH /admin/settings is owner-only server-side.
  const { isOwner: canEditSettings } = useSession();

  // Backend store settings
  const [storeName, setStoreName] = useState('Everwear');
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [supportEmail, setSupportEmail] = useState('concierge@everwear.test');
  const [isSaving, setIsSaving] = useState(false);
  // Seller of record, printed on every GST tax invoice the storefront issues.
  const [seller, setSeller] = useState(EMPTY_SELLER);
  const setSellerField = (key) => (value) => setSeller((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (settingsData?.settings) {
      if (settingsData.settings.storeName) setStoreName(settingsData.settings.storeName);
      if (settingsData.settings.lowStockThreshold !== undefined) setLowStockThreshold(settingsData.settings.lowStockThreshold);
      if (settingsData.settings.supportEmail) setSupportEmail(settingsData.settings.supportEmail);
      if (settingsData.settings.seller) {
        setSeller(Object.fromEntries(SELLER_FIELDS.map(({ key }) => [key, settingsData.settings.seller[key] ?? ''])));
      }
    }
  }, [settingsData]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await updateSettingsMutation.mutateAsync({
        storeName,
        lowStockThreshold: Number(lowStockThreshold),
        supportEmail: supportEmail || null,
        // A blank field clears that detail rather than saving an empty string.
        seller: Object.fromEntries(SELLER_FIELDS.map(({ key }) => [key, seller[key]?.trim() || null])),
      });
      onShowToast?.({
        type: 'success',
        title: 'Settings Saved',
        message: 'System governance & store configuration persisted to database.',
      });
    } catch (err) {
      onShowToast?.({
        type: 'error',
        title: 'Save Failed',
        message: err?.message || 'Could not save store settings.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setStoreName('Everwear');
    setLowStockThreshold(5);
    setSupportEmail('concierge@everwear.test');
    onShowToast?.({
      type: 'info',
      title: 'Defaults Staged',
      message: 'Reset staged settings to standard defaults. Click Save Configuration to persist.',
    });
  };

  if (isLoading) {
    return <SkeletonPage variant="settings" label="Loading system settings" />;
  }

  return (
    <PageContainer>
      <PageHeader
        kicker="Settings & admin"
        title="Settings"
        description="Store name, stock threshold and support contact."
        actions={
          <div className="flex shrink-0 items-center gap-space-sm">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDefaults}
            >
              Reset defaults
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveSettings}
              disabled={isSaving || !canEditSettings}
              title={canEditSettings ? undefined : 'Only an owner can change store settings'}
            >
              {isSaving ? 'Saving' : 'Save configuration'}
            </Button>
          </div>
        }
      />
      <PageBody
        error={settingsError}
        hasData={settingsData != null}
        title="Settings could not be loaded"
        onRetry={refetchSettings}
      >

        <Tabs value={activeSection} onValueChange={setActiveSection}>
          <TabsList aria-label="Settings sections">
            {SECTIONS.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-space-xs">
                <Icon name={tab.icon} aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                <span>{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="general" className="flex flex-col gap-space-lg">
            <SectionCard title="Store details" description="Saved to the store settings and used across the admin and storefront.">
              <FormGrid columns={3}>
                <FormInput
                  id="settings-store-name"
                  label="Store name"
                  value={storeName}
                  onChange={(value) => setStoreName(value)}
                />
                <FormInput
                  id="settings-low-stock"
                  label="Low-stock alert (units)"
                  type="number"
                  min="0"
                  max="1000"
                  value={lowStockThreshold}
                  onChange={(value) => setLowStockThreshold(Number(value))}
                />
                <FormInput
                  id="settings-support-email"
                  label="Support email"
                  type="email"
                  value={supportEmail}
                  onChange={(value) => setSupportEmail(value)}
                />
              </FormGrid>
            </SectionCard>

            <SectionCard
              title="Seller details"
              description="The legal details printed on every GST tax invoice. Leave a field blank to omit it."
            >
              <FormGrid columns={2}>
                {SELLER_FIELDS.map(({ key, label, type, placeholder }) => (
                  <FormInput
                    key={key}
                    id={`settings-seller-${key}`}
                    label={label}
                    type={type ?? 'text'}
                    placeholder={placeholder}
                    value={seller[key]}
                    onChange={setSellerField(key)}
                    disabled={!canEditSettings}
                  />
                ))}
              </FormGrid>
            </SectionCard>

            <SectionCard
              title="Fulfilment routing"
              description="Split-shipment prevention and nearest-warehouse allocation."
              contentClassName="p-0"
            >
              <div className="divide-y divide-subtle">
                <SettingRow
                  id="settings-proximity-dispatch"
                  title="Automated proximity dispatch"
                  description="Route courier orders to the fulfilment centre with the shortest ground transit time."
                >
                  <Checkbox
                    id="settings-proximity-dispatch"
                    checked={autoReconcile}
                    onChange={(e) => setAutoReconcile(e.target.checked)}
                    className="h-5 w-5"
                  />
                </SettingRow>
                <SettingRow
                  id="settings-margin-guardrail"
                  title="Gross margin guardrail"
                  description="Block checkout if promotional discounts push a line item's contribution margin below 45%."
                >
                  <Checkbox
                    id="settings-margin-guardrail"
                    checked={marginShield}
                    onChange={(e) => setMarginShield(e.target.checked)}
                    className="h-5 w-5"
                  />
                </SettingRow>
                <SettingRow title="Telemetry sync rate" description="How often warehouse telemetry is pulled.">
                  <Select
                    value={cloudSyncInterval}
                    onChange={(e) => setCloudSyncInterval(e.target.value)}
                    aria-label="Telemetry sync rate"
                    wrapperClassName="w-full sm:w-64"
                  >
                    <option value="5">Every 5 seconds (high realtime)</option>
                    <option value="15">Every 15 seconds (balanced)</option>
                    <option value="60">Every 60 seconds (low bandwidth)</option>
                  </Select>
                </SettingRow>
              </div>
            </SectionCard>
          </TabsContent>

          <TabsContent value="tax">
            <SectionCard
              title="GSTIN and statutory tax"
              description="E-invoicing credentials and GSTR filing rules."
              contentClassName="p-0"
            >
              <div className="divide-y divide-subtle">
                {/* Settings hold a store name, a low-stock threshold and a
                    support email; there is no GSTIN field to read. The box
                    used to show a made-up number marked VERIFIED. */}
                <div className="flex flex-col gap-space-sm p-space-md">
                  <div className="flex items-center justify-between gap-space-sm">
                    <span className="text-label font-medium text-primary">Primary registered GSTIN</span>
                    <Badge variant="secondary">Not recorded</Badge>
                  </div>
                  <Input
                    readOnly
                    aria-label="Primary registered GSTIN"
                    value="No GSTIN is stored against this store"
                    className="text-muted"
                  />
                </div>
                <SettingRow
                  title="Credit note auto-lock window"
                  description="Credit notes issued in a calendar month lock on the 10th of the following month, before GSTR-1 filing."
                >
                  <span className="text-meta text-muted">Mandatory under Rule 54(1)</span>
                </SettingRow>
              </div>
            </SectionCard>
          </TabsContent>

          <TabsContent value="integrations">
            {/* Each endpoint used to carry a "Healthy 200 OK" tag and a
                latency (14ms, 22ms, 38ms). Nothing measures either, so only
                the configured endpoints are listed. */}
            <SectionCard
              title="Gateway webhooks"
              description="Endpoints that payment and courier providers notify."
              contentClassName="p-0"
            >
              <ul className="divide-y divide-subtle">
                {WEBHOOKS.map((hook) => (
                  <li key={hook.url} className="flex min-w-0 flex-col gap-0.5 p-space-md">
                    <span className="text-label font-medium text-primary">{hook.name}</span>
                    <span className="truncate font-mono text-meta text-muted" title={hook.url}>{hook.url}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </TabsContent>

          <TabsContent value="security">
            <SectionCard
              title="Session security"
              description="Network restrictions and audit logging for warehouse devices."
              contentClassName="p-0"
            >
              <div className="divide-y divide-subtle">
                <SettingRow
                  id="settings-ip-lockdown"
                  title="IP subnet lockdown"
                  description="Restrict warehouse RF scans to the fulfilment centre's own Wi-Fi subnets."
                >
                  <Checkbox
                    id="settings-ip-lockdown"
                    checked={ipWhitelisting}
                    onChange={(e) => setIpWhitelisting(e.target.checked)}
                    className="h-5 w-5"
                  />
                </SettingRow>
                <SettingRow title="Audit log verbosity" description="Detail kept for each recorded action.">
                  <Select
                    value={activeLogLevel}
                    onChange={(e) => setActiveLogLevel(e.target.value)}
                    aria-label="Audit log verbosity"
                    wrapperClassName="w-full sm:w-64"
                  >
                    <option value="INFO">Info (standard)</option>
                    <option value="DEBUG">Debug (verbose)</option>
                    <option value="FORENSIC">Forensic (SHA-256 signed)</option>
                  </Select>
                </SettingRow>
              </div>
            </SectionCard>
          </TabsContent>
        </Tabs>
      </PageBody>
    </PageContainer>
  );
}
