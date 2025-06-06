import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CertificateType } from '@/lib/db/schema';

const certificateTypes = [
  {
    type: CertificateType.BS5839_1,
    title: 'BS5839-1 Fire Detection and Alarm Systems',
    description: 'Code of practice for design, installation, commissioning and maintenance of fire detection and fire alarm systems in and around buildings',
    icon: '🔥',
    color: 'bg-red-50 border-red-200 hover:bg-red-100'
  },
  {
    type: CertificateType.BS5839_6,
    title: 'BS5839-6 Fire Detection and Alarm Systems',
    description: 'Code of practice for the design, installation, commissioning and maintenance of fire detection and fire alarm systems in domestic premises',
    icon: '🏠',
    color: 'bg-orange-50 border-orange-200 hover:bg-orange-100'
  },
  {
    type: CertificateType.BS5266,
    title: 'BS5266 Emergency Lighting',
    description: 'Code of practice for the emergency lighting of premises',
    icon: '💡',
    color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
  },
  {
    type: CertificateType.FIRE_EXTINGUISHER,
    title: 'Fire Extinguisher Certificate',
    description: 'Inspection and maintenance certificate for portable fire extinguishers',
    icon: '🧯',
    color: 'bg-gray-50 border-gray-200 hover:bg-gray-100'
  },
  {
    type: CertificateType.DRY_RISER,
    title: 'Dry Riser Certificate',
    description: 'Testing and maintenance certificate for dry riser systems',
    icon: '🚰',
    color: 'bg-green-50 border-green-200 hover:bg-green-100'
  }
];

export default function NewCertificatePage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Create New Certificate</h2>
          <p className="text-muted-foreground">
            Select the type of fire safety certificate you want to create
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/certificates">
            ← Back to Certificates
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {certificateTypes.map((certType) => {
          const getUrlPath = (type: string) => {
            switch (type) {
              case 'BS5839_1': return 'bs5839-1'
              case 'BS5839_6': return 'bs5839-6'
              case 'BS5266': return 'bs5266'
              case 'FIRE_EXTINGUISHER': return 'fire-extinguisher'
              case 'DRY_RISER': return 'dry-riser'
              default: return type.toLowerCase()
            }
          }
          
          return (
          <Card key={certType.type} className={`cursor-pointer transition-all duration-200 ${certType.color}`}>
            <Link href={`/certificates/new/${getUrlPath(certType.type)}`}>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{certType.icon}</span>
                  <div>
                    <CardTitle className="text-lg">{certType.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  {certType.description}
                </CardDescription>
              </CardContent>
            </Link>
          </Card>
          )
        })}
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
            <CardDescription>
              Choose the appropriate certificate type based on your inspection requirements:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 text-sm">
              <div><strong>BS5839-1:</strong> Commercial fire alarm systems</div>
              <div><strong>BS5839-6:</strong> Domestic fire alarm systems</div>
              <div><strong>BS5266:</strong> Emergency lighting systems</div>
              <div><strong>Fire Extinguisher:</strong> Portable fire extinguisher maintenance</div>
              <div><strong>Dry Riser:</strong> Dry riser system testing and maintenance</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
