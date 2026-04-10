import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Database,
  HardDrive,
  Server
} from 'lucide-react';

import DatabaseManagementClient from '@/components/admin/DatabaseManagementClient';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireAdmin } from '@/lib/auth/admin';

export default async function AdminDatabasePage() {
  await requireAdmin();

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-slate-900 to-slate-700 rounded-lg p-6 text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/admin"
              className="mb-3 inline-flex items-center gap-2 text-sm text-slate-200 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to admin dashboard
            </Link>
            <h1 className="text-3xl font-bold mb-2">Database Management</h1>
            <p className="text-slate-200">
              Manage protected database backups and recovery operations for the production system.
            </p>
          </div>
          <Database className="h-16 w-16 text-slate-300" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              <span>Backup worker</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>
              Backups and restores are executed by the Railway worker using the shared secret
              database maintenance pipeline.
            </p>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Remote worker enabled
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              <span>Storage target</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>
              SQL backups are compressed and stored in object storage so they can be listed and
              restored from this admin area.
            </p>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Cloudflare R2 archive storage
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              <span>High impact actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>
              Backup creation is safe for normal operations, but restore actions should be treated
              as emergency tooling with explicit confirmation.
            </p>
            <Badge variant="secondary" className="bg-red-100 text-red-800">
              Restore with caution
            </Badge>
          </CardContent>
        </Card>
      </div>

      <DatabaseManagementClient />
    </div>
  );
}