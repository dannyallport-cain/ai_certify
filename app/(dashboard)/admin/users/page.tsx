'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, KeyRound, Link2, MoreHorizontal, ShieldCheck, ShieldOff, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { USER_ROLES, USER_ROLE_LABELS, type UserRole } from '@/lib/auth/roles';

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: 'pending' | 'active' | 'inactive' | 'suspended';
  createdAt: string;
  lastLoginAt: string | null;
  team: {
    id: number;
    name: string | null;
    planName: string | null;
    subscriptionStatus: string | null;
    subscriptionBypass: boolean | null;
    subscriptionBypassReason: string | null;
    subscriptionBypassSetAt: string | null;
    subscriptionBypassRemovedAt: string | null;
    trialEndDate: string | null;
  } | null;
};

type BulkAction = 'suspend' | 'activate' | 'delete';

type TeamOption = {
  id: number;
  name: string;
};

type EditUserForm = {
  name: string;
  email: string;
  role: UserRole;
  teamId: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | User['status']>('all');
  const [busyUserId, setBusyUserId] = useState<number | null>(null);
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [submittingPasswordChange, setSubmittingPasswordChange] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTargetUser, setEditTargetUser] = useState<User | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<User | null>(null);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    role: 'user' as UserRole,
    customPassword: '',
    useCustomPassword: false,
  });
  const [editForm, setEditForm] = useState<EditUserForm>({
    name: '',
    email: '',
    role: 'user',
    teamId: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const selectAllRef = useRef<HTMLInputElement>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      const data = (await res.json()) as User[];
      setUsers(data);
      setSelectedUserIds((prev) => prev.filter((id) => data.some((user) => user.id === id)));
    } catch (error) {
      console.error(error);
      alert('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadTeams = async () => {
    try {
      const res = await fetch('/api/admin/teams');
      if (!res.ok) {
        throw new Error('Failed to load teams');
      }

      const data = (await res.json()) as TeamOption[];
      setTeams(data);
    } catch (error) {
      console.error(error);
      alert('Failed to load teams');
    }
  };

  useEffect(() => {
    void loadUsers();
    void loadTeams();

    const refreshUsers = () => {
      void loadUsers();
    };

    window.addEventListener('focus', refreshUsers);
    document.addEventListener('visibilitychange', refreshUsers);

    return () => {
      window.removeEventListener('focus', refreshUsers);
      document.removeEventListener('visibilitychange', refreshUsers);
    };
  }, []);

  const filteredUsers = users.filter((user) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      q.length === 0 ||
      user.name?.toLowerCase().includes(q) ||
      user.email?.toLowerCase().includes(q);
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const filteredUserIds = filteredUsers.map((user) => user.id);
  const selectedUserCount = selectedUserIds.length;
  const selectedVisibleCount = filteredUsers.reduce(
    (count, user) => count + (selectedUserIds.includes(user.id) ? 1 : 0),
    0
  );
  const isAllVisibleSelected = filteredUsers.length > 0 && selectedVisibleCount === filteredUsers.length;
  const isSomeVisibleSelected = selectedVisibleCount > 0 && selectedVisibleCount < filteredUsers.length;
  const selectedExistingUsers = users.filter((user) => selectedUserIds.includes(user.id));
  const bulkBusy = bulkAction !== null || busyUserId !== null;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isSomeVisibleSelected;
    }
  }, [isSomeVisibleSelected]);

  const toggleUserSelection = (userId: number, checked: boolean) => {
    setSelectedUserIds((prev) => {
      if (checked) {
        return prev.includes(userId) ? prev : [...prev, userId];
      }
      return prev.filter((id) => id !== userId);
    });
  };

  const toggleVisibleSelection = (checked: boolean) => {
    setSelectedUserIds((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, ...filteredUserIds]));
      }
      return prev.filter((id) => !filteredUserIds.includes(id));
    });
  };

  const handleBulkAction = async (action: BulkAction) => {
    const targetUsers = selectedExistingUsers;
    if (targetUsers.length === 0) {
      alert('Select at least one user');
      return;
    }

    const actionLabel =
      action === 'suspend' ? 'suspend' : action === 'activate' ? 'activate' : 'delete';
    const confirmed = window.confirm(
      `Are you sure you want to ${actionLabel} ${targetUsers.length} selected user${targetUsers.length === 1 ? '' : 's'}?`
    );
    if (!confirmed) return;

    setBulkAction(action);
    try {
      let successCount = 0;
      let failureCount = 0;

      for (const user of targetUsers) {
        const res =
          action === 'delete'
            ? await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
            : await fetch(`/api/admin/users/${user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
              });

        if (res.ok) {
          successCount += 1;
        } else {
          failureCount += 1;
        }
      }

      await loadUsers();

      if (failureCount > 0) {
        alert(`${successCount} user${successCount === 1 ? '' : 's'} updated. ${failureCount} failed.`);
      } else {
        const pastTense =
          action === 'suspend' ? 'Suspended' : action === 'activate' ? 'Activated' : 'Deleted';
        alert(`${pastTense} ${successCount} selected user${successCount === 1 ? '' : 's'}.`);
      }

      setSelectedUserIds([]);
    } catch (error) {
      console.error(error);
      alert('Failed to update selected users');
    } finally {
      setBulkAction(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.email.trim()) {
      alert('Name and email are required');
      return;
    }
    if (createForm.useCustomPassword && createForm.customPassword.length < 8) {
      alert('Custom password must be at least 8 characters');
      return;
    }

    setSubmittingCreate(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name.trim(),
          email: createForm.email.trim(),
          role: createForm.role,
          password: createForm.useCustomPassword ? createForm.customPassword : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || 'Failed to create user');
        return;
      }

      if (data?.temporaryPassword) {
        await navigator.clipboard.writeText(data.temporaryPassword);
        alert(`User created. Temporary password copied to clipboard:\n${data.temporaryPassword}`);
      } else {
        alert('User created successfully');
      }

      setCreateModalOpen(false);
      setCreateForm({
        name: '',
        email: '',
        role: 'user',
        customPassword: '',
        useCustomPassword: false,
      });
      await loadUsers();
    } catch (error) {
      console.error(error);
      alert('Failed to create user');
    } finally {
      setSubmittingCreate(false);
    }
  };

  const openEditModal = (user: User) => {
    setEditTargetUser(user);
    setEditForm({
      name: user.name ?? '',
      email: user.email ?? '',
      role: USER_ROLES.includes(user.role as UserRole) ? (user.role as UserRole) : 'user',
      teamId: user.team?.id ? String(user.team.id) : '',
    });
    setEditModalOpen(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTargetUser) return;

    if (!editForm.name.trim() || !editForm.email.trim()) {
      alert('Name and email are required');
      return;
    }

    setSubmittingEdit(true);
    try {
      const res = await fetch(`/api/admin/users/${editTargetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-user',
          name: editForm.name.trim(),
          email: editForm.email.trim(),
          role: editForm.role,
          teamId: editForm.teamId ? Number(editForm.teamId) : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || 'Failed to update user');
        return;
      }

      alert('User updated successfully');
      setEditModalOpen(false);
      setEditTargetUser(null);
      await loadUsers();
    } catch (error) {
      console.error(error);
      alert('Failed to update user');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm('Delete this user? This is a soft delete and hides them from active users.');
    if (!confirmed) return;

    setBusyUserId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data?.error || 'Failed to delete user');
        return;
      }
      setSelectedUserIds((prev) => prev.filter((selectedId) => selectedId !== id));
      await loadUsers();
    } finally {
      setBusyUserId(null);
    }
  };

  const handleSuspendToggle = async (user: User) => {
    const action = user.status === 'suspended' ? 'activate' : 'suspend';
    const confirmed = window.confirm(
      user.status === 'suspended' ? 'Activate this user?' : 'Suspend this user?'
    );
    if (!confirmed) return;

    setBusyUserId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data?.error || 'Failed to update user status');
        return;
      }

      await loadUsers();
    } finally {
      setBusyUserId(null);
    }
  };

  const openChangePasswordModal = (user: User) => {
    setPasswordTargetUser(user);
    setPasswordForm({ newPassword: '', confirmPassword: '' });
    setPasswordModalOpen(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTargetUser) return;

    if (passwordForm.newPassword.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setSubmittingPasswordChange(true);
    try {
      const res = await fetch(`/api/admin/users/${passwordTargetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change-password', newPassword: passwordForm.newPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data?.error || 'Failed to change password');
        return;
      }

      alert('Password updated successfully');
      setPasswordModalOpen(false);
      setPasswordTargetUser(null);
    } finally {
      setSubmittingPasswordChange(false);
    }
  };

  const handleSendPasswordLink = async (user: User) => {
    setBusyUserId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send-password-link' }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data?.error || 'Failed to generate password link');
        return;
      }

      const link = data?.signInLink || `${window.location.origin}/sign-in`;
      const mailBody = `Hi ${user.name || 'there'},%0D%0A%0D%0AUse this link to sign in and update your password:%0D%0A${encodeURIComponent(link)}%0D%0A%0D%0AThanks`;
      window.location.href = `mailto:${user.email}?subject=Access%20Details&body=${mailBody}`;
    } finally {
      setBusyUserId(null);
    }
  };

  const handleToggleSubscriptionBypass = async (user: User) => {
    const currentlyEnabled = Boolean(user.team?.subscriptionBypass);
    const nextEnabled = !currentlyEnabled;
    const confirmed = nextEnabled
      ? window.confirm(
          `Enable subscription bypass for ${user.name || user.email}? This will let the user access billing-gated areas without an active subscription.`
        )
      : window.confirm(`Remove subscription bypass for ${user.name || user.email}?`);

    if (!confirmed) return;

    const bypassReason = nextEnabled
      ? window.prompt('Optional bypass reason', user.team?.subscriptionBypassReason ?? '')?.trim() ?? ''
      : '';

    setBusyUserId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle-subscription-bypass',
          bypassEnabled: nextEnabled,
          bypassReason: bypassReason.length > 0 ? bypassReason : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data?.error || 'Failed to update subscription bypass');
        return;
      }

      await loadUsers();
    } finally {
      setBusyUserId(null);
    }
  };

  const formatLastLogin = (lastLoginAt: string | null) => {
    if (!lastLoginAt) {
      return 'Never';
    }

    return new Date(lastLoginAt).toLocaleDateString();
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">User Management</h2>
        <Button onClick={() => setCreateModalOpen(true)}>Create User</Button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="md:col-span-2">
          <Label htmlFor="user-search" className="sr-only">
            Search users
          </Label>
          <Input
            id="user-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email"
          />
        </div>
        <div>
          <Label htmlFor="role-filter" className="sr-only">
            Filter by role
          </Label>
          <select
            id="role-filter"
            title="Filter by role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'all' | UserRole)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">All roles</option>
            {USER_ROLES.map((role) => (
              <option key={role} value={role}>
                {USER_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="status-filter" className="sr-only">
            Filter by status
          </Label>
          <select
            id="status-filter"
            title="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | User['status'])}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      <p className="mb-3 text-sm text-gray-600">
        Showing {filteredUsers.length} of {users.length} users
      </p>

      {selectedUserCount > 0 && (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-gray-700">
            <span className="font-semibold">{selectedUserCount}</span> selected
            {selectedVisibleCount !== selectedUserCount && (
              <span className="ml-2 text-gray-500">
                ({selectedVisibleCount} visible in current filters)
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={bulkBusy}
              onClick={() => handleBulkAction('suspend')}
            >
              Suspend selected
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkBusy}
              onClick={() => handleBulkAction('activate')}
            >
              Activate selected
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={bulkBusy}
              onClick={() => handleBulkAction('delete')}
            >
              Delete selected
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={bulkBusy}
              onClick={() => setSelectedUserIds([])}
            >
              Clear selection
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <p>Loading users...</p>
      ) : (
        <Table className="table-fixed text-sm">
          <thead>
            <tr>
              <th className="w-12">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={isAllVisibleSelected}
                  disabled={filteredUsers.length === 0 || bulkBusy}
                  onChange={(e) => toggleVisibleSelection(e.target.checked)}
                  aria-label="Select all visible users"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th className="w-14">ID</th>
              <th className="w-36">Name</th>
              <th>Email</th>
              <th className="w-24">Role</th>
              <th className="w-32">Team</th>
              <th className="w-24">Status</th>
              <th className="w-24">Created</th>
              <th className="w-24">Last login</th>
              <th className="w-44">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => {
              const isSelected = selectedUserIds.includes(user.id);

              return (
                <tr key={user.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={bulkBusy}
                      onChange={(e) => toggleUserSelection(user.id, e.target.checked)}
                      aria-label={`Select user ${user.name || user.email}`}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  <td>{user.id}</td>
                  <td className="truncate font-medium" title={user.name}>
                    {user.name}
                  </td>
                  <td className="truncate" title={user.email}>
                    {user.email}
                  </td>
                  <td>{USER_ROLE_LABELS[user.role as UserRole] || user.role}</td>
                  <td className="truncate" title={user.team?.name || 'No team'}>
                    {user.team?.name || 'No team'}
                  </td>
                  <td>
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        user.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : user.status === 'suspended'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>{formatLastLogin(user.lastLoginAt)}</td>
                  <td className="align-top">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3"
                        disabled={busyUserId === user.id || bulkBusy}
                        onClick={() => openEditModal(user)}
                      >
                        <ChevronDown className="mr-1 h-3.5 w-3.5 rotate-90" />
                        Edit
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 shrink-0 p-0"
                            disabled={busyUserId === user.id || bulkBusy}
                            aria-label={`More actions for ${user.name || user.email}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem onSelect={() => handleSuspendToggle(user)}>
                            {user.status === 'suspended' ? (
                              <ShieldCheck className="h-4 w-4" />
                            ) : (
                              <ShieldOff className="h-4 w-4" />
                            )}
                            {user.status === 'suspended' ? 'Activate user' : 'Suspend user'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openChangePasswordModal(user)}>
                            <KeyRound className="h-4 w-4" />
                            Reset password
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleSendPasswordLink(user)}>
                            <Link2 className="h-4 w-4" />
                            Send sign-in link
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleToggleSubscriptionBypass(user)}>
                            <ShieldCheck className="h-4 w-4" />
                            {user.team?.subscriptionBypass ? 'Remove bypass' : 'Enable bypass'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onSelect={() => handleDelete(user.id)}>
                            <Trash2 className="h-4 w-4" />
                            Delete user
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-sm text-gray-500">
                  No users match your current filters.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      )}

      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">Create User</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-user-name">Name</Label>
                <Input
                  id="create-user-name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-user-email">Email</Label>
                <Input
                  id="create-user-email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-user-role">Role</Label>
                <select
                  id="create-user-role"
                  title="Select role"
                  value={createForm.role}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, role: e.target.value as UserRole }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {USER_ROLES.map((roleOption) => (
                    <option key={roleOption} value={roleOption}>
                      {USER_ROLE_LABELS[roleOption]}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={createForm.useCustomPassword}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      useCustomPassword: e.target.checked,
                      customPassword: e.target.checked ? prev.customPassword : '',
                    }))
                  }
                />
                Set custom password now
              </label>
              {createForm.useCustomPassword && (
                <div className="space-y-2">
                  <Label htmlFor="create-user-password">Custom Password</Label>
                  <Input
                    id="create-user-password"
                    type="password"
                    value={createForm.customPassword}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, customPassword: e.target.value }))}
                    minLength={8}
                    required
                  />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreateModalOpen(false);
                    setCreateForm({
                      name: '',
                      email: '',
                      role: 'user',
                      customPassword: '',
                      useCustomPassword: false,
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submittingCreate}>
                  {submittingCreate ? 'Creating...' : 'Create User'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editModalOpen && editTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">Edit User</h3>
            <form onSubmit={handleEditUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-user-name">Name</Label>
                <Input
                  id="edit-user-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-user-email">Email</Label>
                <Input
                  id="edit-user-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-user-role">Role</Label>
                <select
                  id="edit-user-role"
                  title="Select role"
                  value={editForm.role}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value as UserRole }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {USER_ROLES.map((roleOption) => (
                    <option key={roleOption} value={roleOption}>
                      {USER_ROLE_LABELS[roleOption]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-user-team">Team</Label>
                <select
                  id="edit-user-team"
                  title="Select team"
                  value={editForm.teamId}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, teamId: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">No team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditModalOpen(false);
                    setEditTargetUser(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submittingEdit}>
                  {submittingEdit ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {passwordModalOpen && passwordTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-lg font-semibold">Change Password</h3>
            <p className="mb-4 text-sm text-gray-600">{passwordTargetUser.email}</p>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                  minLength={8}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  minLength={8}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPasswordModalOpen(false);
                    setPasswordTargetUser(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submittingPasswordChange}>
                  {submittingPasswordChange ? 'Saving...' : 'Update Password'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
