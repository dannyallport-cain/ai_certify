'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';
import { ArrowLeft, Download, Loader2, Eye } from 'lucide-react';
import Link from 'next/link';

interface Section {
  id: string;
  type: string;
  title?: string;
  label?: string;
  order: number;
  visible: boolean;
  config?: Record<string, any>;
  style?: Record<string, any>;
}

interface TemplateConfig {
  sections: Section[];
  colors: { primary: string; secondary: string; accent: string; background: string; text: string };
  fonts: { heading: string; body: string; size: { small: number; medium: number; large: number } };
  layout: { margins: { top: number; right: number; bottom: number; left: number }; spacing: number };
}

interface Template {
  id: number;
  name: string;
  certificateType: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  version: number;
  template: TemplateConfig;
}

const sampleData: Record<string, string> = {
  certificateNumber: 'CE202695',
  siteName: 'Highfield Hall Community Centre',
  siteAddress: 'Marsh Lane, Farnworth, Bolton, BL4 0AW',
  customerName: 'Highfield Hall Community Centre',
  inspectorName: 'Daniel Allport',
  inspectionDate: '15 March 2024',
  nextInspectionDate: '15 March 2027',
  overallAssessment: 'SATISFACTORY',
  tradingTitle: 'Cain Enabled Engineering Ltd',
  registrationNumber: '611716000',
  reasonForReport: 'Safety assessment requested by client. To assess compliance with BS 7671.',
  premisesType: 'Commercial',
  estimatedAgeOfWiring: '15',
  evidenceOfAdditions: 'Yes',
  earthingArrangements: 'TN-C-S',
  nominalVoltageU: '400',
  nominalVoltageUo: '230',
  nominalFrequency: '50',
  prospectiveFaultCurrent: '1.8',
  externalEarthFaultLoopImpedance: '0.13',
  nextInspectionPeriod: '3 Years',
  status: 'Satisfactory',
};

const sectionTypeLabels: Record<string, string> = {
  header: 'Company Header',
  title: 'Report/Certificate Title',
  'certificate-number': 'Certificate Number',
  'data-table': 'Data Table',
  'items-table': 'Items Table',
  defects: 'Observations / Defects',
  certification: 'Certification Statement',
  signatures: 'Signatures',
};

const sectionTypeColors: Record<string, string> = {
  header: 'bg-blue-50 border-blue-200',
  title: 'bg-amber-50 border-amber-200',
  'certificate-number': 'bg-purple-50 border-purple-200',
  'data-table': 'bg-gray-50 border-gray-200',
  'items-table': 'bg-green-50 border-green-200',
  defects: 'bg-red-50 border-red-200',
  certification: 'bg-cyan-50 border-cyan-200',
  signatures: 'bg-slate-50 border-slate-200',
};

function SectionPreview({ section, colors }: { section: Section; colors: TemplateConfig['colors'] }) {
  const label = section.title || section.label || section.id;
  const typeLabel = sectionTypeLabels[section.type] ?? section.type;
  const classes = sectionTypeColors[section.type] ?? 'bg-gray-50 border-gray-200';

  const renderContent = () => {
    switch (section.type) {
      case 'header':
        return (
          <div className="rounded p-3 text-white text-sm font-bold" style={{ backgroundColor: colors.primary }}>
            <div className="text-base">Cain Enabled Engineering Ltd</div>
            <div className="text-xs font-normal opacity-80">01246 387 450  |  info@cain-enabled.co.uk</div>
            <div className="text-xs font-normal opacity-80">Piccadilly Business Centre, Manchester, M12 6AE</div>
          </div>
        );
      case 'title':
        return (
          <div className="rounded p-3 border text-center" style={{ backgroundColor: colors.accent + '33', borderColor: colors.accent }}>
            <div className="font-bold text-sm" style={{ color: colors.primary }}>
              {section.config?.title || 'ELECTRICAL INSTALLATION CONDITION REPORT'}
            </div>
            {section.config?.subtitle && (
              <div className="text-xs mt-1 opacity-70">{section.config.subtitle}</div>
            )}
          </div>
        );
      case 'certificate-number':
        return (
          <div className="rounded px-3 py-2 text-white text-sm font-mono font-bold" style={{ backgroundColor: colors.primary }}>
            Report Reference: <span style={{ color: colors.accent }}>{sampleData.certificateNumber}</span>
          </div>
        );
      case 'data-table':
        const fields = section.config?.fields?.slice(0, 4) || [
          { label: 'Sample Field 1', key: 'siteName' },
          { label: 'Sample Field 2', key: 'inspectorName' },
        ];
        return (
          <div className="rounded border overflow-hidden text-xs">
            {fields.map((f: any, i: number) => (
              <div key={i} className={`flex gap-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <div className="px-2 py-1 font-semibold w-2/5 border-r border-gray-200" style={{ color: colors.primary }}>
                  {f.label}
                </div>
                <div className="px-2 py-1 text-gray-700">
                  {sampleData[f.key] || '─'}
                </div>
              </div>
            ))}
            {section.config?.fields?.length > 4 && (
              <div className="px-2 py-1 text-center text-gray-400 text-xs bg-gray-50">
                +{section.config.fields.length - 4} more fields…
              </div>
            )}
          </div>
        );
      case 'defects':
        return (
          <div className="rounded border overflow-hidden text-xs">
            <div className="px-2 py-1 text-white font-bold flex gap-1" style={{ backgroundColor: colors.primary }}>
              <span className="flex-1">Observation</span><span className="w-10 text-center">Code</span>
            </div>
            {[
              { obs: 'Means of isolation does not have provision for locking off.', code: 'C2', bg: '#ff8c00' },
              { obs: 'IP rating of luminaires not appropriate for Zone 1 in kitchen.', code: 'C3', bg: colors.primary },
              { obs: 'Earth fault loop impedance exceeds maximum value for circuit 14.', code: 'FI', bg: '#6437a0' },
            ].map((row, i) => (
              <div key={i} className={`flex gap-1 items-center px-2 py-1 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                <div className="flex-1 text-gray-700">{row.obs}</div>
                <div className="rounded px-1 py-0.5 text-white text-xs font-bold w-10 text-center" style={{ backgroundColor: row.bg }}>
                  {row.code}
                </div>
              </div>
            ))}
          </div>
        );
      case 'certification':
        return (
          <div className="rounded border p-2 text-xs text-gray-600 italic bg-blue-50 border-blue-200">
            {section.config?.statement
              ? section.config.statement.slice(0, 200) + (section.config.statement.length > 200 ? '…' : '')
              : 'I/We, being the person(s) responsible for the inspection and testing of the electrical installation… hereby declare that the information in this report is correct…'}
          </div>
        );
      case 'signatures':
        return (
          <div className="flex gap-4">
            {(section.config?.fields || [{ label: 'Inspector Signature' }, { label: 'Client Signature' }]).map((f: any, i: number) => (
              <div key={i} className="flex-1 border-t-2 border-gray-400 pt-2 text-xs text-center text-gray-500">
                {f.label}
              </div>
            ))}
          </div>
        );
      default:
        return <div className="text-xs text-gray-400 italic">Section content will appear here</div>;
    }
  };

  return (
    <div className={`border rounded-lg p-3 space-y-2 ${classes}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">{label}</span>
        <div className="flex gap-1">
          <Badge variant="outline" className="text-xs py-0 h-5">{typeLabel}</Badge>
          {!section.visible && <Badge variant="secondary" className="text-xs py-0 h-5">Hidden</Badge>}
        </div>
      </div>
      <div className={section.visible ? '' : 'opacity-30'}>
        {renderContent()}
      </div>
    </div>
  );
}

export default function TemplatePreviewPage() {
  const params = useParams();
  const id = params.id as string;

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/templates/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(data => setTemplate(data))
      .catch(() => toast.error('Failed to load template'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDownloadSample = async () => {
    setDownloading(true);
    try {
      const { generateCertificatePDF } = await import('@/lib/pdf/generator');
      const sampleCert = {
        id: 0,
        certificateNumber: 'CE202695',
        certificateType: template!.certificateType,
        siteName: 'Highfield Hall Community Centre',
        siteAddress: 'Marsh Lane, Farnworth, Bolton, BL4 0AW',
        inspectionDate: '2024-03-15',
        nextInspectionDate: '2027-03-15',
        inspectorName: 'Daniel Allport',
        status: 'completed',
        formData: {
          tradingTitle: 'Cain Enabled Engineering Ltd',
          companyAddress: 'Piccadilly Business Centre, Manchester, M12 6AE',
          registrationNumber: '611716000',
          companyTelephone: '01246 387 450',
          companyEmail: 'info@cain-enabled.co.uk',
          inspectorPosition: 'Qualified Supervisor',
          reasonForReport: 'Safety assessment requested by client. To assess compliance with BS 7671.',
          premisesType: 'Commercial',
          estimatedAgeOfWiring: '15',
          evidenceOfAdditions: 'Yes',
          estimatedAgeOfAdditions: '5',
          installationRecordsAvailable: 'No',
          extentOfInspection: '50% of the installation in accordance with Guidance Note 3.',
          agreedLimitations: 'No testing of HVAC control cables.',
          agreedLimitationsWith: 'Mr. J. Hargreaves (Centre Manager)',
          overallAssessment: 'SATISFACTORY',
          nextInspectionPeriod: '3 Years',
          generalCondition: 'Good condition, adequate for continued use.',
          earthingArrangements: 'TN-C-S',
          natureOfSupply: '3-phase (4 wire) ac',
          nominalVoltageU: '400',
          nominalVoltageUo: '230',
          nominalFrequency: '50',
          prospectiveFaultCurrent: '1.8',
          externalEarthFaultLoopImpedance: '0.13',
          numberOfSupplies: '1',
          supplyProtectiveDeviceType: 'BS 1361 Fuse HBC',
          supplyProtectiveDeviceRating: '100',
          shortCircuitCapacity: '33',
          meansOfEarthing: "Distributor's facility",
          maximumDemand: '100 Amps',
          protectiveMeasures: 'ADS',
        },
        customer: {
          name: 'Highfield Hall Community Centre',
          email: 'admin@highfieldhall.org.uk',
          phone: '01204 571 849',
          address: 'Marsh Lane, Farnworth, Bolton',
          postcode: 'BL4 0AW',
          contactPerson: 'Mr. J. Hargreaves',
        },
        items: [
          { id: 1, itemType: 'observation', location: 'Main DB', description: 'Means of isolation does not have provision for securing in the off position. Regulation 537.3.2 refers.', status: 'unsatisfactory', defects: 'C2', recommendations: 'Provide padlock facility.' },
          { id: 2, itemType: 'observation', location: 'Kitchen', description: 'IP rating of luminaires is not appropriate for Zone 1. Regulation 701.512.2 refers.', status: 'satisfactory', defects: 'C3', recommendations: 'Replace luminaires with correct IP rating.' },
          { id: 3, itemType: 'observation', location: 'Circuit 14', description: 'Earth fault loop impedance exceeds maximum value for installed 16A Type B MCB. Further investigation required.', status: 'not_tested', defects: 'FI', recommendations: 'Investigate cause of elevated Zs.' },
        ],
      };
      const bytes = generateCertificatePDF(sampleCert as any);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sample-${template!.certificateType}-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Sample PDF downloaded');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate sample PDF');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!template) return null;

  const sections = [...(template.template?.sections || [])]
    .filter(s => s !== null && s !== undefined)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const colors = template.template?.colors || {
    primary: '#1a3a5c', secondary: '#2c5282', accent: '#ffc107', background: '#ffffff', text: '#1a202c',
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/admin/templates/${id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Editor
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {template.name}
            </h1>
            <p className="text-sm text-muted-foreground">{template.certificateType} · v{template.version} · Preview with sample data</p>
          </div>
        </div>
        <Button onClick={handleDownloadSample} disabled={downloading}>
          {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          {downloading ? 'Generating…' : 'Download Sample PDF'}
        </Button>
      </div>

      {/* Colour palette indicator */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>Colour palette:</span>
        {Object.entries(colors).map(([key, hex]) => (
          <span key={key} className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 rounded border" style={{ backgroundColor: hex as string }} />
            {key}
          </span>
        ))}
      </div>

      {/* Section count summary */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="outline">{sections.filter(s => s.visible).length} visible sections</Badge>
        {sections.filter(s => !s.visible).length > 0 && (
          <Badge variant="secondary">{sections.filter(s => !s.visible).length} hidden</Badge>
        )}
      </div>

      {/* Mock A4 page */}
      <Card className="shadow-2xl">
        <CardContent className="p-8 space-y-3" style={{ backgroundColor: colors.background, minHeight: '297mm', fontFamily: template.template?.fonts?.body || 'sans-serif' }}>
          {sections.length === 0 ? (
            <div className="text-center text-muted-foreground py-20">
              No sections configured in this template
            </div>
          ) : (
            sections.map(section => (
              <SectionPreview key={section.id} section={section} colors={colors} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
