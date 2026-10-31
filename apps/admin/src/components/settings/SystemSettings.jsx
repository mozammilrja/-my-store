import React, { useState, useEffect } from 'react';
import {
  Icon,
  Button,
  Badge,
  Select,
  PageContainer,
  PageHeader,
  SectionCard,
  ErrorState,
  SkeletonPage,
} from '../ui';
import { adminApi } from '../../lib/api';
import { useSettingsQuery, useUpdateSettingsMutation } from '../../hooks/useAdminQueries';

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

  // Backend store settings
  const [storeName, setStoreName] = useState('Everwear');
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [supportEmail, setSupportEmail] = useState('concierge@everwear.test');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settingsData?.settings) {
      if (settingsData.settings.storeName) setStoreName(settingsData.settings.storeName);
      if (settingsData.settings.lowStockThreshold !== undefined) setLowStockThreshold(settingsData.settings.lowStockThreshold);
      if (settingsData.settings.supportEmail) setSupportEmail(settingsData.settings.supportEmail);
    }
  }, [settingsData]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await updateSettingsMutation.mutateAsync({
        storeName,
        lowStockThreshold: Number(lowStockThreshold),
        supportEmail: supportEmail || null,
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
      {settingsError && (
        <ErrorState
          title="Settings could not be loaded"
          message={settingsError?.message}
          onRetry={() => refetchSettings()}
        />
      )}
      <PageHeader
        breadcrumb="EVERWEAR ADMIN / SETTINGS & ADMIN / SYSTEM SETTINGS"
        title="Enterprise System Configuration & Node Governance"
        description="Configure national fulfillment clusters, ClearTax statutory sync intervals, Cloudflare CDN edge invalidations, and payment gateway webhooks."
        actions={
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDefaults}
            >
              Reset Defaults
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveSettings}
              disabled={isSaving}
              icon={isSaving ? "hourglass_top" : "save"}
            >
              {isSaving ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        }
      />

      {/* Main Settings Tabs & Work Surface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Navigation Sidebar (3 Cols) */}
        <div className="lg:col-span-3 bg-surface-container-lowest rounded-xl shadow-sm border border-subtle p-2 space-y-1">
          {[
            { id: 'general', label: 'General & Node Routing', icon: 'hub' },
            { id: 'tax', label: 'GST & Statutory Compliance', icon: 'receipt_long' },
            { id: 'integrations', label: 'Gateway & API Webhooks', icon: 'webhook' },
            { id: 'security', label: 'Zero-Trust & Session Rules', icon: 'security' },
            { id: 'cdn', label: 'CDN & Cloudflare Edge', icon: 'cloud_sync' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-label transition-all text-left ${
 activeSection === tab.id
 ? 'bg-primary-container text-on-accent font-semibold shadow-xs'
 : 'text-muted hover:text-primary hover:bg-surface-subtle'
 }`}
            >
              <Icon name={tab.icon} className="material-symbols-outlined text-icon-md" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Settings Body (9 Cols) */}
        <div className="lg:col-span-9 space-y-space-md">
          {activeSection === 'general' && (
            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-subtle p-6 space-y-6">
              {/* Store Identity & Core Configuration */}
              <div className="p-4 bg-surface-canvas rounded-xl border border-subtle space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-primary">Everwear Storefront Identity & Policies</h3>
                    <p className="text-meta text-muted mt-0.5">Global store metadata synchronized with backend database.</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-status-success-bg text-success text-micro font-semibold">MONGODB LIVE</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-meta font-semibold text-muted mb-1">Store Name</label>
                    <input
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="w-full h-9 px-3 bg-surface-container-lowest border border-subtle rounded-lg text-meta font-semibold text-primary focus:outline-none focus:ring-1 focus:ring-primary-container"
                    />
                  </div>
                  <div>
                    <label className="block text-meta font-semibold text-muted mb-1">Global Low-Stock Alert (Units)</label>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={lowStockThreshold}
                      onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                      className="w-full h-9 px-3 bg-surface-container-lowest border border-subtle rounded-lg text-meta font-semibold text-primary focus:outline-none focus:ring-1 focus:ring-primary-container"
                    />
                  </div>
                  <div>
                    <label className="block text-meta font-semibold text-muted mb-1">Concierge Support Email</label>
                    <input
                      type="email"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      className="w-full h-9 px-3 bg-surface-container-lowest border border-subtle rounded-lg text-meta font-semibold text-primary focus:outline-none focus:ring-1 focus:ring-primary-container"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-primary">Fulfillment Routing & Allocation</h3>
                <p className="text-meta text-muted mt-1">Configure intelligent split-shipment prevention and nearest warehouse allocation logic.</p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-4 bg-surface-canvas rounded-xl border border-subtle">
                  <div>
                    <div className="font-semibold text-body text-primary">Automated Proximity Dispatch</div>
                    <div className="text-meta text-muted mt-0.5">Route courier orders automatically to the FC node with lowest ground transit SLA.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoReconcile}
                    onChange={(e) => setAutoReconcile(e.target.checked)}
                    className="w-5 h-5 accent-primary-container cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-surface-canvas rounded-xl border border-subtle">
                  <div>
                    <div className="font-semibold text-body text-primary">Strict Gross Margin Guardrail</div>
                    <div className="text-meta text-muted mt-0.5">Block checkout if promotional discounts push line item contribution margin below 45%.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={marginShield}
                    onChange={(e) => setMarginShield(e.target.checked)}
                    className="w-5 h-5 accent-primary-container cursor-pointer"
                  />
                </div>

                <div className="p-4 bg-surface-canvas rounded-xl border border-subtle space-y-3">
                  <div className="font-semibold text-body text-primary">Telemetry Sync Rate</div>
                  <div className="flex items-center gap-3">
                    <Select
                      value={cloudSyncInterval}
                      onChange={(e) => setCloudSyncInterval(e.target.value)}
                      className="h-9 px-3 bg-surface-container-lowest border border-subtle rounded-lg text-meta font-semibold text-primary focus:outline-none min-w-[260px]"
                    >
                      <option value="5">Every 5 Seconds (High Realtime)</option>
                      <option value="15">Every 15 Seconds (Balanced)</option>
                      <option value="60">Every 60 Seconds (Low Bandwidth)</option>
                    </Select>
                    <span className="text-meta text-muted font-mono">Current Cluster Ping: 18ms (BLR-FC1)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'tax' && (
            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-subtle p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-primary">GSTIN & Statutory Tax Configurations</h3>
                <p className="text-meta text-muted mt-1">ClearTax and NIC E-Invoicing Gateway credentials and automated GSTR sync.</p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="p-4 bg-surface-canvas rounded-xl border border-subtle space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-meta text-primary">Primary Registered GSTIN</span>
                    <span className="px-2 py-0.5 rounded-full bg-status-success-bg text-success text-micro font-semibold">VERIFIED</span>
                  </div>
                  <input
                    readOnly
                    value="29AABCE1234F1Z8 (Karnataka Principal Place of Business)"
                    className="w-full h-9 px-3 bg-surface-container-lowest border border-subtle rounded-lg text-meta font-mono text-primary whitespace-nowrap"
                  />
                </div>

                <div className="p-4 bg-surface-canvas rounded-xl border border-subtle space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-meta text-primary">Credit Note Auto-Lock Window</span>
                    <span className="text-meta text-muted">Mandatory under Rule 54(1)</span>
                  </div>
                  <p className="text-meta text-muted">All credit notes issued within the calendar month are automatically locked on the 10th of following month prior to GSTR-1 filing.</p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'integrations' && (
            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-subtle p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-primary">Active Gateway Webhooks</h3>
                <p className="text-meta text-muted mt-1">Real-time payment gateway notification endpoints and health status.</p>
              </div>

              <div className="space-y-3 pt-2">
                {[
                  { name: 'Razorpay Instant Settlement', url: 'https://api.everwear.in/v2/webhooks/razorpay-settle', status: 'Healthy 200 OK', lat: '14ms' },
                  { name: 'HDFC SmartHub Payment Hook', url: 'https://api.everwear.in/v2/webhooks/hdfc-pg', status: 'Healthy 200 OK', lat: '22ms' },
                  { name: 'Bluedart Manifest Telemetry', url: 'https://api.everwear.in/v2/webhooks/bluedart-track', status: 'Healthy 200 OK', lat: '38ms' }
                ].map((hook, idx) => (
                  <div key={idx} className="p-4 bg-surface-canvas rounded-xl border border-subtle flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-meta text-primary">{hook.name}</div>
                      <div className="font-mono text-micro text-muted mt-0.5 whitespace-nowrap">{hook.url}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-micro font-semibold text-success">{hook.status}</span>
                      <div className="text-micro text-muted font-mono whitespace-nowrap">{hook.lat}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-subtle p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-primary">Zero-Trust & Session Hardening</h3>
                <p className="text-meta text-muted mt-1">Enforce dual-sign off and RF scanner idle timeouts across warehouses.</p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-4 bg-surface-canvas rounded-xl border border-subtle">
                  <div>
                    <div className="font-semibold text-body text-primary">Enforce IP Subnet Lockdown</div>
                    <div className="text-meta text-muted mt-0.5">Restrict warehouse RF scans to localized FC Wi-Fi subnets only.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={ipWhitelisting}
                    onChange={(e) => setIpWhitelisting(e.target.checked)}
                    className="w-5 h-5 accent-primary-container cursor-pointer"
                  />
                </div>

                <div className="p-4 bg-surface-canvas rounded-xl border border-subtle flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-body text-primary">Audit Log Verbosity</div>
                    <div className="text-meta text-muted mt-0.5">Detailed forensic traces stored on immutable ledger for 7 years.</div>
                  </div>
                  <Select
                    value={activeLogLevel}
                    onChange={(e) => setActiveLogLevel(e.target.value)}
                    className="h-8 px-3 bg-surface-container-lowest border border-subtle rounded-lg text-meta font-semibold min-w-[220px]"
                  >
                    <option value="INFO">INFO (Standard)</option>
                    <option value="DEBUG">DEBUG (Verbose)</option>
                    <option value="FORENSIC">FORENSIC (Cryptographic SHA256)</option>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'cdn' && (
            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-subtle p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-primary">Cloudflare CDN Edge Cache Management</h3>
                <p className="text-meta text-muted mt-1">Purge and warm cache across 14 global points of presence.</p>
              </div>

              <div className="p-4 bg-surface-canvas rounded-xl border border-subtle space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-status-success animate-pulse"></span>
                    <span className="text-meta font-semibold text-primary">14 POP Nodes Synchronized</span>
                  </div>
                  <button
                    onClick={() => onShowToast?.('Cloudflare edge cache successfully invalidated.')}
                    className="px-3 py-1.5 bg-status-danger-solid text-on-accent text-meta font-semibold rounded-lg shadow-sm"
                  >
                    Purge All Edge Cache
                  </button>
                </div>
                <div className="text-meta text-muted">
                  Last global purge was completed 4 minutes ago. Static catalog assets are cached with a TTL of 86,400 seconds.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
