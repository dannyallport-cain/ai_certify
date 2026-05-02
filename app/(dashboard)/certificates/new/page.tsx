import Link from 'next/link';
import { and, asc, eq } from 'drizzle-orm';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GasSafeRegisterLogo } from '@/components/GasSafeRegisterLogo';
import { db } from '@/lib/db/drizzle';
import { getTeamForUser } from '@/lib/db/queries';
import { certificateTemplates } from '@/lib/db/schema';
import {
  CERTIFICATE_DISCIPLINE_GROUPS,
  CERTIFICATE_HUB_INTRODUCTION,
  type CertificateTypeCatalogEntry,
  getImplementedCertificateEntries,
  getPlannedCertificateEntries,
} from '@/lib/certificates/catalog';

type TemplateRecord = {
  id: number;
  name: string;
  certificateType: string;
  description: string | null;
  isDefault: boolean | null;
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
  EIC: 'Electrical Installation Certificate',
  MEIWC: 'Minor Electrical Installation Works Certificate',
};

function getTemplatePath(certificateType: string) {
  const pathMap: Record<string, string> = {
    BS5839_1: 'bs5839-1',
    BS5839_6: 'bs5839-6',
    BS5266: 'bs5266',
    FIRE_EXTINGUISHER: 'fire-extinguisher',
    DRY_RISER: 'dry-riser',
    CP12: 'cp12',
    EICR: 'eicr',
    EICR_STREAMLINED: 'eicr/streamlined',
    EIC: 'electrical/eic',
    MEIWC: 'electrical/meiwc',
  };

  return pathMap[certificateType] || certificateType.toLowerCase();
}

async function getActiveTemplatesForCurrentTeam(): Promise<TemplateRecord[]> {
  const team = await getTeamForUser();
  if (!team) {
    return [];
  }

  return db
    .select({
      id: certificateTemplates.id,
      name: certificateTemplates.name,
      certificateType: certificateTemplates.certificateType,
      description: certificateTemplates.description,
      isDefault: certificateTemplates.isDefault,
    })
    .from(certificateTemplates)
    .where(and(eq(certificateTemplates.teamId, team.id), eq(certificateTemplates.isActive, true)))
    .orderBy(asc(certificateTemplates.certificateType), asc(certificateTemplates.name));
}

function getEntryAccentClass(entry: CertificateTypeCatalogEntry) {
  switch (entry.discipline) {
    case 'gas':
      return 'bg-amber-50 border-amber-200 hover:bg-amber-100';
    case 'electrical':
      return 'bg-blue-50 border-blue-200 hover:bg-blue-100';
    case 'fire-alarm':
      return 'bg-red-50 border-red-200 hover:bg-red-100';
    case 'emergency-lighting':
      return 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100';
    case 'fire-extinguisher':
      return 'bg-gray-50 border-gray-200 hover:bg-gray-100';
    case 'dry-riser':
      return 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100';
    default:
      return 'bg-slate-50 border-slate-200 hover:bg-slate-100';
  }
}

function CertificateTypeCard({ entry }: { entry: CertificateTypeCatalogEntry }) {
  const implemented = entry.implementationStatus === 'implemented';

  return (
    <Card className={`transition-all duration-200 ${getEntryAccentClass(entry)} ${implemented ? 'cursor-pointer' : 'opacity-90'}`}>
      {implemented ? (
        <Link href={entry.route} className="block h-full">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {entry.discipline === 'gas' ? (
                  <GasSafeRegisterLogo className="h-12 w-16 rounded-lg border-amber-300 p-1.5 shadow-none" sizes="64px" />
                ) : (
                  <span className="text-2xl" aria-hidden="true">
                    {entry.discipline === 'electrical'
                      ? '⚡'
                      : entry.discipline === 'fire-alarm'
                        ? '🔥'
                        : entry.discipline === 'emergency-lighting'
                          ? '💡'
                          : entry.discipline === 'fire-extinguisher'
                            ? '🧯'
                            : '🚰'}
                  </span>
                )}
                <div>
                  <CardTitle className="text-lg">{entry.label}</CardTitle>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    {certificateTypeLabels[entry.certificateType] || entry.certificateType}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                Available
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <CardDescription className="text-sm">{entry.description}</CardDescription>
            <div className="space-y-2 text-xs text-slate-600">
              <p className="font-medium text-slate-700">Standards</p>
              <ul className="list-disc space-y-1 pl-4">
                {entry.standards.map((standard) => (
                  <li key={standard}>{standard}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-2 text-xs text-slate-600">
              <p className="font-medium text-slate-700">Typical use</p>
              <p>{entry.typicalUse}</p>
            </div>
          </CardContent>
        </Link>
      ) : (
        <div className="h-full">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">
                  {entry.discipline === 'gas'
                    ? '🔥'
                    : entry.discipline === 'electrical'
                      ? '⚡'
                      : entry.discipline === 'fire-alarm'
                        ? '🔥'
                        : entry.discipline === 'emergency-lighting'
                          ? '💡'
                          : entry.discipline === 'fire-extinguisher'
                            ? '🧯'
                            : '🚰'}
                </span>
                <div>
                  <CardTitle className="text-lg">{entry.label}</CardTitle>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    {certificateTypeLabels[entry.certificateType] || entry.certificateType}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                Planned
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <CardDescription className="text-sm">{entry.description}</CardDescription>
            <div className="space-y-2 text-xs text-slate-600">
              <p className="font-medium text-slate-700">Standards</p>
              <ul className="list-disc space-y-1 pl-4">
                {entry.standards.map((standard) => (
                  <li key={standard}>{standard}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-2 text-xs text-slate-600">
              <p className="font-medium text-slate-700">Typical use</p>
              <p>{entry.typicalUse}</p>
            </div>
            <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 p-3 text-xs text-slate-600">
              <p className="font-medium text-slate-700">Explanatory notes</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {entry.explanatoryNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </div>
      )}
    </Card>
  );
}

async function getCertificateHubSections() {
  return CERTIFICATE_DISCIPLINE_GROUPS.map((group) => ({
    ...group,
    implemented: group.entries.filter((entry) => entry.implementationStatus === 'implemented'),
    planned: group.entries.filter((entry) => entry.implementationStatus === 'planned'),
  }));
}

export default async function NewCertificatePage() {
  const [templates, sections] = await Promise.all([
    getActiveTemplatesForCurrentTeam(),
    getCertificateHubSections(),
  ]);

  const implementedEntries = getImplementedCertificateEntries();
  const plannedEntries = getPlannedCertificateEntries();

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex flex-col items-start justify-between gap-4 space-y-2 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Create New Certificate</h2>
          <p className="max-w-3xl text-muted-foreground">
            Select the type of certificate you want to create. The catalogue below separates
            implemented workflows from planned certificate types and includes the notes we gathered
            from common UK certificate patterns.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/certificates">← Back to Certificates</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catalogue notes</CardTitle>
          <CardDescription>
            Working notes for matching other software platforms and keeping the content accurate.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          {CERTIFICATE_HUB_INTRODUCTION.map((note) => (
            <p key={note}>{note}</p>
          ))}
          <div className="flex flex-wrap gap-2 pt-2 text-xs">
            <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-800">
              {implementedEntries.length} implemented
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
              {plannedEntries.length} planned
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <Card key={section.discipline}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {section.entries.map((entry) => (
                <CertificateTypeCard key={entry.key} entry={entry} />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Templates</CardTitle>
          <CardDescription>Templates from your template list for this team.</CardDescription>
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
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{template.description}</p>
                  ) : null}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>Choose the appropriate certificate type based on your inspection requirements.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
          <div><strong>BS5839-1:</strong> Commercial fire alarm systems</div>
          <div><strong>BS5839-6:</strong> Domestic fire alarm systems</div>
          <div><strong>BS5266:</strong> Emergency lighting systems</div>
          <div><strong>Fire Extinguisher:</strong> Portable fire extinguisher maintenance</div>
          <div><strong>Dry Riser:</strong> Dry riser system testing and maintenance</div>
          <div><strong>CP12:</strong> Landlord gas safety checks and appliance records</div>
          <div><strong>EICR:</strong> Full electrical installation condition report</div>
          <div><strong>EICR - Streamlined:</strong> Faster EICR entry with the same circuit validation rules</div>
          <div><strong>EIC / MEIWC:</strong> Electrical installation and minor works certificates</div>
        </CardContent>
      </Card>
    </div>
  );
}
