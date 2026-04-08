'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import Link from 'next/link';
import TemplateEditor from '@/components/admin/TemplateEditor';
import {
  createDefaultTemplateConfig,
  normalizeTemplateConfig,
  type CertificateTemplateConfig,
} from '@/lib/certificate-template-editor';

interface TemplateData {
  name: string;
  certificateType: string;
  description: string;
  template: CertificateTemplateConfig;
}

const defaultTemplate = createDefaultTemplateConfig();

export default function NewTemplatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceTemplateId = searchParams.get('sourceTemplateId');
  const [activeTab, setActiveTab] = useState('design');
  const [saving, setSaving] = useState(false);
  const [loadingSourceTemplate, setLoadingSourceTemplate] = useState(false);
  const [hasLoadedSourceTemplate, setHasLoadedSourceTemplate] = useState(false);

  const [templateData, setTemplateData] = useState<TemplateData>({
    name: '',
    certificateType: '',
    description: '',
    template: defaultTemplate,
  });

  useEffect(() => {
    if (!sourceTemplateId || hasLoadedSourceTemplate) {
      return;
    }

    const loadSourceTemplate = async () => {
      setLoadingSourceTemplate(true);

      try {
        const response = await fetch(`/api/admin/templates/${sourceTemplateId}`, {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Failed to load source template');
        }

        const sourceTemplate = await response.json();

        setTemplateData({
          name: sourceTemplate.name ? `${sourceTemplate.name} (Copy)` : '',
          certificateType: sourceTemplate.certificateType || '',
          description: sourceTemplate.description ? `${sourceTemplate.description} (Copy)` : '',
          template: normalizeTemplateConfig(sourceTemplate.template),
        });

        toast.success('Loaded existing template layout into the editor');
      } catch (error) {
        console.error('Error loading source template:', error);
        toast.error('Failed to load source template');
      } finally {
        setLoadingSourceTemplate(false);
        setHasLoadedSourceTemplate(true);
      }
    };

    void loadSourceTemplate();
  }, [hasLoadedSourceTemplate, sourceTemplateId]);

  const certificateTypes = [
    { value: 'BS5839-1', label: 'BS5839-1 Fire Detection System' },
    { value: 'BS5839-6', label: 'BS5839-6 Fire Detection System' },
    { value: 'BS5266', label: 'BS5266 Emergency Lighting' },
    { value: 'FIRE_EXTINGUISHER', label: 'Portable Fire Extinguisher' },
    { value: 'DRY_RISER', label: 'Dry Riser System' },
    { value: 'CP12', label: 'CP12 Gas Safety Certificate' },
  ];

  const handleSave = async () => {
    if (!templateData.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    if (!templateData.certificateType) {
      toast.error('Please select a certificate type');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save template');
      }

      toast.success('Template saved successfully');
      router.push('/admin/templates');
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error(error.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateUpdate = (updatedTemplate: CertificateTemplateConfig) => {
    setTemplateData((prev) => ({
      ...prev,
      template: updatedTemplate,
    }));
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/templates">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Templates
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Create New Template</h1>
            <p className="text-gray-600">
              {sourceTemplateId
                ? 'Starting from an existing template layout copy'
                : 'Design a new certificate template'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setActiveTab('preview')}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Template Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sourceTemplateId ? (
                <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                  {loadingSourceTemplate
                    ? 'Loading template layout copy into the editor...'
                    : 'This new template has been pre-filled from an existing saved layout copy.'}
                </div>
              ) : null}
              <div>
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={templateData.name}
                  onChange={(e) => setTemplateData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter template name"
                />
              </div>

              <div>
                <Label htmlFor="certificateType">Certificate Type</Label>
                <Select
                  value={templateData.certificateType}
                  onValueChange={(value) =>
                    setTemplateData((prev) => ({ ...prev, certificateType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select certificate type" />
                  </SelectTrigger>
                  <SelectContent>
                    {certificateTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={templateData.description}
                  onChange={(e) =>
                    setTemplateData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Enter template description"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="design">Design</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="h-full">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsContent value="design" className="h-full">
                  <TemplateEditor
                    template={normalizeTemplateConfig(templateData.template)}
                    onChange={handleTemplateUpdate}
                  />
                </TabsContent>
                <TabsContent value="preview" className="h-full">
                  <div className="border rounded-lg bg-white p-6 shadow-inner">
                    <div className="py-12 text-center text-gray-500">
                      <Eye className="mx-auto mb-4 h-12 w-12 opacity-50" />
                      <p>Certificate preview will be displayed here</p>
                      <p className="text-sm">
                        This will show how the certificate will look when generated
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
