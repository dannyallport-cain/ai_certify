// filepath: app/(dashboard)/admin/users/page.tsx
'use client';

import { useEffect, useState } from 'react';
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
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | User['status']>('all');
  const [busyUserId, setBusyUserId] = useState<number | null>(null);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [submittingPasswordChange, setSubmittingPasswordChange] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<User | null>(null);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    role: 'user' as UserRole,
    customPassword: '',
    useCustomPassword: false,
  });
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error(error);
      alert('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

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
      await loadUsers();
    } finally {
      setBusyUserId(null);
    }
  };

  const handleSuspendToggle = async (user: User) => {
    const action = user.status === 'suspended' ? 'activate' : 'suspend';
    const confirmed = window.confirm(
      user.status === 'suspended'
        ? 'Activate this user?'
        : 'Suspend this user?'
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

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">User Management</h2>
        <Button onClick={() => setCreateModalOpen(true)}>
          Create User
        </Button>
      </div>
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="md:col-span-2">
          <Label htmlFor="user-search" className="sr-only">Search users</Label>
          <Input
            id="user-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email"
          />
        </div>
        <div>
          <Label htmlFor="role-filter" className="sr-only">Filter by role</Label>
          <select
            id="role-filter"
            title="Filter by role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'all' | UserRole)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">All roles</option>
            {USER_ROLES.map((role) => (
              <option key={role} value={role}>{USER_ROLE_LABELS[role]}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="status-filter" className="sr-only">Filter by status</Label>
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
      <p className="mb-3 text-sm text-gray-600">Showing {filteredUsers.length} of {users.length} users</p>
      {loading ? (
        <p>Loading users...</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{USER_ROLE_LABELS[user.role as UserRole] || user.role}</td>
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
                <td>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={busyUserId === user.id} onClick={() => handleSuspendToggle(user)}>
                      {user.status === 'suspended' ? 'Activate' : 'Suspend'}
                    </Button>
                    <Button size="sm" variant="outline" disabled={busyUserId === user.id} onClick={() => openChangePasswordModal(user)}>
                      Change Password
                    </Button>
                    <Button size="sm" variant="outline" disabled={busyUserId === user.id} onClick={() => handleSendPasswordLink(user)}>
                      Send Password Link
                    </Button>
                    <Button variant="destructive" size="sm" disabled={busyUserId === user.id} onClick={() => handleDelete(user.id)}>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">
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
