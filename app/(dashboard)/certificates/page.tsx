import { getCertificatesForTeam } from '@/lib/db/queries';
import Link from 'next/link';
import CertificateList from '@/components/CertificateList';

export default async function CertificatesPage() {
  const certificates = await getCertificatesForTeam();

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Certificates</h2>
          <p className="text-muted-foreground">Manage and create certificates for your customers</p>
        </div>
        <div className="flex items-center space-x-2">
          <Link href="/certificates/new" className="rounded-md bg-primary px-3 py-2 text-sm text-white">New Certificate</Link>
        </div>
      </div>

      <CertificateList certificates={certificates} />
    </div>
  );
}
