import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCertificatesForTeam } from '@/lib/db/queries';
import { FileText, Plus, Calendar, User, Award } from 'lucide-react';
import Link from 'next/link';
import { CertificateType, CertificateStatus } from '@/lib/db/schema';
import { DownloadPDFButton } from '@/components/DownloadPDFButton';

export default async function CertificatesPage() {
  const certificates = await getCertificatesForTeam();

  const getStatusColor = (status: string) => {
    switch (status) {
      case CertificateStatus.DRAFT:
        return 'bg-gray-100 text-gray-800';
      case CertificateStatus.COMPLETED:
        return 'bg-gray-100 text-gray-800';
      case CertificateStatus.ISSUED:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCertificateIcon = (type: string) => {
    switch (type) {
      case CertificateType.BS5839_1:
      case CertificateType.BS5839_6:
        return '🔥';
      case CertificateType.BS5266:
        return '💡';
      case CertificateType.FIRE_EXTINGUISHER:
        return '🧯';
      case CertificateType.DRY_RISER:
        return '🚰';
      default:
        return '📋';
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Fire Safety Certificates</h2>
          <p className="text-muted-foreground">
            Manage and create fire safety certificates for your customers
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button asChild>
            <Link href="/certificates/new">
              <Plus className="mr-2 h-4 w-4" />
              New Certificate
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed border-2 border-muted-foreground/25">
          <Link href="/certificates/new">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Create New Certificate</CardTitle>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+</div>
              <p className="text-xs text-muted-foreground">
                Start a new fire safety certificate
              </p>
            </CardContent>
          </Link>
        </Card>

        {certificates.map((cert) => (
          <Card key={cert.certificate.id} className="bg-card-mid hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <span className="mr-2">{getCertificateIcon(cert.certificate.certificateType)}</span>
                {cert.certificate.certificateType}
              </CardTitle>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(cert.certificate.status)}`}>
                {cert.certificate.status}
              </span>
            </CardHeader>
            <CardContent>
              <Link href={`/certificates/${cert.certificate.id}`} className="block">
                <div className="text-lg font-bold text-primary">
                  {cert.certificate.certificateNumber}
                </div>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center">
                    <User className="mr-1 h-3 w-3" />
                    {cert.customer?.name || 'No customer'}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="mr-1 h-3 w-3" />
                    {cert.certificate.inspectionDate ? 
                      new Date(cert.certificate.inspectionDate).toLocaleDateString() : 
                      'No date set'
                    }
                  </div>
                  {cert.certificate.siteName && (
                    <div className="flex items-center">
                      <FileText className="mr-1 h-3 w-3" />
                      {cert.certificate.siteName}
                    </div>
                  )}
                </div>
              </Link>
              <div className="mt-3 pt-3 border-t flex justify-between items-center">
                <Link href={`/certificates/${cert.certificate.id}`}>
                  <Button variant="ghost" size="sm">
                    <FileText className="mr-2 h-4 w-4" />
                    View Details
                  </Button>
                </Link>
                <DownloadPDFButton
                  certificateId={cert.certificate.id}
                  certificateNumber={cert.certificate.certificateNumber}
                  variant="outline"
                  size="sm"
                  showText={false}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {certificates.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="mr-2 h-5 w-5" />
              No Certificates Yet
            </CardTitle>
            <CardDescription>
              Get started by creating your first fire safety certificate.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/certificates/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Certificate
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
