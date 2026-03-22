// filepath: app/(dashboard)/admin/users/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Table } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/users')
      .then((res) => res.json())
      .then((data) => setUsers(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDeactivate = async (id: number) => {
    const confirmed = window.confirm('Deactivate this user?');
    if (!confirmed) return;
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    setUsers(users.filter((u) => u.id !== id));
  };

  return (
    <>
      <h2 className="text-xl font-semibold mb-4">User Management</h2>
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
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <Button variant="destructive" size="sm" onClick={() => handleDeactivate(user.id)}>
                    Deactivate
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
