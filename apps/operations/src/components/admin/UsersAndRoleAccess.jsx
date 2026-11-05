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
  PageBody,
  SkeletonPage,
  Thumbnail,
  Select,
  TablePagination,
  Card,
  SectionCard,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  AppDialog,
  ConfirmDialog,
  FormField,
  FormInput,
} from '../ui';
import { useClientTable } from '../../hooks/useClientTable';
import { DataTable, TableToolbar } from '../shared/DataTable';
import { PersonAvatar } from '../shared/PersonAvatar';
import { useSession } from '../../lib/session';
import { adminApi } from '../../lib/api';
import { useUsersQuery, useCreateUserMutation, useDeleteUserMutation } from '../../hooks/useAdminQueries';
import { EmptyState } from '../shared/FeedbackAndOverlays';
import { downloadCsv, datedFilename } from '../../lib/export';

/** What each role can do, mirroring the two capabilities the API enforces. */
const MODULE_ACCESS = [
  { name: 'Orders and fulfilment', icon: 'shopping_bag', ownerOnly: false },
  { name: 'Catalog and inventory', icon: 'checkroom', ownerOnly: false },
  { name: 'Customers', icon: 'group', ownerOnly: false },
  { name: 'Finance and tax', icon: 'receipt_long', ownerOnly: false },
  { name: 'Team and access', icon: 'admin_panel_settings', ownerOnly: true },
  { name: 'System settings', icon: 'settings', ownerOnly: true },
];

export function UsersAndRoleAccess({ onNavigate, onShowToast }) {
  const [selectedUserKey, setSelectedUserKey] = useState('vikram');
  const [activeTab, setActiveTab] = useState('directory'); // 'directory', 'matrix', 'audit'
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

  // Removal goes through a confirm dialog rather than window.confirm, so it
  // reads like every other destructive action in the admin.
  const [pendingDelete, setPendingDelete] = useState(null); // { id, name }

  const handleDeleteUser = (userId, userName) => setPendingDelete({ id: userId, name: userName });

  const confirmDeleteUser = async () => {
    if (!pendingDelete) return;
    const { id: userId, name: userName } = pendingDelete;
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
    } finally {
      setPendingDelete(null);
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
      roleVariant: u.role === 'owner' ? 'info' : 'secondary',
      // Every account used to read "Central HQ / All Hubs" and "Zero-Trust
      // Active". Neither is stored on an admin, so neither is shown.
      scopeTitle: u.role === 'owner' ? 'Full Superadmin' : 'Operational Access',
      scopeDesc: u.role === 'owner' ? 'Full RBAC & financial sign-off authority' : 'Order, shipment & catalog management',
      // The API records when an account was created and last changed; it does
      // not track sessions, so presence is not claimed.
      lastActive: u.updatedAt
        ? new Date(u.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Unknown',
      // The data model has two roles, owner and staff, and the API enforces
      // exactly two owner-only capabilities. The per-module list is derived
      // from that rather than stored per user, so it cannot drift from what
      // the server will actually allow.
      modules: MODULE_ACCESS.map((m) => ({
        name: m.name,
        icon: m.icon,
        scopeTag: m.ownerOnly && u.role !== 'owner' ? 'Read only' : 'Full access',
        scopeVariant: m.ownerOnly && u.role !== 'owner' ? 'secondary' : 'success',
        perms: [
          { text: 'View', allowed: true },
          { text: 'Create and edit', allowed: !m.ownerOnly || u.role === 'owner' },
          { text: 'Delete', allowed: !m.ownerOnly || u.role === 'owner' },
        ],
      })),
      avatar: null,
    })),
  ];

  const selectedUser = mergedUsers.find(u => u.key === selectedUserKey) || mergedUsers[0];

  const filteredUsers = mergedUsers.filter(u => {
    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q) && !u.role.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  /** Writes the team directory as listed. */
  const handleExportTeam = () => {
    const written = downloadCsv({
      filename: datedFilename('team'),
      columns: [
        { header: 'Name', value: (u) => u.name },
        { header: 'Email', value: (u) => u.email },
        { header: 'Role', value: (u) => u.role },
        { header: 'Last updated', value: (u) => u.lastActive },
      ],
      rows: filteredUsers,
    });
    onShowToast?.({
      type: 'success',
      title: 'Team directory exported',
      message: `${written} ${written === 1 ? 'row' : 'rows'} written to a CSV file.`,
    });
  };

  // No operator exists at all: every tab, the search and the inspector have
  // nothing to work on, so the page becomes one call to invite the first one.
  const noUsers = mergedUsers.length === 0;
  const noFilteredUsers = !noUsers && filteredUsers.length === 0;
  const clearUserFilters = () => setFilterText('');
  const clearFiltersAction = (
    <Button variant="outline" size="sm" onClick={clearUserFilters}>
      Clear filters
    </Button>
  );

  // One shared pager over the rows this module actually holds.
  const usersPager = useClientTable(filteredUsers);

  // The other two tabs are views over the same operator records, grouped the
  // way each tab asks about them. Nothing here invents data: every field shown
  // is one the directory rows already carry.
  const groupBy = (rows, pick) =>
    rows.reduce((acc, row) => {
      const key = pick(row) || 'Unassigned';
      (acc[key] ||= []).push(row);
      return acc;
    }, {});




  const directoryColumns = [
    {
      key: 'identity',
      header: 'Team member',
      cell: (user) => (
        <div className="flex min-w-0 items-center gap-space-sm">
          <PersonAvatar
            name={user.name}
            email={user.email}
            src={user.avatar}
            className="h-9 w-9"
            fallbackClassName="text-label"
          />
          <div className="min-w-0">
            <div className="truncate text-label font-semibold text-primary">{user.name}</div>
            <div className="truncate text-meta text-muted">{user.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      cell: (user) => <Badge variant={user.roleVariant} className="whitespace-nowrap">{user.role}</Badge>,
    },
    {
      key: 'scope',
      header: 'Access',
      cell: (user) => (
        <div className="flex min-w-48 flex-col gap-0.5">
          <span className="text-label font-medium text-primary">{user.scopeTitle}</span>
          <span className="text-meta text-muted">{user.scopeDesc}</span>
        </div>
      ),
    },
    {
      key: 'lastActive',
      header: 'Last updated',
      className: 'whitespace-nowrap text-meta text-muted tabular-nums',
      accessor: 'lastActive',
    },
    {
      key: 'actions',
      fit: true,
      header: 'Actions',
      align: 'right',
      cell: (user) => (
        <div className="flex items-center justify-end gap-space-xs" onClick={(e) => e.stopPropagation()}>
          {/* There is no suspended state on an admin account, so the only row
              action is the delete the API supports, and only for an owner. */}
          {canManageUsers && user.isDbUser && user.role !== 'Store Owner' && (
            <Button
              variant="ghost"
              size="iconSm"
              onClick={() => handleDeleteUser(user.id, user.name)}
              className="text-danger hover:bg-status-danger-bg hover:text-danger"
              title={`Remove ${user.name}`}
              aria-label={`Remove ${user.name}`}
            >
              <Icon name="delete" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const roleGroups = Object.entries(groupBy(filteredUsers, (u) => u.role)).sort(
    (a, b) => b[1].length - a[1].length
  );
  // `owner` is the only elevated role the server defines, so it is the only
  // thing "privileged" can honestly be counted from.
  const ownerCount = mergedUsers.filter((u) => /owner/i.test(u.role)).length;
  // Module-level grants only exist on records that carry a `modules` array.
  const permissionColumns = [
    ...new Set(filteredUsers.flatMap((u) => (u.modules ?? []).map((m) => m.name))),
  ];

  // Role matrix: three fixed columns plus one per module grant found in the data.
  const matrixColumns = [
    {
      key: 'role',
      header: 'Role',
      cell: ({ roleName, sample }) => (
        <Badge variant={sample.roleVariant || 'secondary'} className="whitespace-nowrap">{roleName}</Badge>
      ),
    },
    {
      key: 'operators',
      header: 'Members',
      cell: ({ members }) => (
        <div className="flex min-w-0 items-center gap-space-sm">
          <span className="text-label font-semibold tabular-nums text-primary">{members.length}</span>
          <span className="truncate text-meta text-muted">
            {members.map((m) => m.name).join(', ')}
          </span>
        </div>
      ),
    },
    {
      key: 'scope',
      header: 'Access',
      cell: ({ sample }) => (
        <div className="flex min-w-48 flex-col gap-0.5">
          <span className="text-label text-primary">{sample.scopeTitle}</span>
          <span className="text-meta text-muted">{sample.scopeDesc}</span>
        </div>
      ),
    },
    ...permissionColumns.map((name) => ({
      key: `perm-${name}`,
      header: name,
      cell: ({ sample }) => {
        const mod = (sample.modules ?? []).find((m) => m.name === name);
        return mod ? (
          <span className="whitespace-nowrap text-meta text-muted">{mod.scopeTag ?? 'Granted'}</span>
        ) : (
          <span className="text-meta text-faint">&mdash;</span>
        );
      },
    })),
  ];

  // Security state ("Zero-Trust Active" on every row) and device were never
  // stored, so the report holds what an account does carry.
  const auditColumns = [
    {
      key: 'operator',
      header: 'Team member',
      cell: (u) => (
        <div className="min-w-0">
          <div className="truncate text-label text-primary">{u.name}</div>
          <div className="truncate text-meta text-muted">{u.email}</div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      cell: (u) => <Badge variant={u.roleVariant} className="whitespace-nowrap">{u.role}</Badge>,
    },
    { key: 'lastActive', header: 'Last updated', className: 'whitespace-nowrap text-meta text-muted tabular-nums', accessor: 'lastActive' },
  ];

  // The API refuses user writes for a staff account; say so before the call.
  const { isOwner: canManageUsers, role } = useSession();

  if (isUsersLoading) {
    return <SkeletonPage variant="table" stats={3} statsCols={3} columns={5} label="Loading users and roles" />;
  }

  return (
    <PageContainer>
      <PageHeader
        kicker="Settings & admin"
        title="Users & roles"
        description="Who can sign in to the admin and what they can change."
        actions={
          <div className="flex min-w-0 flex-wrap items-center gap-space-sm lg:shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsInviteModalOpen(true)}
              disabled={!canManageUsers}
              title={canManageUsers ? undefined : 'Only an owner can invite team members'}
            >
              <Icon name="person_add" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
              Invite team member
            </Button>
          </div>
        }
      />
      <PageBody
        error={usersError}
        hasData={usersData != null}
        title="Users could not be loaded"
        onRetry={refetchUsers}
      >

        {/* "2FA enforcement" and "Active node sessions" both read "Not
            recorded": the API stores neither, so they are not shown as KPIs. */}
        <ContentGrid columns={3}>
          <StatsCard
            label="Team members"
            value={String(mergedUsers.length)}
            icon="group"
            subtitle={`${mergedUsers.length === 1 ? 'account' : 'accounts'} can sign in to the admin`}
          />
          <StatsCard
            label="Roles"
            value={String(roleGroups.length)}
            icon="policy"
            subtitle={roleGroups.map(([name]) => name).join(', ') || 'No roles recorded'}
          />
          <StatsCard
            label="Owners"
            value={String(ownerCount)}
            icon="admin_panel_settings"
            subtitle="Can manage the team and settings"
          />
        </ContentGrid>

        {noUsers ? (
          <EmptyState
            icon="group"
            title="No team members yet"
            description="Everyone who can sign in to the admin appears here, with their role and what they can change. Invite the first team member to give them access."
            className="py-16"
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsInviteModalOpen(true)}
                disabled={!canManageUsers}
                title={canManageUsers ? undefined : 'Only an owner can invite team members'}
              >
                <Icon name="add" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                <span>Invite team member</span>
              </Button>
            }
          />
        ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col gap-space-sm border-b border-subtle md:flex-row md:items-center md:justify-between">
            <TabsList aria-label="Team views" className="border-b-0">
              <TabsTrigger value="directory" className="gap-space-xs">
                <span>Team directory</span>
                <Badge variant="secondary" size="sm" className="tabular-nums">{mergedUsers.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="matrix" className="gap-space-xs">
                <span>Roles and permissions</span>
                <Badge variant="secondary" size="sm" className="tabular-nums">{roleGroups.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="audit">Access report</TabsTrigger>
            </TabsList>
            <SearchInput
              value={filterText}
              onChange={(value) => setFilterText(value)}
              onClear={() => setFilterText('')}
              placeholder="Filter by name, email or role"
              label="Filter users"
              className="mb-space-sm w-full min-w-0 md:w-64"
            />
          </div>

        <div className="mt-space-lg grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
          <div className={`${noFilteredUsers ? 'lg:col-span-12' : 'lg:col-span-8'} flex min-w-0 flex-col gap-space-md`}>
            <TabsContent value="directory" className="mt-0">
              <DataTable
                data={usersPager.pageRows}
                columns={directoryColumns}
                keyField="key"
                activeRowId={selectedUserKey}
                onRowClick={(user) => setSelectedUserKey(user.key)}
                emptyIcon="search"
                emptyTitle="No operators match these filters"
                emptyMessage="Clear the search to see every operator."
                emptyAction={clearFiltersAction}
                pagination={{
                  page: usersPager.page,
                  pageSize: usersPager.limit,
                  totalItems: usersPager.total,
                  onPageChange: usersPager.setPage,
                  onPageSizeChange: usersPager.setLimit,
                }}
                toolbar={
                  <TableToolbar
                    className="p-space-md"
                    left={
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-subheading text-primary">Team members</span>
                        <span className="text-meta text-muted">
                          Showing {filteredUsers.length} of {mergedUsers.length}
                        </span>
                      </div>
                    }
                    right={
                      <Button variant="outline" size="sm" onClick={handleExportTeam}>
                        <Icon name="download" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                        <span>Export CSV</span>
                      </Button>
                    }
                  />
                }
              />
            </TabsContent>

            <TabsContent value="matrix" className="mt-0">
              <DataTable
                data={roleGroups.map(([roleName, members]) => ({ roleName, members, sample: members[0] }))}
                columns={matrixColumns}
                keyField="roleName"
                emptyIcon="admin_panel_settings"
                emptyTitle="No operators match these filters"
                emptyMessage="Clear the search to lay out every role."
                emptyAction={clearFiltersAction}
                toolbar={
                  <TableToolbar
                    className="p-space-md"
                    left={
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-subheading text-primary">Roles and permissions</span>
                        <span className="text-meta text-muted">
                          {roleGroups.length} {roleGroups.length === 1 ? 'role' : 'roles'} across {filteredUsers.length} {filteredUsers.length === 1 ? 'member' : 'members'}
                        </span>
                      </div>
                    }
                  />
                }
              />
            </TabsContent>

            <TabsContent value="audit" className="mt-0 flex flex-col gap-space-md">
              <DataTable
                data={filteredUsers}
                columns={auditColumns}
                keyField="email"
                emptyIcon="security"
                emptyTitle="No operators match these filters"
                emptyMessage="Clear the search to report on every operator."
                emptyAction={clearFiltersAction}
                toolbar={
                  <TableToolbar
                    className="p-space-md"
                    left={
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-subheading text-primary">Access report</span>
                        <span className="text-meta text-muted">
                          When each of {filteredUsers.length} {filteredUsers.length === 1 ? 'account' : 'accounts'} last changed
                        </span>
                      </div>
                    }
                  />
                }
              />
              <Card className="flex items-start gap-space-md p-space-md">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-status-info-bg text-info">
                  <Icon name="history" aria-hidden="true" className="material-symbols-outlined text-icon-md" />
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-label font-semibold text-primary">Event history is not recorded yet</span>
                  <p className="text-meta text-muted">
                    A per-event audit trail (who changed what, when, from which address) needs an
                    audit endpoint on the API; the backend exposes no such route today, so nothing
                    here is back-filled or simulated.
                  </p>
                </div>
              </Card>
            </TabsContent>
            {/* The "FC Operational Hardening Rules in Effect / ACTIVE
                ENFORCEMENT" banner described RF-gun re-authentication and
                write-off sign-off that nothing in the system enforces. */}
          </div>

          {/* Inspector: what the selected account's role can do. */}
          {noFilteredUsers ? null : !selectedUser ? (
            <div className="lg:col-span-4">
              <EmptyState icon="person" title="No team member selected" description="Pick a team member from the list to see their access." />
            </div>
          ) : (
          <div className="lg:sticky lg:top-20 lg:col-span-4">
            <SectionCard
              title={selectedUser.name}
              description={selectedUser.email}
              action={<Badge variant={selectedUser.roleVariant} className="whitespace-nowrap">{selectedUser.role}</Badge>}
              contentClassName="flex flex-col gap-space-md"
              footer={
                <p className="px-space-xs text-meta text-muted">
                  Last updated <span className="text-primary">{selectedUser.lastActive}</span>. The API keeps no
                  per-action audit log, so recent activity cannot be shown.
                </p>
              }
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-label font-semibold text-primary">{selectedUser.scopeTitle}</span>
                <span className="text-meta text-muted">{selectedUser.scopeDesc}</span>
              </div>

              <div className="flex flex-col gap-space-sm">
                <span className="text-caption uppercase tracking-wider text-muted">Module permissions</span>
                <ul className="flex flex-col divide-y divide-subtle rounded-lg border border-subtle">
                  {selectedUser.modules.map((mod) => (
                    <li key={mod.name} className="flex flex-col gap-space-xs p-space-sm">
                      <div className="flex items-center justify-between gap-space-sm">
                        <span className="flex min-w-0 items-center gap-space-xs text-label font-medium text-primary">
                          <Icon name={mod.icon} aria-hidden="true" className="material-symbols-outlined text-icon-sm text-muted" />
                          <span className="truncate">{mod.name}</span>
                        </span>
                        <Badge variant={mod.scopeVariant} size="sm" className="whitespace-nowrap">{mod.scopeTag}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-space-md gap-y-space-xs">
                        {mod.perms.map((p) => (
                          <span key={p.text} className={`flex items-center gap-1 text-meta ${p.allowed ? 'text-secondary' : 'text-faint'}`}>
                            <Icon
                              name={p.allowed ? 'check_circle' : 'cancel'}
                              aria-hidden="true"
                              className={`material-symbols-outlined text-icon-sm ${p.allowed ? 'text-success' : 'text-faint'}`}
                            />
                            {p.text}
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </SectionCard>
          </div>
          )}
        </div>
        </Tabs>
        )}

        <AppDialog
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          title="Invite team member"
          description="Create admin sign-in credentials and choose what they can change."
          maxWidth="max-w-md"
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setIsInviteModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" form="invite-member-form" variant="primary" size="sm" disabled={isSubmitting}>
                <Icon name={isSubmitting ? 'hourglass_top' : 'check'} aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                <span>{isSubmitting ? 'Creating' : 'Grant access'}</span>
              </Button>
            </>
          }
        >
          <form id="invite-member-form" onSubmit={handleCreateUser} className="flex flex-col gap-space-md">
            <FormInput
              id="invite-name"
              label="Full name"
              placeholder="e.g. Alisha Kapoor"
              value={inviteForm.name}
              onChange={(value) => setInviteForm({ ...inviteForm, name: value })}
            />
            <FormInput
              id="invite-email"
              label="Work email"
              type="email"
              required
              placeholder="alisha@everwear.test"
              value={inviteForm.email}
              onChange={(value) => setInviteForm({ ...inviteForm, email: value })}
            />
            <FormInput
              id="invite-password"
              label="Initial password"
              type="password"
              required
              minLength={12}
              placeholder="At least 12 characters"
              helperText="Must contain at least 12 characters."
              value={inviteForm.password}
              onChange={(value) => setInviteForm({ ...inviteForm, password: value })}
            />
            <FormField label="Role" id="invite-role">
              <Select
                id="invite-role"
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                aria-label="Role"
                options={[
                  { value: 'staff', label: 'Operations staff (catalog, orders, inventory, fulfillment)' },
                  { value: 'owner', label: 'Store owner (full administrative and financial access)' },
                ]}
              />
            </FormField>
          </form>
        </AppDialog>

        <ConfirmDialog
          isOpen={pendingDelete != null}
          onClose={() => setPendingDelete(null)}
          onConfirm={confirmDeleteUser}
          isLoading={deleteUserMutation.isPending}
          title={`Remove ${pendingDelete?.name ?? 'team member'}?`}
          message="This revokes all of their admin access. They will no longer be able to sign in."
          confirmText="Remove"
        />
      </PageBody>
    </PageContainer>
  );
}
