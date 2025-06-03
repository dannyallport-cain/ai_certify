// filepath: app/(dashboard)/certificates/[certificateId]/page.tsx
import { notFound } from 'next/navigation';
import { getCertificateById } from '@/lib/db/queries';
import { CertificateStatus, CertificateType } from '@/lib/db/schema';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function CertificatePage({ params }: any) {
  const id = parseInt(params.certificateId, 10);
  const data = await getCertificateById(id);
  if (!data) {
    notFound();
  }
  const { customer, items, ...certificate } = data;

  const statusColor = {
    [CertificateStatus.DRAFT]: 'bg-gray-100 text-gray-800',
    [CertificateStatus.COMPLETED]: 'bg-gray-100 text-gray-800',
    [CertificateStatus.ISSUED]: 'bg-green-100 text-green-800',
  }[certificate.status] || 'bg-gray-100 text-gray-800';

  return (
    <div className="flex-1 p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Certificate {certificate.certificateNumber}</h1>
        <Link href="/certificates">
          <Button variant="outline">Back to List</Button>
        </Link>
      </div>

      <div className="mb-6">
        <span className={`inline-flex px-2 py-1 rounded-full text-sm font-medium ${statusColor}`}>{certificate.status}</span>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p><strong>Type:</strong> {certificate.certificateType}</p>
          <p><strong>Customer:</strong> {customer?.name}</p>
          <p><strong>Site:</strong> {certificate.siteName} ({certificate.siteAddress})</p>
          <p><strong>Inspection Date:</strong> {certificate.inspectionDate ? new Date(certificate.inspectionDate).toLocaleDateString() : ''}</p>
          <p><strong>Next Inspection:</strong> {certificate.nextInspectionDate ? new Date(certificate.nextInspectionDate).toLocaleDateString() : ''}</p>
          <p><strong>Inspector:</strong> {certificate.inspectorName}</p>
        </CardContent>
      </Card>

      {items && items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Certificate Items</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {items.map(item => (
                <li key={item.id} className="py-2">
                  <p><strong>Type:</strong> {item.itemType}</p>
                  <p><strong>Location:</strong> {item.location}</p>
                  <p><strong>Status:</strong> {item.status}</p>
                  {item.defects && <p><strong>Defects:</strong> {item.defects}</p>}
                  {item.recommendations && <p><strong>Recommendations:</strong> {item.recommendations}</p>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
