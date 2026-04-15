import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GasSafeRegisterLogo } from '@/components/GasSafeRegisterLogo';
import { AlertTriangle, Award, FileText, Users } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DashboardClient } from './components/DashboardClient';
import { getCertificatesForTeam, getCustomersForTeam, getUser } from '@/lib/db/queries';

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  const [certificates, customers] = await Promise.all([
    getCertificatesForTeam(),
    getCustomersForTeam()
  ]);

  const recentCertificates = certificates.slice(0, 5);
  const draftCertificates = certificates.filter(
    (cert) => cert.certificate.status === 'draft'
  ).length;
  const completedCertificates = certificates.filter(
    (cert) => cert.certificate.status === 'completed'
  ).length;
  const issuedCertificates = certificates.filter(
    (cert) => cert.certificate.status === 'issued'
  ).length;

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const expiringSoon = certificates.filter((cert) => {
    if (!cert.certificate.nextInspectionDate) return false;
    const nextInspection = new Date(cert.certificate.nextInspectionDate);
    return nextInspection <= thirtyDaysFromNow && nextInspection >= new Date();
  }).length;

  return (
    <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Certificate Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your certificate management system
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button asChild>
            <Link href="/certificates/new">
              <FileText className="mr-2 h-4 w-4" />
              New Certificate
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Certificates</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{certificates.length}</div>
            <p className="text-xs text-muted-foreground">
              {issuedCertificates} issued, {completedCertificates} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
            <p className="text-xs text-muted-foreground">Registered customer companies</p>
          </CardContent>
        </Card>

        <Card className="bg-card-back">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft Certificates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftCertificates}</div>
            <p className="text-xs text-muted-foreground">Certificates in progress</p>
          </CardContent>
        </Card>

        <Card className="bg-card-back">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{expiringSoon}</div>
            <p className="text-xs text-muted-foreground">Due for renewal in 30 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-card-mid hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/certificates/new/bs5839-1">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                🔥 <span className="ml-2">BS5839-1 Certificate</span>
              </CardTitle>
              <CardDescription>
                Fire detection and alarm systems for commercial premises
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="bg-card-mid hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/certificates/new/bs5266">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                💡 <span className="ml-2">BS5266 Certificate</span>
              </CardTitle>
              <CardDescription>
                Emergency lighting systems inspection and testing
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="bg-card-mid hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/certificates/new/fire-extinguisher">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                🧯 <span className="ml-2">Fire Extinguisher</span>
              </CardTitle>
              <CardDescription>
                Portable fire extinguisher maintenance certificate
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="bg-card-mid hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/certificates/new/cp12">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <GasSafeRegisterLogo className="h-11 w-14 rounded-lg border-amber-300 p-1.5 shadow-none" sizes="56px" />
                <span className="ml-3">CP12 Gas Safety</span>
              </CardTitle>
              <CardDescription>
                Landlord gas safety record for appliances and flues
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card-front">
          <CardHeader>
            <CardTitle>Recent Certificates</CardTitle>
            <CardDescription>Latest certificate activity</CardDescription>
          </CardHeader>
          <CardContent>
            {recentCertificates.length > 0 ? (
              <div className="space-y-3">
                {recentCertificates.map((cert) => (
                  <div key={cert.certificate.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {cert.certificate.certificateNumber}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {cert.customer?.name} • {cert.certificate.certificateType}
                      </div>
                    </div>
                    <div
                      className={`px-2 py-1 rounded-full text-xs ${
                        cert.certificate.status === 'issued'
                          ? 'bg-green-100 text-green-800'
                          : cert.certificate.status === 'completed'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {cert.certificate.status}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Award className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No certificates yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first certificate.
                </p>
                <div className="mt-6">
                  <Button asChild>
                    <Link href="/certificates/new">
                      <FileText className="mr-2 h-4 w-4" />
                      Create Certificate
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>Common tasks and actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/customers/new">
                <Users className="mr-2 h-4 w-4" />
                Add New Customer
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/certificates">
                <Award className="mr-2 h-4 w-4" />
                View All Certificates
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/customers">
                <Users className="mr-2 h-4 w-4" />
                Manage Customers
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <DashboardClient />
    </main>
  );
}
