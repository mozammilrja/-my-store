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
  SearchInput,
  ErrorState,
  SkeletonPage,
  Thumbnail,
  Select,
  TablePagination,
} from '../ui';
import { useClientTable } from '../../hooks/useClientTable';
import { usersList } from '../../data/mockData';
import { adminApi } from '../../lib/api';
import { useUsersQuery, useCreateUserMutation, useDeleteUserMutation } from '../../hooks/useAdminQueries';

export function UsersAndRoleAccess({ onNavigate, onShowToast }) {
  const [selectedUserKey, setSelectedUserKey] = useState('vikram');
  const [activeTab, setActiveTab] = useState('directory'); // 'directory', 'matrix', 'nodes', 'audit'
  const [filterText, setFilterText] = useState('');
  
  // TanStack Query for users
  const {
    data: usersData,
    isLoading: isUsersLoading,
    isError: isUsersError,
    error: usersError,
    refetch: refetchUsers,
  } = useUsersQuery();
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
      roleBadge: u.role === 'owner' ? 'bg-primary-container text-on-accent' : 'bg-surface-subtle text-primary',
      hub: 'Central HQ / All Hubs',
      hubIcon: 'corporate_fare',
      scopeTitle: u.role === 'owner' ? 'Full Superadmin' : 'Operational Access',
      scopeDesc: u.role === 'owner' ? 'Full RBAC & financial sign-off authority' : 'Order, shipment & catalog management',
      securityState: 'Zero-Trust Active',
      securityBadge: 'bg-status-success-bg text-success',
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
  // One shared pager over the rows this module actually holds.
  const usersPager = useClientTable(filteredUsers);

  if (isUsersLoading) {
    return <SkeletonPage variant="table" stats={6} statsCols={6} columns={6} label="Loading users and roles" />;
  }

  return (
    <PageContainer>
      {usersError && (
        <ErrorState
          title="Users could not be loaded"
          message={usersError?.message}
          onRetry={() => refetchUsers()}
        />
      )}
      <PageHeader
        breadcrumb="Everwear Admin / Settings & Admin / Users & Role Access"
        title="Enterprise User Management & Granular Role-Based Access Control (RBAC)"
        badge={
          <span className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-status-success-bg text-success text-caption font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse"></span>
            Zero Trust SSO Enforced
          </span>
        }
        description="Manage operator permissions across fulfillment nodes, catalog merchandising controls, financial sign-off limits, and security audit logs."
        actions={
          <div className="flex min-w-0 flex-wrap items-center gap-space-sm lg:shrink-0">
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
      <div className="flex items-center justify-between gap-space-md bg-surface-container-lowest px-space-md py-space-xs rounded-xl shadow-sm border border-subtle mb-space-md flex-wrap">
        <div className="flex items-center gap-space-xs flex-wrap">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-space-md py-2 rounded-lg text-label-lg font-semibold transition-all flex items-center gap-2 ${
 activeTab === 'directory' ? 'bg-primary-container text-on-accent shadow-sm' : 'text-muted hover:text-primary hover:bg-surface-subtle'
 }`}
          >
            <span>Team Directory</span>
            <span className={`px-1.5 py-0.5 rounded-full text-caption ${
 activeTab === 'directory' ? 'bg-scrim/25 text-on-accent' : 'bg-surface-subtle text-muted'
 }`}>
              148
            </span>
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-space-md py-2 rounded-lg text-label-lg font-semibold transition-all flex items-center gap-2 ${
 activeTab === 'matrix' ? 'bg-primary-container text-on-accent shadow-sm' : 'text-muted hover:text-primary hover:bg-surface-subtle'
 }`}
          >
            <span>Roles & Permission Matrix</span>
            <span className={`px-1.5 py-0.5 rounded-full text-caption ${
 activeTab === 'matrix' ? 'bg-scrim/25 text-on-accent' : 'bg-surface-subtle text-muted'
 }`}>
              12
            </span>
          </button>
          <button
            onClick={() => setActiveTab('nodes')}
            className={`px-space-md py-2 rounded-lg text-label-lg font-semibold transition-all flex items-center gap-2 ${
 activeTab === 'nodes' ? 'bg-primary-container text-on-accent shadow-sm' : 'text-muted hover:text-primary hover:bg-surface-subtle'
 }`}
          >
            <span>FC Node Assignments</span>
            <span className={`px-1.5 py-0.5 rounded-full text-caption ${
 activeTab === 'nodes' ? 'bg-scrim/25 text-on-accent' : 'bg-surface-subtle text-muted'
 }`}>
              4 Hubs
            </span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-space-md py-2 rounded-lg text-label-lg font-semibold transition-all flex items-center gap-2 ${
 activeTab === 'audit' ? 'bg-primary-container text-on-accent shadow-sm' : 'text-muted hover:text-primary hover:bg-surface-subtle'
 }`}
          >
            <span>Security & Audit Logs</span>
            <span className="w-2 h-2 rounded-full bg-status-success animate-pulse"></span>
          </button>
        </div>

        {/* Quick Filter & Search Bar in Tabs Line */}
        <div className="flex min-w-0 flex-wrap items-center gap-space-sm">
          <SearchInput
            value={filterText}
            onChange={(value) => setFilterText(value)}
            onClear={() => setFilterText('')}
            placeholder="Filter by name, role, node"
            label="Filter users"
            className="w-full min-w-0 sm:w-64 sm:flex-initial"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onShowToast?.('Filtering scopes')}
            className="shrink-0"
          >
            <Icon name="tune" aria-hidden="true" className="material-symbols-outlined text-icon text-muted" />
            <span>All Scopes</span>
          </Button>
        </div>
      </div>

      {/* Asymmetric Split Layout: Directory (65%) vs Inspector (35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* LEFT PANEL: 65% Main User Directory */}
        <div className="lg:col-span-8 space-y-space-md">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-subtle overflow-hidden">
            {/* Directory Header Controls */}
            <div className="p-space-md flex flex-wrap items-center justify-between gap-space-md bg-surface-container-lowest border-b border-subtle">
              <div className="flex items-center gap-space-sm">
                <span className="text-subheading text-primary font-semibold">Node Operators & Executives</span>
                <span className="px-2 py-0.5 rounded-full bg-surface-subtle text-muted text-caption border border-subtle font-semibold">
                  Showing {filteredUsers.length} of 148
                </span>
              </div>
              <div className="flex items-center gap-space-sm">
                <button
                  onClick={() => onShowToast?.('Exporting team directory CSV...')}
                  className="h-8 px-space-sm rounded-lg bg-surface-subtle border border-subtle text-muted hover:text-primary text-label flex items-center gap-1 transition-colors"
                >
                  <Icon name="download" className="material-symbols-outlined text-icon" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={() => onShowToast?.('Synchronized employee profiles with Workday HRIS.')}
                  className="h-8 px-space-sm rounded-lg bg-surface-subtle border border-subtle text-muted hover:text-primary text-label flex items-center gap-1 transition-colors"
                >
                  <Icon name="refresh" className="material-symbols-outlined text-icon" />
                  <span>Sync</span>
                </button>
              </div>
            </div>

            {/* High-density Table */}
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse min-w-[960px]">
                <thead>
                  <tr className="bg-surface-subtle text-muted text-caption uppercase tracking-wider border-b border-subtle select-none sticky top-0 z-10">
                    <th className="py-2.5 px-space-md whitespace-nowrap">Operator Identity</th>
                    <th className="py-2.5 px-space-sm whitespace-nowrap">Primary Role</th>
                    <th className="py-2.5 px-space-sm whitespace-nowrap">Hub / Node</th>
                    <th className="py-2.5 px-space-sm whitespace-nowrap">Access Scope &amp; Limit</th>
                    <th className="py-2.5 px-space-sm whitespace-nowrap">Security State</th>
                    <th className="py-2.5 px-space-sm whitespace-nowrap">Last Active</th>
                    <th className="py-2.5 px-space-md text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle text-body text-primary">
                  {usersPager.pageRows.map((user) => {
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
                              <Thumbnail src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full shadow-sm" imgClassName="object-cover" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-surface-subtle flex items-center justify-center text-subheading text-muted font-semibold">
                                FQ
                              </div>
                            )}
                            <div>
                              <div className={`text-label-lg font-semibold text-primary flex items-center gap-1.5 ${
 user.isSuspended ? 'line-through' : ''
 }`}>
                                <span>{user.name}</span>
                                {user.isOnline && (
                                  <span className="w-2 h-2 rounded-full bg-status-success" title="Session Online"></span>
                                )}
                                {user.isExec && (
                                  <span className="px-1.5 py-px rounded bg-primary-fixed text-on-primary-fixed text-micro font-semibold">
                                    EXEC
                                  </span>
                                )}
                              </div>
                              <div className="text-body text-secondary text-meta">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-space-sm">
                          <span className={`inline-block max-w-[11rem] truncate rounded-md px-2 py-0.5 text-label font-medium ${user.roleBadge}`} title={user.role}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3 px-space-sm">
                          <span className="flex min-w-0 items-center gap-1 text-label text-primary" title={user.hub}>
                            <Icon name={user.hubIcon} aria-hidden="true" className="material-symbols-outlined shrink-0 text-icon-sm text-muted" />
                            <span className="truncate">{user.hub}</span>
                          </span>
                        </td>
                        <td className="py-3 px-space-sm">
                          <div className="space-y-0.5">
                            <span className="text-primary font-medium text-meta block">{user.scopeTitle}</span>
                            <span className={`text-micro block ${user.isSuspended ? 'text-danger font-semibold' : 'text-muted'}`}>
                              {user.scopeDesc}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-space-sm">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-semibold ${user.securityBadge}`}>
                            <Icon name={user.securityIcon} className="material-symbols-outlined text-icon-sm" />
                            {user.securityState}
                          </span>
                        </td>
                        <td className="py-3 px-space-sm text-muted text-meta">
                          <span>{user.lastActive}</span>
                          <span className="block text-micro text-muted/70">{user.device}</span>
                        </td>
                        <td className="py-3 px-space-md text-right">
                          <div className="flex items-center justify-end gap-1">
                            {user.isSuspended ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onShowToast?.(`Password reset link sent to ${user.email}`);
                                }}
                                className="p-1 rounded-lg hover:bg-surface-subtle text-muted hover:text-primary transition-colors" title="Reset password" aria-label="Reset password"
                              >
                                <Icon name="lock_reset" className="material-symbols-outlined text-icon-md" />
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onShowToast?.(`Editing access privileges for ${user.name}`);
                                  }}
                                  className="p-1 rounded-lg hover:bg-surface-subtle text-muted hover:text-primary transition-colors"
                                  title="Edit Permissions"
                                >
                                  <Icon name="edit" className="material-symbols-outlined text-icon-md" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onShowToast?.(`Terminated active session on ${user.device}`);
                                  }}
                                  className="p-1 rounded-lg hover:bg-status-danger-bg text-muted hover:text-danger transition-colors"
                                  title="Kill Session"
                                >
                                  <Icon name="logout" className="material-symbols-outlined text-icon-md" />
                                </button>
                                {user.isDbUser && user.role !== 'Store Owner' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteUser(user.id, user.name);
                                    }}
                                    className="p-1 rounded-lg hover:bg-status-danger-bg text-danger transition-colors"
                                    title="Delete User"
                                  >
                                    <Icon name="delete" className="material-symbols-outlined text-icon-md" />
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

            <TablePagination
              currentPage={usersPager.page}
              pageSize={usersPager.limit}
              totalItems={usersPager.total}
              onPageChange={usersPager.setPage}
              onPageSizeChange={usersPager.setLimit}
            />
          </div>

          {/* System Security Policy Banner */}
          <div className="p-space-md bg-surface-container-lowest rounded-xl shadow-sm border border-subtle flex items-start gap-space-md">
            <div className="p-2.5 rounded-xl bg-status-info-bg text-info shrink-0">
              <Icon name="verified" className="material-symbols-outlined text-icon-xl" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="text-subheading text-primary font-semibold">
                  FC Operational Hardening Rules in Effect
                </h4>
                <span className="text-caption px-2 py-0.5 rounded bg-status-success-bg text-success font-semibold">
                  ACTIVE ENFORCEMENT
                </span>
              </div>
              <p className="text-body text-secondary leading-relaxed">
                All handheld RF guns in BLR-FC1 and BOM-FC2 must re-authenticate credentials every 8 hours. High-value stock write-offs exceeding ₹1,00,000 require concurrent cryptographic authorization by a VP or Station Commander.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: 35% Role Policy Inspector & Deep Controls */}
        <div className="lg:col-span-4 space-y-space-md">
          {/* Main Policy Inspector Card */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-subtle p-space-md space-y-space-md sticky top-20">
            {/* Inspector Header */}
            <div className="flex items-start justify-between pb-space-sm border-b border-subtle">
              <div>
                <div className="flex items-center gap-1.5 text-caption uppercase tracking-wider text-accent font-semibold">
                  <Icon name="shield" className="material-symbols-outlined text-icon-sm" />
                  <span>Role Policy Inspector</span>
                </div>
                <h3 className="text-subheading text-primary mt-0.5 font-semibold">{selectedUser.role}</h3>
                <p className="text-body text-secondary">
                  Assigned to: <strong className="text-primary">{selectedUser.name}</strong> ({selectedUser.assignedHub})
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-caption font-semibold ${selectedUser.tierBadge}`}>
                {selectedUser.tier}
              </span>
            </div>

            {/* Permission Matrix Checklist by Module */}
            <div className="space-y-space-sm">
              <span className="text-caption uppercase text-muted tracking-wider block">
                Granular Module Permissions
              </span>

              {selectedUser.modules.map((mod, mIdx) => (
                <div key={mIdx} className="p-space-sm rounded-lg bg-surface-subtle border border-subtle space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-label font-semibold text-primary flex items-center gap-1.5">
                      <Icon name={mod.icon} className="material-symbols-outlined text-icon text-muted" />
                      {mod.name}
                    </span>
                    <span className={`text-caption px-1.5 py-0.5 rounded font-semibold ${mod.scopeColor}`}>
                      {mod.scopeTag}
                    </span>
                  </div>
                  {mod.perms && (
                    <div className="space-y-1 text-body">
                      {mod.perms.map((p, pIdx) => (
                        <div key={pIdx} className={`flex items-center gap-2 ${p.allowed ? 'text-primary' : 'text-muted'}`}>
                          <Icon name={p.allowed ? 'check_circle' : 'cancel'} className={`material-symbols-outlined text-icon ${p.allowed ? 'text-success' : 'text-danger'}`} />
                          <span>{p.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {mod.desc && (
                    <p className="text-body text-secondary leading-relaxed">
                      {mod.desc}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Security Hardening Controls */}
            <div className="space-y-space-xs pt-space-xs border-t border-subtle">
              <span className="text-caption uppercase text-muted tracking-wider block">
                Station Security Controls
              </span>
              <div className="grid grid-cols-2 gap-space-xs text-body text-body">
                <div className="p-2 rounded bg-surface-subtle border border-subtle">
                  <span className="text-muted text-micro block">IP Whitelisting</span>
                  <span className="font-medium text-primary text-meta">{selectedUser.ipWhitelist}</span>
                </div>
                <div className="p-2 rounded bg-surface-subtle border border-subtle">
                  <span className="text-muted text-micro block">Session Inactivity</span>
                  <span className="font-medium text-primary text-meta">{selectedUser.sessionLimit}</span>
                </div>
                <div className="p-2 rounded bg-surface-subtle border border-subtle col-span-2 flex items-center justify-between">
                  <div>
                    <span className="text-muted text-micro block">Stock Reconciliation</span>
                    <span className="font-medium text-primary text-meta">Mandatory Mobile OTP Verification</span>
                  </div>
                  <Icon name="verified" className="material-symbols-outlined text-success text-icon-md" />
                </div>
              </div>
            </div>

            {/* Recent Audit Trail Entries */}
            <div className="space-y-space-xs pt-space-xs border-t border-subtle">
              <div className="flex items-center justify-between">
                <span className="text-caption uppercase text-muted tracking-wider">
                  Live Operator Audit Trail
                </span>
                <span className="text-caption text-info font-semibold">Real-time</span>
              </div>
              <div className="space-y-2">
                {selectedUser.auditEntries.map((aud, aIdx) => (
                  <div key={aIdx} className="flex items-start gap-2 text-meta">
                    <span className={`w-1.5 h-1.5 rounded-full ${aud.dotColor} mt-1.5 shrink-0`}></span>
                    <div>
                      <span className="font-medium text-primary block">{aud.title}</span>
                      <span className="text-muted text-micro">{aud.sub}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Inspector Action Buttons */}
            <div className="pt-space-sm border-t border-subtle flex flex-col gap-2">
              <button
                onClick={() => onShowToast?.(`Editing permissions matrix for ${selectedUser.name}`)}
                className="w-full h-9 rounded-lg bg-primary-container hover:bg-primary-container/90 text-on-accent text-label-lg font-medium transition-colors shadow-sm flex items-center justify-center gap-1.5"
              >
                <Icon name="tune" className="material-symbols-outlined text-icon-md" />
                <span>Modify Permissions</span>
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onShowToast?.(`Viewing full cryptographic audit trail for ${selectedUser.name}`)}
                  className="h-8 rounded-lg bg-surface-subtle hover:bg-surface-container-high border border-subtle text-primary text-label font-medium transition-colors flex items-center justify-center gap-1"
                >
                  <Icon name="history" className="material-symbols-outlined text-icon text-muted" />
                  <span>View Full Audit</span>
                </button>
                <button
                  onClick={() => onShowToast?.(`Suspended access for ${selectedUser.name}`)}
                  className="h-8 rounded-lg bg-status-danger-bg hover:bg-error-container text-danger text-label font-medium transition-colors flex items-center justify-center gap-1 border border-status-danger/20"
                >
                  <Icon name="lock" className="material-symbols-outlined text-icon" />
                  <span>Suspend Access</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Team Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-scrim/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl border border-subtle max-w-md w-full overflow-hidden animate-fade-in fade-in duration-150">
            <div className="p-space-lg border-b border-subtle flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="person_add" className="p-2 rounded-xl bg-primary-container text-on-accent material-symbols-outlined text-icon-lg" />
                <div>
                  <h3 className="font-semibold text-primary">Invite Team Member</h3>
                  <p className="text-meta text-muted">Provision administrator credentials in Everwear RBAC</p>
                </div>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-surface-subtle flex items-center justify-center text-muted" title="Close" aria-label="Close"
              >
                <Icon name="close" className="material-symbols-outlined text-icon-md" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-space-lg space-y-4">
              <div>
                <label className="block text-meta font-semibold text-muted mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alisha Kapoor"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  className="w-full h-9 px-3 bg-surface-canvas border border-subtle rounded-lg text-meta font-semibold text-primary focus:outline-none focus:ring-1 focus:ring-primary-container"
                />
              </div>

              <div>
                <label className="block text-meta font-semibold text-muted mb-1">Work Email *</label>
                <input
                  type="email"
                  required
                  placeholder="alisha@everwear.test"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full h-9 px-3 bg-surface-canvas border border-subtle rounded-lg text-meta font-semibold text-primary focus:outline-none focus:ring-1 focus:ring-primary-container"
                />
              </div>

              <div>
                <label className="block text-meta font-semibold text-muted mb-1">Initial Password (min 12 characters) *</label>
                <input
                  type="password"
                  required
                  minLength={12}
                  placeholder="••••••••••••"
                  value={inviteForm.password}
                  onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                  className="w-full h-9 px-3 bg-surface-canvas border border-subtle rounded-lg text-meta font-semibold text-primary focus:outline-none focus:ring-1 focus:ring-primary-container"
                />
                <p className="text-micro text-muted mt-1">Must contain at least 12 characters.</p>
              </div>

              <div>
                <label className="block text-meta font-semibold text-muted mb-1">Role / Permissions Level</label>
                <Select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  aria-label="Role / permissions level"
                  options={[
                    { value: 'staff', label: 'Operations staff (catalog, orders, inventory, fulfillment)' },
                    { value: 'owner', label: 'Store owner (full administrative and financial access)' },
                  ]}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-subtle">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="h-9 px-4 rounded-xl border border-subtle bg-surface-container-lowest text-primary text-meta font-semibold hover:bg-surface-subtle transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 px-4 rounded-xl bg-primary-container hover:bg-primary-container-hover text-on-accent text-meta font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Icon name={isSubmitting ? 'hourglass_top' : 'check'} className="material-symbols-outlined text-icon" />
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
