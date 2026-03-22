// filepath: app/(dashboard)/admin/users/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { USER_ROLES, USER_ROLE_LABELS, type UserRole } from '@/lib/auth/roles';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function NewUserPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, role }),
    });
    setSaving(false);
    if (res.ok) {
      router.push('/admin/users');
    } else {
      alert('Failed to create user');
    }
  };

  return (
    <>
      <h2 className="text-2xl font-bold mb-4">Create New User</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            aria-label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            required
            className="block w-full mt-1 border rounded-md px-3 py-2"
          >
            {USER_ROLES.map((roleOption) => (
              <option key={roleOption} value={roleOption}>
                {USER_ROLE_LABELS[roleOption]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex space-x-2">
          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create User'}</Button>
          <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </>
  );
}
