import React, { useState, useEffect } from 'react';
import {
  Icon,
  Button,
  Badge,
  PageContainer,
  PageHeader,
  ContentGrid,
  StatsCard,
  StatusBadge,
} from '../ui';
import { usersList } from '../../data/mockData';
import { adminApi } from '../../lib/api';
import { useUsersQuery, useCreateUserMutation, useDeleteUserMutation } from '../../hooks/useAdminQueries';

export function UsersAndRoleAccess({ onNavigate, onShowToast }) {
  const [selectedUserKey, setSelectedUserKey] = useState('vikram');
  const [activeTab, setActiveTab] = useState('directory'); // 'directory', 'matrix', 'nodes', 'audit'
  const [filterText, setFilterText] = useState('');
  
  // TanStack Query for users
  const { data: usersData, isLoading: isUsersLoading } = useUsersQuery();
  const createUserMutation = useCreateUserMutation();
  const deleteUserMutation = useDeleteUserMutation();

  const [dbUsers, setDbUsers] = useState([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff',
  });

  useEffect(() => {
    if (usersData?.users) {
      setDbUsers(usersData.users);
    }
  }, [usersData]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!inviteForm.email || !inviteForm.password) {
      onShowToast?.({ type: 'error', title: 'Missing Fields', message: 'Email and password (min 12 characters) required.' });
      return;
    }
    if (inviteForm.password.length < 12) {
      onShowToast?.({ type: 'error', title: 'Password Too Short', message: 'Password must be at least 12 characters long.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createUserMutation.mutateAsync({
        email: inviteForm.email,
        password: inviteForm.password,
        name: inviteForm.name || undefined,
        role: inviteForm.role,
      });
      onShowToast?.({
        type: 'success',
        title: 'Team Member Invited',
        message: `${res.user.name || res.user.email} was added with role: ${res.user.role}.`,
      });
      setIsInviteModalOpen(false);
      setInviteForm({ name: '', email: '', password: '', role: 'staff' });
    } catch (err) {
      onShowToast?.({
        type: 'error',
        title: 'Invite Failed',
        message: err?.message || 'Failed to create user.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!confirm(`Are you sure you want to remove ${userName}? This will revoke all admin access.`)) return;
    try {
      await deleteUserMutation.mutateAsync(userId);
      onShowToast?.({
        type: 'info',
        title: 'Access Revoked',
        message: `Admin privileges removed for ${userName}.`,
      });
    } catch (err) {
      onShowToast?.({
        type: 'error',
        title: 'Action Failed',
        message: err?.message || 'Failed to remove user.',
      });
    }
  };

  // Merge live db users into display list
  const mergedUsers = [
    ...dbUsers.map(u => ({
      key: u.id,
      id: u.id,
      isDbUser: true,
      name: u.name || u.email.split('@')[0],
      email: u.email,
      role: u.role === 'owner' ? 'Store Owner' : 'Operations Staff',
      roleBadge: u.role === 'owner' ? 'bg-primary-container text-white' : 'bg-surface-subtle text-text-primary',
      hub: 'Central HQ / All Hubs',
      hubIcon: 'corporate_fare',
      scopeTitle: u.role === 'owner' ? 'Full Superadmin' : 'Operational Access',
      scopeDesc: u.role === 'owner' ? 'Full RBAC & financial sign-off authority' : 'Order, shipment & catalog management',
      securityState: 'Zero-Trust Active',
      securityBadge: 'bg-status-success-bg text-status-success',
      securityIcon: 'verified_user',
      lastActive: 'Just now',
      device: 'Everwear Secure Auth',
      isOnline: true,
      isExec: u.role === 'owner',
      avatar: null,
    })),
    ...usersList.filter(m => !dbUsers.some(d => d.email.toLowerCase() === m.email.toLowerCase()))
  ];

  const selectedUser = mergedUsers.find(u => u.key === selectedUserKey) || mergedUsers[0];

  const filteredUsers = mergedUsers.filter(u => {
    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q) && !u.role.toLowerCase().includes(q) && !u.hub.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <PageContainer>
      <PageHeader
        breadcrumb="Everwear Admin / Settings & Admin / Users & Role Access"
        title="Enterprise User Management & Granular Role-Based Access Control (RBAC)"
        badge={
          <span className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-status-success-bg text-status-success font-label-xs-caps text-label-xs-caps font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse"></span>
            Zero Trust SSO Enforced
          </span>
        }
        description="Manage operator permissions across fulfillment nodes, catalog merchandising controls, financial sign-off limits, and security audit logs."
        actions={
          <div className="flex items-center gap-space-sm shrink-0 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowToast?.("Exporting encrypted security audit log...")}
              icon="receipt_long"
            >
              Security Audit Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowToast?.("Opening Custom Role Policy Creator...")}
              icon="verified_user"
            >
              Create Custom Role Policy
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsInviteModalOpen(true)}
              icon="person_add"
            >
              Invite Team Member
            </Button>
          </div>
        }
      />

      {/* Top Metrics Bar (5 Bento Metric Cards) */}
      <ContentGrid columns={5}>
        <StatsCard
          label="Active Team Members"
          value="148 Users"
          change="+14 this month"
          changeType="positive"
          icon="group"
          subtitle="Across 4 FC Nodes & Central HQ"
        />
        <StatsCard
          label="Defined Roles & Policies"
          value="12 Roles"
          change="4 Custom Scopes"
          changeType="neutral"
          icon="policy"
          subtitle="Operations, Finance, Merch, QC"
        />
        <StatsCard
          label="2FA Enforcement"
          value="100%"
          change="0 Non-compliant"
          changeType="positive"
          icon="lock_clock"
          subtitle="Compliant (FIDO2 / Hardware OTP)"
        />
        <StatsCard
          label="Privileged Admins"
          value="6 Super Users"
          change="Tier 0 Security"
          changeType="warning"
          icon="admin_panel_settings"
          subtitle="Require Dual Sign-off"
        />
        <StatsCard
          label="Active Node Sessions"
          value="84 Concurrent"
          change="BLR-FC1 Peak"
          changeType="positive"
          icon="devices"
          subtitle="Avg. Session Latency 18ms"
        />
      </ContentGrid>

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
            <Icon name="filter_list" className="material-symbols-outlined absolute left-2.5 top-2 text-text-secondary text-[16px]" />
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
            <Icon name="tune" className="material-symbols-outlined text-[16px] text-text-secondary" />
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
                  <Icon name="download" className="material-symbols-outlined text-[16px]" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={() => onShowToast?.('Synchronized employee profiles with Workday HRIS.')}
                  className="h-8 px-space-sm rounded-lg bg-surface-subtle border border-border-subtle text-text-secondary hover:text-text-primary font-label-sm text-label-sm flex items-center gap-1 transition-colors"
                >
                  <Icon name="refresh" className="material-symbols-outlined text-[16px]" />
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
                            <Icon name={user.hubIcon} className="material-symbols-outlined text-[14px] text-text-secondary" />
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
                            <Icon name={user.securityIcon} className="material-symbols-outlined text-[12px]" />
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
                                <Icon name="lock_reset" className="material-symbols-outlined text-[18px]" />
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
                                  <Icon name="edit" className="material-symbols-outlined text-[18px]" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onShowToast?.(`Terminated active session on ${user.device}`);
                                  }}
                                  className="p-1 rounded-lg hover:bg-status-danger-bg text-text-secondary hover:text-status-danger transition-colors"
                                  title="Kill Session"
                                >
                                  <Icon name="logout" className="material-symbols-outlined text-[18px]" />
                                </button>
                                {user.isDbUser && user.role !== 'Store Owner' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteUser(user.id, user.name);
                                    }}
                                    className="p-1 rounded-lg hover:bg-status-danger-bg text-status-danger hover:text-red-700 transition-colors"
                                    title="Delete User"
                                  >
                                    <Icon name="delete" className="material-symbols-outlined text-[18px]" />
                                  </button>
                                )}
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
              <Icon name="verified" className="material-symbols-outlined text-[24px]" />
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
                  <Icon name="shield" className="material-symbols-outlined text-[14px]" />
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
                      <Icon name={mod.icon} className="material-symbols-outlined text-[16px] text-text-secondary" />
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
                          <Icon name={p.allowed ? 'check_circle' : 'cancel'} className={`material-symbols-outlined text-[16px] ${p.allowed ? 'text-status-success' : 'text-status-danger'}`} />
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
                  <Icon name="verified" className="material-symbols-outlined text-status-success text-[18px]" />
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
                <Icon name="tune" className="material-symbols-outlined text-[18px]" />
                <span>Modify Permissions</span>
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onShowToast?.(`Viewing full cryptographic audit trail for ${selectedUser.name}`)}
                  className="h-8 rounded-lg bg-surface-subtle hover:bg-surface-container-high border border-border-subtle text-text-primary font-label-sm text-label-sm font-medium transition-colors flex items-center justify-center gap-1"
                >
                  <Icon name="history" className="material-symbols-outlined text-[16px] text-text-secondary" />
                  <span>View Full Audit</span>
                </button>
                <button
                  onClick={() => onShowToast?.(`Suspended access for ${selectedUser.name}`)}
                  className="h-8 rounded-lg bg-status-danger-bg hover:bg-error-container text-status-danger font-label-sm text-label-sm font-medium transition-colors flex items-center justify-center gap-1 border border-status-danger/20"
                >
                  <Icon name="lock" className="material-symbols-outlined text-[16px]" />
                  <span>Suspend Access</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Team Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl border border-border-subtle max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-space-lg border-b border-border-subtle flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="person_add" className="p-2 rounded-xl bg-primary-container text-white material-symbols-outlined text-[20px]" />
                <div>
                  <h3 className="font-headline-sm font-semibold text-text-primary">Invite Team Member</h3>
                  <p className="text-xs text-text-secondary">Provision administrator credentials in Everwear RBAC</p>
                </div>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-surface-subtle flex items-center justify-center text-text-secondary"
              >
                <Icon name="close" className="material-symbols-outlined text-[18px]" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-space-lg space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alisha Kapoor"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  className="w-full h-9 px-3 bg-surface-canvas border border-border-subtle rounded-lg text-xs font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-container"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Work Email *</label>
                <input
                  type="email"
                  required
                  placeholder="alisha@everwear.test"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full h-9 px-3 bg-surface-canvas border border-border-subtle rounded-lg text-xs font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-container"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Initial Password (min 12 characters) *</label>
                <input
                  type="password"
                  required
                  minLength={12}
                  placeholder="••••••••••••"
                  value={inviteForm.password}
                  onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                  className="w-full h-9 px-3 bg-surface-canvas border border-border-subtle rounded-lg text-xs font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-container"
                />
                <p className="text-[10px] text-text-secondary mt-1">Must contain at least 12 characters.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Role / Permissions Level</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full h-9 px-3 bg-surface-canvas border border-border-subtle rounded-lg text-xs font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-container"
                >
                  <option value="staff">Operations Staff (Catalog, Orders, Inventory, Fulfillment)</option>
                  <option value="owner">Store Owner (Full Administrative & Financial Access)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="h-9 px-4 rounded-xl border border-border-subtle bg-surface-container-lowest text-text-primary text-xs font-semibold hover:bg-surface-subtle transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 px-4 rounded-xl bg-primary-container hover:bg-primary text-on-primary text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Icon name={isSubmitting ? 'hourglass_top' : 'check'} className="material-symbols-outlined text-[16px]" />
                  <span>{isSubmitting ? 'Creating...' : 'Grant Access'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
