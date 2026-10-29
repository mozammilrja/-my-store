import React, { useState } from 'react';
import { usersList } from '../../data/mockData';

export function UsersAndRoleAccess({ onNavigate, onShowToast }) {
  const [selectedUserKey, setSelectedUserKey] = useState('vikram');
  const [activeTab, setActiveTab] = useState('directory'); // 'directory', 'matrix', 'nodes', 'audit'
  const [filterText, setFilterText] = useState('');



  const selectedUser = usersList.find(u => u.key === selectedUserKey) || usersList[0];

  const filteredUsers = usersList.filter(u => {
    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q) && !u.role.toLowerCase().includes(q) && !u.hub.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="flex flex-col w-full">
      {/* Breadcrumbs & Operational Status Subheader */}
      <div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-sm">
        <div className="flex items-center gap-space-xs font-label-xs-caps text-label-xs-caps uppercase tracking-wider text-text-secondary">
          <span onClick={() => onNavigate?.('overview')} className="hover:text-text-primary transition-colors cursor-pointer">
            Everwear Admin
          </span>
          <span>/</span>
          <span className="hover:text-text-primary transition-colors cursor-pointer">Settings & Admin</span>
          <span>/</span>
          <span className="text-primary-container font-semibold">Users & Role Access</span>
        </div>
        <div className="flex items-center gap-space-sm">
          <span className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-status-success-bg text-status-success font-label-xs-caps text-label-xs-caps font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse"></span>
            Zero Trust SSO Enforced
          </span>
          <span className="font-label-xs-caps text-label-xs-caps text-text-secondary">Policy Revision: v24.3.1</span>
        </div>
      </div>

      {/* Page Title & Header Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-md mb-space-lg bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-border-subtle">
        <div className="space-y-1">
          <h1 className="font-headline-lg text-headline-lg text-text-primary tracking-tight font-semibold">
            Enterprise User Management & Granular Role-Based Access Control (RBAC)
          </h1>
          <p className="font-body-md text-body-md text-text-secondary max-w-4xl">
            Manage operator permissions across fulfillment nodes, catalog merchandising controls, financial sign-off limits, and security audit logs.
          </p>
        </div>
        <div className="flex items-center gap-space-sm shrink-0 flex-wrap">
          <button
            onClick={() => onShowToast?.('Exporting encrypted security audit log...')}
            className="h-9 px-space-sm rounded-lg bg-surface-container-lowest text-text-primary border border-border-subtle hover:bg-surface-subtle shadow-sm font-label-md text-label-md flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px] text-text-secondary">receipt_long</span>
            <span>Security Audit Export</span>
          </button>
          <button
            onClick={() => onShowToast?.('Opening Custom Role Policy Creator...')}
            className="h-9 px-space-sm rounded-lg bg-surface-subtle text-text-primary border border-border-subtle hover:bg-surface-container-high font-label-md text-label-md flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">verified_user</span>
            <span>Create Custom Role Policy</span>
          </button>
          <button
            onClick={() => onShowToast?.('Opening Team Member Invitation modal...')}
            className="h-9 px-space-md rounded-lg bg-primary-container hover:bg-primary-container/90 text-on-primary font-label-md text-label-md flex items-center gap-1.5 shadow-sm transition-all font-semibold"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Invite Team Member</span>
          </button>
        </div>
      </div>

      {/* Top Metrics Bar (5 Bento Metric Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-space-md mb-space-lg">
        {/* Active Members */}
        <div className="p-space-md bg-surface-container-lowest rounded-xl shadow-sm border border-border-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-xs-caps text-label-xs-caps uppercase tracking-wider text-text-secondary">Active Team Members</span>
            <span className="p-1 rounded-lg bg-status-info-bg text-status-info material-symbols-outlined text-[18px]">group</span>
          </div>
          <div className="mt-space-sm">
            <div className="font-metric-stat text-metric-stat text-text-primary font-semibold">
              148 <span className="font-label-sm text-label-sm font-normal text-text-secondary">Users</span>
            </div>
            <p className="font-body-sm text-body-sm text-text-secondary mt-0.5 truncate">Across 4 FC Nodes & Central HQ</p>
          </div>
          <div className="mt-space-xs pt-space-xs flex items-center justify-between text-text-secondary font-label-xs-caps text-label-xs-caps">
            <span className="text-status-success font-semibold flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[12px]">trending_up</span>+14 this month
            </span>
            <span>98.6% active</span>
          </div>
        </div>

        {/* Defined Roles */}
        <div className="p-space-md bg-surface-container-lowest rounded-xl shadow-sm border border-border-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-xs-caps text-label-xs-caps uppercase tracking-wider text-text-secondary">Defined Roles & Policies</span>
            <span className="p-1 rounded-lg bg-primary-fixed text-primary material-symbols-outlined text-[18px]">policy</span>
          </div>
          <div className="mt-space-sm">
            <div className="font-metric-stat text-metric-stat text-text-primary font-semibold">
              12 <span className="font-label-sm text-label-sm font-normal text-text-secondary">Roles</span>
            </div>
            <p className="font-body-sm text-body-sm text-text-secondary mt-0.5 truncate">Operations, Finance, Merch, QC</p>
          </div>
          <div className="mt-space-xs pt-space-xs flex items-center justify-between text-text-secondary font-label-xs-caps text-label-xs-caps">
            <span className="text-primary font-semibold">4 Custom Scopes</span>
            <span>8 Standard</span>
          </div>
        </div>

        {/* 2FA Enforcement */}
        <div className="p-space-md bg-surface-container-lowest rounded-xl shadow-sm border border-border-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-xs-caps text-label-xs-caps uppercase tracking-wider text-text-secondary">2FA Enforcement</span>
            <span className="p-1 rounded-lg bg-status-success-bg text-status-success material-symbols-outlined text-[18px]">lock_clock</span>
          </div>
          <div className="mt-space-sm">
            <div className="font-metric-stat text-metric-stat text-status-success font-semibold">100%</div>
            <p className="font-body-sm text-body-sm text-text-secondary mt-0.5 truncate">Compliant (FIDO2 / Hardware OTP)</p>
          </div>
          <div className="mt-space-xs pt-space-xs flex items-center justify-between text-text-secondary font-label-xs-caps text-label-xs-caps">
            <span className="text-status-success font-semibold">0 Non-compliant</span>
            <span>Hard-locked</span>
          </div>
        </div>

        {/* Privileged Admins */}
        <div className="p-space-md bg-surface-container-lowest rounded-xl shadow-sm border border-border-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-xs-caps text-label-xs-caps uppercase tracking-wider text-text-secondary">Privileged Admins</span>
            <span className="p-1 rounded-lg bg-status-warning-bg text-status-warning material-symbols-outlined text-[18px]">admin_panel_settings</span>
          </div>
          <div className="mt-space-sm">
            <div className="font-metric-stat text-metric-stat text-text-primary font-semibold">
              6 <span className="font-label-sm text-label-sm font-normal text-text-secondary">Super Users</span>
            </div>
            <p className="font-body-sm text-body-sm text-text-secondary mt-0.5 truncate">Require Dual Sign-off</p>
          </div>
          <div className="mt-space-xs pt-space-xs flex items-center justify-between text-text-secondary font-label-xs-caps text-label-xs-caps">
            <span className="text-status-warning font-semibold">Tier 0 Security</span>
            <span>Quarterly Review</span>
          </div>
        </div>

        {/* Active Node Sessions */}
        <div className="p-space-md bg-surface-container-lowest rounded-xl shadow-sm border border-border-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-xs-caps text-label-xs-caps uppercase tracking-wider text-text-secondary">Active Node Sessions</span>
            <span className="p-1 rounded-lg bg-surface-subtle text-text-primary material-symbols-outlined text-[18px]">devices</span>
          </div>
          <div className="mt-space-sm">
            <div className="font-metric-stat text-metric-stat text-text-primary font-semibold">
              84 <span className="font-label-sm text-label-sm font-normal text-text-secondary">Concurrent</span>
            </div>
            <p className="font-body-sm text-body-sm text-text-secondary mt-0.5 truncate">Avg. Session Latency 18ms</p>
          </div>
          <div className="mt-space-xs pt-space-xs flex items-center justify-between text-text-secondary font-label-xs-caps text-label-xs-caps">
            <span className="text-status-success font-semibold">BLR-FC1 Peak</span>
            <span>42 Handheld RFs</span>
          </div>
        </div>
      </div>

      {/* Segmented Primary Navigation Tabs */}
      <div className="flex items-center justify-between gap-space-md bg-surface-container-lowest px-space-md py-space-xs rounded-xl shadow-sm border border-border-subtle mb-space-md flex-wrap">
        <div className="flex items-center gap-space-xs flex-wrap">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-space-md py-2 rounded-lg font-label-md text-label-md font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'directory' ? 'bg-primary-container text-on-primary shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-surface-subtle'
            }`}
          >
            <span>Team Directory</span>
            <span className={`px-1.5 py-0.5 rounded-full font-label-xs-caps text-label-xs-caps ${
              activeTab === 'directory' ? 'bg-white/20 text-white' : 'bg-surface-subtle text-text-secondary'
            }`}>
              148
            </span>
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-space-md py-2 rounded-lg font-label-md text-label-md font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'matrix' ? 'bg-primary-container text-on-primary shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-surface-subtle'
            }`}
          >
            <span>Roles & Permission Matrix</span>
            <span className={`px-1.5 py-0.5 rounded-full font-label-xs-caps text-label-xs-caps ${
              activeTab === 'matrix' ? 'bg-white/20 text-white' : 'bg-surface-subtle text-text-secondary'
            }`}>
              12
            </span>
          </button>
          <button
            onClick={() => setActiveTab('nodes')}
            className={`px-space-md py-2 rounded-lg font-label-md text-label-md font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'nodes' ? 'bg-primary-container text-on-primary shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-surface-subtle'
            }`}
          >
            <span>FC Node Assignments</span>
            <span className={`px-1.5 py-0.5 rounded-full font-label-xs-caps text-label-xs-caps ${
              activeTab === 'nodes' ? 'bg-white/20 text-white' : 'bg-surface-subtle text-text-secondary'
            }`}>
              4 Hubs
            </span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-space-md py-2 rounded-lg font-label-md text-label-md font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'audit' ? 'bg-primary-container text-on-primary shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-surface-subtle'
            }`}
          >
            <span>Security & Audit Logs</span>
            <span className="w-2 h-2 rounded-full bg-status-success animate-pulse"></span>
          </button>
        </div>

        {/* Quick Filter & Search Bar in Tabs Line */}
        <div className="flex items-center gap-space-sm">
          <div className="relative w-64">
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-text-secondary text-[16px]">filter_list</span>
            <input
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full h-8 pl-8 pr-3 bg-surface-subtle border border-border-subtle rounded-lg font-body-sm text-body-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:bg-surface-container-lowest transition-all"
              placeholder="Filter by name, role, node..."
              type="text"
            />
          </div>
          <div className="h-6 w-px bg-surface-container-high"></div>
          <button
            onClick={() => onShowToast?.('Filtering scopes')}
            className="h-8 px-2.5 rounded-lg bg-surface-subtle hover:bg-surface-container-high border border-border-subtle text-text-primary font-label-xs-caps text-label-xs-caps uppercase flex items-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-text-secondary">tune</span>
            <span>All Scopes</span>
          </button>
        </div>
      </div>

      {/* Asymmetric Split Layout: Directory (65%) vs Inspector (35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* LEFT PANEL: 65% Main User Directory */}
        <div className="lg:col-span-8 space-y-space-md">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-border-subtle overflow-hidden">
            {/* Directory Header Controls */}
            <div className="p-space-md flex flex-wrap items-center justify-between gap-space-md bg-surface-container-lowest border-b border-border-subtle">
              <div className="flex items-center gap-space-sm">
                <span className="font-headline-sm text-headline-sm text-text-primary font-semibold">Node Operators & Executives</span>
                <span className="px-2 py-0.5 rounded-full bg-surface-subtle text-text-secondary font-label-xs-caps text-label-xs-caps border border-border-subtle font-semibold">
                  Showing {filteredUsers.length} of 148
                </span>
              </div>
              <div className="flex items-center gap-space-sm">
                <button
                  onClick={() => onShowToast?.('Exporting team directory CSV...')}
                  className="h-8 px-space-sm rounded-lg bg-surface-subtle border border-border-subtle text-text-secondary hover:text-text-primary font-label-sm text-label-sm flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span>CSV</span>
                </button>
                <button
                  onClick={() => onShowToast?.('Synchronized employee profiles with Workday HRIS.')}
                  className="h-8 px-space-sm rounded-lg bg-surface-subtle border border-border-subtle text-text-secondary hover:text-text-primary font-label-sm text-label-sm flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                  <span>Sync</span>
                </button>
              </div>
            </div>

            {/* High-density Table */}
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse min-w-[960px]">
                <thead>
                  <tr className="bg-surface-subtle text-text-secondary font-label-xs-caps text-label-xs-caps uppercase tracking-wider border-b border-border-subtle select-none sticky top-0 z-10 backdrop-blur-sm">
                    <th className="py-2.5 px-space-md whitespace-nowrap">Operator Identity</th>
                    <th className="py-2.5 px-space-sm whitespace-nowrap">Primary Role</th>
                    <th className="py-2.5 px-space-sm whitespace-nowrap">Hub / Node</th>
                    <th className="py-2.5 px-space-sm whitespace-nowrap">Access Scope &amp; Limit</th>
                    <th className="py-2.5 px-space-sm whitespace-nowrap">Security State</th>
                    <th className="py-2.5 px-space-sm whitespace-nowrap">Last Active</th>
                    <th className="py-2.5 px-space-md text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle font-body-sm text-body-sm text-text-primary">
                  {filteredUsers.map((user) => {
                    const isSelected = selectedUserKey === user.key;
                    return (
                      <tr
                        key={user.key}
                        onClick={() => setSelectedUserKey(user.key)}
                        className={`transition-colors group cursor-pointer ${
                          user.isSuspended ? 'opacity-75' : ''
                        } ${isSelected ? 'bg-primary-fixed/30 hover:bg-primary-fixed/40' : 'hover:bg-surface-subtle/60'}`}
                      >
                        <td className="py-3 px-space-md">
                          <div className="flex items-center gap-3">
                            {user.avatar ? (
                              <img
                                className={`w-9 h-9 rounded-full object-cover shadow-sm ${
                                  isSelected ? 'ring-2 ring-primary-container' : ''
                                }`}
                                src={user.avatar}
                                alt={user.name}
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-surface-subtle flex items-center justify-center font-headline-sm text-headline-sm text-text-secondary font-semibold">
                                FQ
                              </div>
                            )}
                            <div>
                              <div className={`font-label-md text-label-md font-semibold text-text-primary flex items-center gap-1.5 ${
                                user.isSuspended ? 'line-through' : ''
                              }`}>
                                <span>{user.name}</span>
                                {user.isOnline && (
                                  <span className="w-2 h-2 rounded-full bg-status-success" title="Session Online"></span>
                                )}
                                {user.isExec && (
                                  <span className="px-1.5 py-0.2 rounded bg-fashion-magenta/10 text-fashion-magenta font-label-xs-caps text-[10px] font-semibold">
                                    EXEC
                                  </span>
                                )}
                              </div>
                              <div className="font-body-sm text-body-sm text-text-secondary text-[12px]">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-space-sm">
                          <span className={`font-label-sm text-label-sm font-medium px-2 py-0.5 rounded-md ${user.roleBadge}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3 px-space-sm">
                          <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-text-primary">
                            <span className="material-symbols-outlined text-[14px] text-text-secondary">{user.hubIcon}</span>
                            {user.hub}
                          </span>
                        </td>
                        <td className="py-3 px-space-sm">
                          <div className="space-y-0.5">
                            <span className="text-text-primary font-medium text-[12px] block">{user.scopeTitle}</span>
                            <span className={`text-[11px] block ${user.isSuspended ? 'text-status-danger font-semibold' : 'text-text-secondary'}`}>
                              {user.scopeDesc}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-space-sm">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-xs-caps text-label-xs-caps font-semibold ${user.securityBadge}`}>
                            <span className="material-symbols-outlined text-[12px]">{user.securityIcon}</span>
                            {user.securityState}
                          </span>
                        </td>
                        <td className="py-3 px-space-sm text-text-secondary text-[12px]">
                          <span>{user.lastActive}</span>
                          <span className="block text-[10px] text-text-secondary/70">{user.device}</span>
                        </td>
                        <td className="py-3 px-space-md text-right">
                          <div className="flex items-center justify-end gap-1">
                            {user.isSuspended ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onShowToast?.(`Password reset link sent to ${user.email}`);
                                }}
                                className="p-1 rounded-lg hover:bg-surface-subtle text-text-secondary hover:text-text-primary transition-colors"
                              >
                                <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onShowToast?.(`Editing access privileges for ${user.name}`);
                                  }}
                                  className="p-1 rounded-lg hover:bg-surface-subtle text-text-secondary hover:text-text-primary transition-colors"
                                  title="Edit Permissions"
                                >
                                  <span className="material-symbols-outlined text-[18px]">edit</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onShowToast?.(`Terminated active session on ${user.device}`);
                                  }}
                                  className="p-1 rounded-lg hover:bg-status-danger-bg text-text-secondary hover:text-status-danger transition-colors"
                                  title="Kill Session"
                                >
                                  <span className="material-symbols-outlined text-[18px]">logout</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Pagination Footer */}
            <div className="p-space-md bg-surface-subtle border-t border-border-subtle flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-text-secondary">
                Showing 1 to {filteredUsers.length} of 148 team members
              </span>
              <div className="flex items-center gap-1">
                <button className="px-2.5 py-1 rounded bg-surface-container-lowest border border-border-subtle text-text-secondary hover:text-text-primary font-label-sm text-label-sm disabled:opacity-50" disabled>
                  Previous
                </button>
                <button className="px-2.5 py-1 rounded bg-primary-container text-on-primary font-label-sm text-label-sm font-semibold">1</button>
                <button className="px-2.5 py-1 rounded bg-surface-container-lowest border border-border-subtle text-text-secondary hover:text-text-primary font-label-sm text-label-sm">2</button>
                <button className="px-2.5 py-1 rounded bg-surface-container-lowest border border-border-subtle text-text-secondary hover:text-text-primary font-label-sm text-label-sm">3</button>
                <span className="px-1 text-text-secondary">...</span>
                <button className="px-2.5 py-1 rounded bg-surface-container-lowest border border-border-subtle text-text-secondary hover:text-text-primary font-label-sm text-label-sm">25</button>
                <button className="px-2.5 py-1 rounded bg-surface-container-lowest border border-border-subtle text-text-secondary hover:text-text-primary font-label-sm text-label-sm">Next</button>
              </div>
            </div>
          </div>

          {/* System Security Policy Banner */}
          <div className="p-space-md bg-surface-container-lowest rounded-xl shadow-sm border border-border-subtle flex items-start gap-space-md">
            <div className="p-2.5 rounded-xl bg-status-info-bg text-status-info shrink-0">
              <span className="material-symbols-outlined text-[24px]">verified</span>
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="font-headline-sm text-headline-sm text-text-primary font-semibold">
                  FC Operational Hardening Rules in Effect
                </h4>
                <span className="font-label-xs-caps text-label-xs-caps px-2 py-0.5 rounded bg-status-success-bg text-status-success font-semibold">
                  ACTIVE ENFORCEMENT
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-text-secondary leading-relaxed">
                All handheld RF guns in BLR-FC1 and BOM-FC2 must re-authenticate credentials every 8 hours. High-value stock write-offs exceeding ₹1,00,000 require concurrent cryptographic authorization by a VP or Station Commander.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: 35% Role Policy Inspector & Deep Controls */}
        <div className="lg:col-span-4 space-y-space-md">
          {/* Main Policy Inspector Card */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-border-subtle p-space-md space-y-space-md sticky top-20">
            {/* Inspector Header */}
            <div className="flex items-start justify-between pb-space-sm border-b border-border-subtle">
              <div>
                <div className="flex items-center gap-1.5 font-label-xs-caps text-label-xs-caps uppercase tracking-wider text-primary font-bold">
                  <span className="material-symbols-outlined text-[14px]">shield</span>
                  <span>Role Policy Inspector</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-text-primary mt-0.5 font-semibold">{selectedUser.role}</h3>
                <p className="font-body-sm text-body-sm text-text-secondary">
                  Assigned to: <strong className="text-text-primary">{selectedUser.name}</strong> ({selectedUser.assignedHub})
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded-full font-label-xs-caps text-label-xs-caps font-semibold ${selectedUser.tierBadge}`}>
                {selectedUser.tier}
              </span>
            </div>

            {/* Permission Matrix Checklist by Module */}
            <div className="space-y-space-sm">
              <span className="font-label-xs-caps text-label-xs-caps uppercase text-text-secondary tracking-wider block">
                Granular Module Permissions
              </span>

              {selectedUser.modules.map((mod, mIdx) => (
                <div key={mIdx} className="p-space-sm rounded-lg bg-surface-subtle border border-border-subtle space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm font-semibold text-text-primary flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-text-secondary">{mod.icon}</span>
                      {mod.name}
                    </span>
                    <span className={`font-label-xs-caps text-label-xs-caps px-1.5 py-0.5 rounded font-semibold ${mod.scopeColor}`}>
                      {mod.scopeTag}
                    </span>
                  </div>
                  {mod.perms && (
                    <div className="space-y-1 font-body-sm text-body-sm">
                      {mod.perms.map((p, pIdx) => (
                        <div key={pIdx} className={`flex items-center gap-2 ${p.allowed ? 'text-text-primary' : 'text-text-secondary'}`}>
                          <span className={`material-symbols-outlined text-[16px] ${p.allowed ? 'text-status-success' : 'text-status-danger'}`}>
                            {p.allowed ? 'check_circle' : 'cancel'}
                          </span>
                          <span>{p.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {mod.desc && (
                    <p className="font-body-sm text-body-sm text-text-secondary leading-relaxed">
                      {mod.desc}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Security Hardening Controls */}
            <div className="space-y-space-xs pt-space-xs border-t border-border-subtle">
              <span className="font-label-xs-caps text-label-xs-caps uppercase text-text-secondary tracking-wider block">
                Station Security Controls
              </span>
              <div className="grid grid-cols-2 gap-space-xs text-body-sm text-body-sm">
                <div className="p-2 rounded bg-surface-subtle border border-border-subtle">
                  <span className="text-text-secondary text-[11px] block">IP Whitelisting</span>
                  <span className="font-medium text-text-primary text-[12px]">{selectedUser.ipWhitelist}</span>
                </div>
                <div className="p-2 rounded bg-surface-subtle border border-border-subtle">
                  <span className="text-text-secondary text-[11px] block">Session Inactivity</span>
                  <span className="font-medium text-text-primary text-[12px]">{selectedUser.sessionLimit}</span>
                </div>
                <div className="p-2 rounded bg-surface-subtle border border-border-subtle col-span-2 flex items-center justify-between">
                  <div>
                    <span className="text-text-secondary text-[11px] block">Stock Reconciliation</span>
                    <span className="font-medium text-text-primary text-[12px]">Mandatory Mobile OTP Verification</span>
                  </div>
                  <span className="material-symbols-outlined text-status-success text-[18px]">verified</span>
                </div>
              </div>
            </div>

            {/* Recent Audit Trail Entries */}
            <div className="space-y-space-xs pt-space-xs border-t border-border-subtle">
              <div className="flex items-center justify-between">
                <span className="font-label-xs-caps text-label-xs-caps uppercase text-text-secondary tracking-wider">
                  Live Operator Audit Trail
                </span>
                <span className="font-label-xs-caps text-label-xs-caps text-status-info font-semibold">Real-time</span>
              </div>
              <div className="space-y-2">
                {selectedUser.auditEntries.map((aud, aIdx) => (
                  <div key={aIdx} className="flex items-start gap-2 text-[12px]">
                    <span className={`w-1.5 h-1.5 rounded-full ${aud.dotColor} mt-1.5 shrink-0`}></span>
                    <div>
                      <span className="font-medium text-text-primary block">{aud.title}</span>
                      <span className="text-text-secondary text-[11px]">{aud.sub}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Inspector Action Buttons */}
            <div className="pt-space-sm border-t border-border-subtle flex flex-col gap-2">
              <button
                onClick={() => onShowToast?.(`Editing permissions matrix for ${selectedUser.name}`)}
                className="w-full h-9 rounded-lg bg-primary-container hover:bg-primary-container/90 text-on-primary font-label-md text-label-md font-medium transition-colors shadow-sm flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">tune</span>
                <span>Modify Permissions</span>
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onShowToast?.(`Viewing full cryptographic audit trail for ${selectedUser.name}`)}
                  className="h-8 rounded-lg bg-surface-subtle hover:bg-surface-container-high border border-border-subtle text-text-primary font-label-sm text-label-sm font-medium transition-colors flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px] text-text-secondary">history</span>
                  <span>View Full Audit</span>
                </button>
                <button
                  onClick={() => onShowToast?.(`Suspended access for ${selectedUser.name}`)}
                  className="h-8 rounded-lg bg-status-danger-bg hover:bg-error-container text-status-danger font-label-sm text-label-sm font-medium transition-colors flex items-center justify-center gap-1 border border-status-danger/20"
                >
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                  <span>Suspend Access</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
