'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <section className="flex flex-col min-h-screen">
      <header className="border-b p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <nav className="space-x-4">
          <Link href="/dashboard/admin">
            <Button variant="link">Home</Button>
          </Link>
          <Link href="/dashboard/admin/stripe-config">
            <Button variant="link">Stripe Config</Button>
          </Link>
          <Link href="/dashboard/admin/subscriptions">
            <Button variant="link">Subscriptions</Button>
          </Link>
          <Link href="/dashboard/admin/users">
            <Button variant="link">Users</Button>
          </Link>
        </nav>
      </header>
      <main className="p-6 flex-1"> {children} </main>
    </section>
  );
}
