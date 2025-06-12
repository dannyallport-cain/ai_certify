'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Eye, Copy } from 'lucide-react';
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

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');

  const certificateTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'BS5839-1', label: 'BS5839-1 Fire Detection' },
    { value: 'BS5839-6', label: 'BS5839-6 Fire Detection' },
    { value: 'BS5266', label: 'BS5266 Emergency Lighting' },
    { value: 'FIRE_EXTINGUISHER', label: 'Fire Extinguisher' },
    { value: 'DRY_RISER', label: 'Dry Riser' },
  ];

  useEffect(() => {
    fetchTemplates();
  }, [selectedType]);

  const fetchTemplates = async () => {
    try {
      const params = selectedType !== 'all' ? `?type=${selectedType}` : '';
      const response = await fetch(`/api/admin/templates${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      
      const data = await response.json();
      setTemplates(data);
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
                  
                  <Link href={`/admin/templates/${template.id}/edit`} className="flex-1">
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
    </div>
  );
} 