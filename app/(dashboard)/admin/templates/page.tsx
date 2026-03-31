'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Eye, Copy, FileText } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface CertificateTemplate {
  id: number;
  name: string;
  certificateType: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface DisseminatorTemplate {
  id: number;
  name: string;
  description?: string;
  status: 'draft' | 'review' | 'published' | 'archived';
  version: number;
  sourceFileName: string;
  updatedAt: string;
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [disseminatorTemplates, setDisseminatorTemplates] = useState<DisseminatorTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [creatingReportForId, setCreatingReportForId] = useState<number | null>(null);

  const certificateTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'BS5839-1', label: 'BS5839-1 Fire Detection' },
    { value: 'BS5839-6', label: 'BS5839-6 Fire Detection' },
    { value: 'BS5266', label: 'BS5266 Emergency Lighting' },
    { value: 'FIRE_EXTINGUISHER', label: 'Fire Extinguisher' },
    { value: 'DRY_RISER', label: 'Dry Riser' },
    { value: 'CP12', label: 'CP12 Gas Safety' },
    { value: 'EICR', label: 'EICR (BS 7671)' },
  ];

  useEffect(() => {
    fetchTemplates();
  }, [selectedType]);

  const fetchTemplates = async () => {
    try {
      const params = selectedType !== 'all' ? `?type=${selectedType}` : '';
      const [certificateResponse, disseminatorResponse] = await Promise.all([
        fetch(`/api/admin/templates${params}`),
        fetch('/api/admin/report-disseminator', { cache: 'no-store' }),
      ]);

      if (!certificateResponse.ok) {
        throw new Error('Failed to fetch templates');
      }

      if (!disseminatorResponse.ok) {
        throw new Error('Failed to fetch report disseminator templates');
      }

      const [certificateData, disseminatorData] = await Promise.all([
        certificateResponse.json(),
        disseminatorResponse.json(),
      ]);

      setTemplates(certificateData);
      setDisseminatorTemplates(disseminatorData);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete the template "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/templates/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete template');
      }

      toast.success('Template deleted successfully');
      fetchTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast.error(error.message || 'Failed to delete template');
    }
  };

  const createReportFromDisseminatorTemplate = (template: DisseminatorTemplate) => {
    if (creatingReportForId) return;
    setCreatingReportForId(template.id);
    router.push(`/admin/reports/disseminator?templateId=${template.id}&action=create-report`);
  };

  const handleDuplicateTemplate = async (template: CertificateTemplate) => {
    try {
      const duplicateData = {
        name: `${template.name} (Copy)`,
        certificateType: template.certificateType,
        description: template.description ? `${template.description} (Copy)` : undefined,
        template: {}, // Will need to fetch full template data
      };

      // First get the full template data
      const templateResponse = await fetch(`/api/admin/templates/${template.id}`);
      if (!templateResponse.ok) {
        throw new Error('Failed to fetch template data');
      }
      const fullTemplate = await templateResponse.json();
      duplicateData.template = fullTemplate.template;

      const response = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(duplicateData),
      });

      if (!response.ok) {
        throw new Error('Failed to duplicate template');
      }

      toast.success('Template duplicated successfully');
      fetchTemplates();
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error('Failed to duplicate template');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Certificate Templates</h1>
          <p className="text-gray-600 mt-2">
            Manage and customize certificate templates for different types of inspections
          </p>
        </div>
        <Link href="/admin/templates/new">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Template
          </Button>
        </Link>
      </div>

      {/* Filter by certificate type */}
      <div className="flex flex-wrap gap-2">
        {certificateTypes.map((type) => (
          <Button
            key={type.value}
            variant={selectedType === type.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType(type.value)}
          >
            {type.label}
          </Button>
        ))}
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500 mb-4">No templates found for the selected type</p>
            <Link href="/admin/templates/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Template
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="relative">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{template.name}</h3>
                    <p className="text-sm text-gray-600">{template.certificateType}</p>
                  </div>
                  <div className="flex gap-1">
                    {template.isDefault && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                    <Badge variant={template.isActive ? 'default' : 'destructive'}>
                      {template.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                {template.description && (
                  <p className="text-sm text-gray-500 mt-2">{template.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                  <span>Version {template.version}</span>
                  <span>
                    Updated {new Date(template.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex gap-2">
                  <Link href={`/admin/templates/${template.id}/preview`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                  </Link>
                  
                  <Link href={`/admin/templates/${template.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </Link>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicateTemplate(template)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  
                  {!template.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteTemplate(template.id, template.name)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-4 pt-6 border-t">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Report Disseminator Templates</h2>
            <p className="text-gray-600 mt-1">
              Templates saved from Report Disseminator appear here.
            </p>
          </div>
          <Link href="/admin/reports/disseminator">
            <Button variant="outline">Open Report Disseminator</Button>
          </Link>
        </div>

        {disseminatorTemplates.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-gray-500 mb-4">No report disseminator templates found</p>
              <Link href="/admin/reports/disseminator">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create In Disseminator
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {disseminatorTemplates.map((template) => (
              <Card key={template.id} className="relative">
                <CardHeader>
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <h3 className="font-semibold text-lg">{template.name}</h3>
                      <p className="text-sm text-gray-600">{template.sourceFileName}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">{template.status}</Badge>
                  </div>
                  {template.description && (
                    <p className="text-sm text-gray-500 mt-2">{template.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                    <span>Version {template.version}</span>
                    <span>
                      Updated {new Date(template.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      disabled={creatingReportForId === template.id || template.status === 'archived'}
                      title={template.status === 'archived' ? 'Archived templates cannot be used to create new reports' : 'Create a blank report from this template, ready to fill in'}
                      onClick={() => createReportFromDisseminatorTemplate(template)}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      {creatingReportForId === template.id ? 'Creating…' : 'New Report'}
                    </Button>
                    <Link href="/admin/reports/disseminator">
                      <Button variant="outline" size="sm" title="Open this template in the Disseminator editor">
                        Edit
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 
