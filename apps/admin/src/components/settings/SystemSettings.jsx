import React, { useState, useEffect } from 'react';
import { Select } from '../ui/select';
import { adminApi } from '../../lib/api';

export function SystemSettings({ onNavigate, onShowToast }) {
  const [activeSection, setActiveSection] = useState('general');
  const [autoReconcile, setAutoReconcile] = useState(true);
  const [marginShield, setMarginShield] = useState(true);
  const [ipWhitelisting, setIpWhitelisting] = useState(true);
  const [cloudSyncInterval, setCloudSyncInterval] = useState('15');
  const [activeLogLevel, setActiveLogLevel] = useState('INFO');

  // Backend store settings
  const [storeName, setStoreName] = useState('Everwear');
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [supportEmail, setSupportEmail] = useState('concierge@everwear.test');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    adminApi.settings()
      .then(res => {
        if (res?.settings) {
          if (res.settings.storeName) setStoreName(res.settings.storeName);
          if (res.settings.lowStockThreshold !== undefined) setLowStockThreshold(res.settings.lowStockThreshold);
          if (res.settings.supportEmail) setSupportEmail(res.settings.supportEmail);
        }
      })
      .catch(err => {
        console.warn('Failed to fetch settings from API:', err?.message);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await adminApi.updateSettings({
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

  return (
    <div className="flex flex-col w-full space-y-space-lg">
      {/* Sub-header & Title Region */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-border-subtle">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-label-xs-caps text-label-xs-caps text-text-secondary uppercase tracking-wider">
            <span>EVERWEAR ADMIN</span>
            <span className="text-border-strong">/</span>
            <span>SETTINGS & ADMIN</span>
            <span className="text-border-strong">/</span>
            <span className="text-primary-container font-semibold">SYSTEM SETTINGS</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-text-primary tracking-tight font-semibold">
            Enterprise System Configuration & Node Governance
          </h1>
          <p className="font-body-sm text-body-sm text-text-secondary max-w-4xl">
            Configure national fulfillment clusters, ClearTax statutory sync intervals, Cloudflare CDN edge invalidations, and payment gateway webhooks.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleResetDefaults}
            className="h-9 px-3.5 rounded-xl bg-surface-container-lowest text-text-primary border border-border-subtle hover:bg-surface-subtle font-label-sm text-label-sm transition-colors cursor-pointer"
            type="button"
          >
            Reset Defaults
          </button>
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="h-9 px-4 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-sm text-label-sm font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isSaving ? 'hourglass_top' : 'save'}
            </span>
            <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      {/* Main Settings Tabs & Work Surface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Navigation Sidebar (3 Cols) */}
        <div className="lg:col-span-3 bg-surface-container-lowest rounded-xl shadow-sm border border-border-subtle p-2 space-y-1">
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
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-label-sm text-label-sm transition-all text-left ${
                activeSection === tab.id
                  ? 'bg-primary-container text-on-primary font-semibold shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-subtle'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Settings Body (9 Cols) */}
        <div className="lg:col-span-9 space-y-space-md">
          {activeSection === 'general' && (
            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-border-subtle p-6 space-y-6">
              {/* Store Identity & Core Configuration */}
              <div className="p-4 bg-surface-canvas rounded-xl border border-border-subtle space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-headline-sm font-semibold text-text-primary">Everwear Storefront Identity & Policies</h3>
                    <p className="text-xs text-text-secondary mt-0.5">Global store metadata synchronized with backend database.</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-status-success-bg text-status-success text-[10px] font-bold">MONGODB LIVE</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Store Name</label>
                    <input
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="w-full h-9 px-3 bg-surface-container-lowest border border-border-subtle rounded-lg text-xs font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-container"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Global Low-Stock Alert (Units)</label>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={lowStockThreshold}
                      onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                      className="w-full h-9 px-3 bg-surface-container-lowest border border-border-subtle rounded-lg text-xs font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-container"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Concierge Support Email</label>
                    <input
                      type="email"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      className="w-full h-9 px-3 bg-surface-container-lowest border border-border-subtle rounded-lg text-xs font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-container"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-headline-sm font-semibold text-text-primary">Fulfillment Routing & Allocation</h3>
                <p className="text-xs text-text-secondary mt-1">Configure intelligent split-shipment prevention and nearest warehouse allocation logic.</p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-4 bg-surface-canvas rounded-xl border border-border-subtle">
                  <div>
                    <div className="font-semibold text-sm text-text-primary">Automated Proximity Dispatch</div>
                    <div className="text-xs text-text-secondary mt-0.5">Route courier orders automatically to the FC node with lowest ground transit SLA.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoReconcile}
                    onChange={(e) => setAutoReconcile(e.target.checked)}
                    className="w-5 h-5 accent-primary-container cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-surface-canvas rounded-xl border border-border-subtle">
                  <div>
                    <div className="font-semibold text-sm text-text-primary">Strict Gross Margin Guardrail</div>
                    <div className="text-xs text-text-secondary mt-0.5">Block checkout if promotional discounts push line item contribution margin below 45%.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={marginShield}
                    onChange={(e) => setMarginShield(e.target.checked)}
                    className="w-5 h-5 accent-primary-container cursor-pointer"
                  />
                </div>

                <div className="p-4 bg-surface-canvas rounded-xl border border-border-subtle space-y-3">
                  <div className="font-semibold text-sm text-text-primary">Telemetry Sync Rate</div>
                  <div className="flex items-center gap-3">
                    <Select
                      value={cloudSyncInterval}
                      onChange={(e) => setCloudSyncInterval(e.target.value)}
                      className="h-9 px-3 bg-surface-container-lowest border border-border-subtle rounded-lg text-xs font-semibold text-text-primary focus:outline-none min-w-[260px]"
                    >
                      <option value="5">Every 5 Seconds (High Realtime)</option>
                      <option value="15">Every 15 Seconds (Balanced)</option>
                      <option value="60">Every 60 Seconds (Low Bandwidth)</option>
                    </Select>
                    <span className="text-xs text-text-secondary font-mono">Current Cluster Ping: 18ms (BLR-FC1)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'tax' && (
            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-border-subtle p-6 space-y-6">
              <div>
                <h3 className="font-headline-sm font-semibold text-text-primary">GSTIN & Statutory Tax Configurations</h3>
                <p className="text-xs text-text-secondary mt-1">ClearTax and NIC E-Invoicing Gateway credentials and automated GSTR sync.</p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="p-4 bg-surface-canvas rounded-xl border border-border-subtle space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-text-primary">Primary Registered GSTIN</span>
                    <span className="px-2 py-0.5 rounded-full bg-status-success-bg text-status-success text-[10px] font-bold">VERIFIED</span>
                  </div>
                  <input
                    readOnly
                    value="29AABCE1234F1Z8 (Karnataka Principal Place of Business)"
                    className="w-full h-9 px-3 bg-surface-container-lowest border border-border-subtle rounded-lg text-xs font-mono text-text-primary"
                  />
                </div>

                <div className="p-4 bg-surface-canvas rounded-xl border border-border-subtle space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-text-primary">Credit Note Auto-Lock Window</span>
                    <span className="text-xs text-text-secondary">Mandatory under Rule 54(1)</span>
                  </div>
                  <p className="text-xs text-text-secondary">All credit notes issued within the calendar month are automatically locked on the 10th of following month prior to GSTR-1 filing.</p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'integrations' && (
            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-border-subtle p-6 space-y-6">
              <div>
                <h3 className="font-headline-sm font-semibold text-text-primary">Active Gateway Webhooks</h3>
                <p className="text-xs text-text-secondary mt-1">Real-time payment gateway notification endpoints and health status.</p>
              </div>

              <div className="space-y-3 pt-2">
                {[
                  { name: 'Razorpay Instant Settlement', url: 'https://api.everwear.in/v2/webhooks/razorpay-settle', status: 'Healthy 200 OK', lat: '14ms' },
                  { name: 'HDFC SmartHub Payment Hook', url: 'https://api.everwear.in/v2/webhooks/hdfc-pg', status: 'Healthy 200 OK', lat: '22ms' },
                  { name: 'Bluedart Manifest Telemetry', url: 'https://api.everwear.in/v2/webhooks/bluedart-track', status: 'Healthy 200 OK', lat: '38ms' }
                ].map((hook, idx) => (
                  <div key={idx} className="p-4 bg-surface-canvas rounded-xl border border-border-subtle flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-xs text-text-primary">{hook.name}</div>
                      <div className="font-mono text-[11px] text-text-secondary mt-0.5">{hook.url}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-semibold text-status-success">{hook.status}</span>
                      <div className="text-[10px] text-text-secondary font-mono">{hook.lat}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-border-subtle p-6 space-y-6">
              <div>
                <h3 className="font-headline-sm font-semibold text-text-primary">Zero-Trust & Session Hardening</h3>
                <p className="text-xs text-text-secondary mt-1">Enforce dual-sign off and RF scanner idle timeouts across warehouses.</p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-4 bg-surface-canvas rounded-xl border border-border-subtle">
                  <div>
                    <div className="font-semibold text-sm text-text-primary">Enforce IP Subnet Lockdown</div>
                    <div className="text-xs text-text-secondary mt-0.5">Restrict warehouse RF scans to localized FC Wi-Fi subnets only.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={ipWhitelisting}
                    onChange={(e) => setIpWhitelisting(e.target.checked)}
                    className="w-5 h-5 accent-primary-container cursor-pointer"
                  />
                </div>

                <div className="p-4 bg-surface-canvas rounded-xl border border-border-subtle flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-text-primary">Audit Log Verbosity</div>
                    <div className="text-xs text-text-secondary mt-0.5">Detailed forensic traces stored on immutable ledger for 7 years.</div>
                  </div>
                  <Select
                    value={activeLogLevel}
                    onChange={(e) => setActiveLogLevel(e.target.value)}
                    className="h-8 px-3 bg-surface-container-lowest border border-border-subtle rounded-lg text-xs font-semibold min-w-[220px]"
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
            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-border-subtle p-6 space-y-6">
              <div>
                <h3 className="font-headline-sm font-semibold text-text-primary">Cloudflare CDN Edge Cache Management</h3>
                <p className="text-xs text-text-secondary mt-1">Purge and warm cache across 14 global points of presence.</p>
              </div>

              <div className="p-4 bg-surface-canvas rounded-xl border border-border-subtle space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-status-success animate-pulse"></span>
                    <span className="text-xs font-semibold text-text-primary">14 POP Nodes Synchronized</span>
                  </div>
                  <button
                    onClick={() => onShowToast?.('Cloudflare edge cache successfully invalidated.')}
                    className="px-3 py-1.5 bg-status-danger text-white text-xs font-semibold rounded-lg shadow-sm"
                  >
                    Purge All Edge Cache
                  </button>
                </div>
                <div className="text-xs text-text-secondary">
                  Last global purge was completed 4 minutes ago. Static catalog assets are cached with a TTL of 86,400 seconds.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
