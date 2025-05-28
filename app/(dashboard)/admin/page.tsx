// filepath: app/(dashboard)/admin/page.tsx
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AdminLayout from './layout';

export default function AdminHomePage() {
  return (
    <AdminLayout>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <Link href="/dashboard/admin/stripe-config">
            <CardHeader>
              <CardTitle>Stripe Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              Manage API keys, products & webhooks
            </CardContent>
          </Link>
        </Card>
        <Card>
          <Link href="/dashboard/admin/subscriptions">
            <CardHeader>
              <CardTitle>Subscription Plans</CardTitle>
            </CardHeader>
            <CardContent>
              Configure pricing tiers and feature limits
            </CardContent>
          </Link>
        </Card>
        <Card>
          <Link href="/dashboard/admin/users">
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              View, edit or deactivate users
            </CardContent>
          </Link>
        </Card>
        <Card>
          <Link href="/dashboard/admin/reports">
            <CardHeader>
              <CardTitle>Reports & Logs</CardTitle>
            </CardHeader>
            <CardContent>
              System reports and activity logs
            </CardContent>
          </Link>
        </Card>
      </div>
    </AdminLayout>
  );
}
