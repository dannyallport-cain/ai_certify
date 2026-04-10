import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Database,
  HardDrive,
  Server
} from 'lucide-react';

import { AdminPageHero, AdminSection } from '@/components/admin/AdminPageSection';
import DatabaseManagementClient from '@/components/admin/DatabaseManagementClient';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { requireAdmin } from '@/lib/auth/admin';

export default async function AdminDatabasePage() {
  await requireAdmin();

  return (
    <div className="space-y-8">
      <AdminPageHero
        eyebrow="Recovery tooling"
        title="Database management"
        description="Split backup status, storage details, and recovery warnings into clearer sections before you interact with destructive tooling."
        tone="slate"
        icon={<Database className="h-8 w-8" />}
        actions={
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/60 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-white/80"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to admin dashboard
          </Link>
        }
      />

      <AdminSection
        eyebrow="Infrastructure"
        title="Backup and restore architecture"
        description="The supporting systems behind backup creation and emergency restores."
        icon={<Server className="h-5 w-5" />}
        tone="blue"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-2xl border-blue-200/80 bg-white shadow-none">
            <CardContent className="space-y-3 p-5">
              <div className="rounded-xl bg-blue-100 p-2 text-blue-700 w-fit">
                <Server className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">Backup worker</h3>
              <p className="text-sm text-slate-600">
                Backups and restores are executed by the Railway worker using the shared secret
                database maintenance pipeline.
              </p>
              <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                Remote worker enabled
              </Badge>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-emerald-200/80 bg-white shadow-none">
            <CardContent className="space-y-3 p-5">
              <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700 w-fit">
                <HardDrive className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">Storage target</h3>
              <p className="text-sm text-slate-600">
                SQL backups are compressed and stored in object storage so they can be listed and
                restored from this admin area.
              </p>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                Cloudflare R2 archive storage
              </Badge>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-rose-200/80 bg-white shadow-none">
            <CardContent className="space-y-3 p-5">
              <div className="rounded-xl bg-rose-100 p-2 text-rose-700 w-fit">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">High impact actions</h3>
              <p className="text-sm text-slate-600">
                Backup creation is safe for normal operations, but restore actions should be treated
                as emergency tooling with explicit confirmation.
              </p>
              <Badge variant="secondary" className="bg-rose-50 text-rose-700">
                Restore with caution
              </Badge>
            </CardContent>
          </Card>
        </div>
      </AdminSection>

      <DatabaseManagementClient />
    </div>
  );
}
