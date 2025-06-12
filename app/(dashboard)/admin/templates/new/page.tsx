'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import Link from 'next/link';
import TemplateEditor from '@/components/admin/TemplateEditor';

interface TemplateData {
  name: string;
  certificateType: string;
  description: string;
  template: {
    sections: any[];
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      text: string;
    };
    fonts: {
      heading: string;
      body: string;
      size: {
        small: number;
        medium: number;
        large: number;
      };
    };
    layout: {
      margins: {
        top: number;
        right: number;
        bottom: number;
        left: number;
      };
      spacing: number;
    };
  };
}

const defaultTemplate = {
  sections: [
    {
      id: 'header',
      type: 'header',
      title: 'Company Header',
      order: 1,
      visible: true,
      style: {
        backgroundColor: '#344970',
        textColor: '#ffffff',
        fontSize: 14,
        padding: 20,
        margin: 0,
      },
    },
    {
      id: 'certificate-title',
      type: 'title',
      title: 'Certificate Title',
      order: 2,
      visible: true,
      style: {
        backgroundColor: '#f8f9fa',
        textColor: '#000000',
        fontSize: 18,
        padding: 15,
        margin: 10,
      },
    },
    {
      id: 'certificate-number',
      type: 'certificate-number',
      title: 'Certificate Number',
      order: 3,
      visible: true,
      style: {
        backgroundColor: '#ffc107',
        textColor: '#000000',
        fontSize: 12,
        padding: 10,
        margin: 5,
      },
    },
    {
      id: 'site-details',
      type: 'data-table',
      title: 'Site Details',
      order: 4,
      visible: true,
      style: {
        backgroundColor: '#f8f9fa',
        textColor: '#000000',
        fontSize: 10,
        padding: 15,
        margin: 5,
      },
    },
    {
      id: 'inspection-details',
      type: 'data-table',
      title: 'Inspection Details',
      order: 5,
      visible: true,
      style: {
        backgroundColor: '#f8f9fa',
        textColor: '#000000',
        fontSize: 10,
        padding: 15,
        margin: 5,
      },
    },
    {
      id: 'items-table',
      type: 'items-table',
      title: 'Items Tested',
      order: 6,
      visible: true,
      style: {
        backgroundColor: '#f8f9fa',
        textColor: '#000000',
        fontSize: 9,
        padding: 15,
        margin: 5,
      },
    },
    {
      id: 'defects',
      type: 'defects',
      title: 'Defects and Recommendations',
      order: 7,
      visible: true,
      style: {
        backgroundColor: '#fff5f5',
        textColor: '#000000',
        fontSize: 10,
        padding: 15,
        margin: 5,
      },
    },
    {
      id: 'certification',
      type: 'certification',
      title: 'Certification Statement',
      order: 8,
      visible: true,
      style: {
        backgroundColor: '#f0f8ff',
        textColor: '#000000',
        fontSize: 10,
        padding: 15,
        margin: 5,
      },
    },
    {
      id: 'signatures',
      type: 'signatures',
      title: 'Signatures',
      order: 9,
      visible: true,
      style: {
        backgroundColor: '#f8f9fa',
        textColor: '#000000',
        fontSize: 10,
        padding: 15,
        margin: 10,
      },
    },
  ],
  colors: {
    primary: '#344970',
    secondary: '#6c757d',
    accent: '#ffc107',
    background: '#ffffff',
    text: '#000000',
  },
  fonts: {
    heading: 'Helvetica',
    body: 'Helvetica',
    size: {
      small: 8,
      medium: 10,
      large: 14,
    },
  },
  layout: {
    margins: {
      top: 20,
      right: 20,
      bottom: 20,
      left: 20,
    },
    spacing: 15,
  },
};

export default function NewTemplatePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('design');
  const [saving, setSaving] = useState(false);
  
  const [templateData, setTemplateData] = useState<TemplateData>({
    name: '',
    certificateType: '',
    description: '',
    template: defaultTemplate,
  });

  const certificateTypes = [
    { value: 'BS5839-1', label: 'BS5839-1 Fire Detection System' },
    { value: 'BS5839-6', label: 'BS5839-6 Fire Detection System' },
    { value: 'BS5266', label: 'BS5266 Emergency Lighting' },
    { value: 'FIRE_EXTINGUISHER', label: 'Portable Fire Extinguisher' },
    { value: 'DRY_RISER', label: 'Dry Riser System' },
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

  const handleTemplateUpdate = (updatedTemplate: any) => {
    setTemplateData(prev => ({
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
            <p className="text-gray-600">Design a new certificate template</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Template Settings Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Template Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={templateData.name}
                  onChange={(e) => setTemplateData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter template name"
                />
              </div>

              <div>
                <Label htmlFor="certificateType">Certificate Type</Label>
                <Select
                  value={templateData.certificateType}
                  onValueChange={(value) => setTemplateData(prev => ({ ...prev, certificateType: value }))}
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
                  onChange={(e) => setTemplateData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter template description"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Editor Area */}
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
                    template={templateData.template}
                    onChange={handleTemplateUpdate}
                  />
                </TabsContent>
                <TabsContent value="preview" className="h-full">
                  <div className="border rounded-lg bg-white p-6 shadow-inner">
                    <div className="text-center text-gray-500 py-12">
                      <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Certificate preview will be displayed here</p>
                      <p className="text-sm">This will show how the certificate will look when generated</p>
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