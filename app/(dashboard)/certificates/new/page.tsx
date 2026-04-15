import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GasSafeRegisterLogo } from '@/components/GasSafeRegisterLogo';
import Link from 'next/link';
import { CertificateType, certificateTemplates } from '@/lib/db/schema';
import { db } from '@/lib/db/drizzle';
import { getTeamForUser } from '@/lib/db/queries';
import { and, asc, eq } from 'drizzle-orm';

type TemplateRecord = {
  id: number;
  name: string;
  certificateType: string;
  description: string | null;
  isDefault: boolean | null;
};

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
  },
  {
    type: CertificateType.CP12,
    title: 'CP12 Gas Safety Certificate',
    description: 'Landlord gas safety record covering appliances, flues, ventilation, and safety checks',
    icon: '🔥',
    color: 'bg-amber-50 border-amber-200 hover:bg-amber-100'
  },
  {
    type: CertificateType.EICR,
    title: 'EICR - Electrical Installation Condition Report',
    description: 'Electrical installation condition report in accordance with BS 7671 IET Wiring Regulations',
    icon: '⚡',
    color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
  },
  {
    type: 'EICR_STREAMLINED',
    title: 'EICR - Streamlined',
    description: 'Streamlined EICR entry with the same validation logic and inconsistency highlighting as the full version',
    icon: '⚡',
    color: 'bg-cyan-50 border-cyan-200 hover:bg-cyan-100'
  }
];

const certificateTypePaths: Record<string, string> = {
  BS5839_1: 'bs5839-1',
  BS5839_6: 'bs5839-6',
  BS5266: 'bs5266',
  FIRE_EXTINGUISHER: 'fire-extinguisher',
  DRY_RISER: 'dry-riser',
  CP12: 'cp12',
  EICR: 'eicr',
  EICR_STREAMLINED: 'eicr/streamlined',
  'BS5839-1': 'bs5839-1',
  'BS5839-6': 'bs5839-6',
};

const certificateTypeLabels: Record<string, string> = {
  BS5839_1: 'BS5839-1',
  BS5839_6: 'BS5839-6',
  BS5266: 'BS5266',
  FIRE_EXTINGUISHER: 'Fire Extinguisher',
  DRY_RISER: 'Dry Riser',
  CP12: 'CP12 Gas Safety',
  EICR: 'EICR',
  EICR_STREAMLINED: 'EICR - Streamlined',
  'BS5839-1': 'BS5839-1',
  'BS5839-6': 'BS5839-6',
};

function getTemplatePath(certificateType: string) {
  return certificateTypePaths[certificateType] || certificateType.toLowerCase();
}

async function getActiveTemplatesForCurrentTeam(): Promise<TemplateRecord[]> {
  const team = await getTeamForUser();
  if (!team) {
    return [];
  }

  return await db
    .select({
      id: certificateTemplates.id,
      name: certificateTemplates.name,
      certificateType: certificateTemplates.certificateType,
      description: certificateTemplates.description,
      isDefault: certificateTemplates.isDefault,
    })
    .from(certificateTemplates)
    .where(
      and(
        eq(certificateTemplates.teamId, team.id),
        eq(certificateTemplates.isActive, true),
      ),
    )
    .orderBy(asc(certificateTemplates.certificateType), asc(certificateTemplates.name));
}

export default async function NewCertificatePage() {
  const templates = await getActiveTemplatesForCurrentTeam();

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Create New Certificate</h2>
          <p className="text-muted-foreground">
            Select the type of certificate you want to create
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
          return (
          <Card key={certType.type} className={`cursor-pointer transition-all duration-200 ${certType.color}`}>
            <Link href={`/certificates/new/${getTemplatePath(certType.type)}`}>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  {certType.type === CertificateType.CP12 ? (
                    <GasSafeRegisterLogo className="h-12 w-16 rounded-lg border-amber-300 p-1.5 shadow-none" sizes="64px" />
                  ) : (
                    <span className="text-2xl">{certType.icon}</span>
                  )}
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
            <CardTitle>Available Templates</CardTitle>
            <CardDescription>
              Templates from your template list for this team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active templates found. Create one in Admin → Templates, then return here.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                  <Link
                    key={template.id}
                    href={`/certificates/new/${getTemplatePath(template.certificateType)}?templateId=${template.id}`}
                    className="rounded-lg border p-4 transition-colors hover:bg-accent"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm leading-tight">{template.name}</p>
                      {template.isDefault ? (
                        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">Default</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {certificateTypeLabels[template.certificateType] || template.certificateType}
                    </p>
                    {template.description ? (
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{template.description}</p>
                    ) : null}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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
              <div><strong>CP12:</strong> Landlord gas safety checks and appliance records</div>
              <div><strong>EICR:</strong> Full electrical installation condition report</div>
              <div><strong>EICR - Streamlined:</strong> Faster EICR entry with the same circuit validation rules</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
