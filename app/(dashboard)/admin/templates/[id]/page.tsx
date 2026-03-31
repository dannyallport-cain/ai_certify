'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Eye, Loader2 } from 'lucide-react';
import Link from 'next/link';
import TemplateEditor from '@/components/admin/TemplateEditor';

interface TemplateData {
  id: number;
  name: string;
  certificateType: string;
  description: string;
  isDefault: boolean;
  isActive: boolean;
  version: number;
  template: Record<string, any>;
}

const certificateTypes = [
  { value: 'BS5839-1', label: 'BS5839-1 Fire Detection System' },
  { value: 'BS5839-6', label: 'BS5839-6 Fire Detection System' },
  { value: 'BS5266', label: 'BS5266 Emergency Lighting' },
  { value: 'FIRE_EXTINGUISHER', label: 'Portable Fire Extinguisher' },
  { value: 'DRY_RISER', label: 'Dry Riser System' },
  { value: 'CP12', label: 'CP12 Gas Safety Certificate' },
  { value: 'EICR', label: 'EICR (BS 7671)' },
];

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [activeTab, setActiveTab] = useState('design');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<TemplateData | null>(null);

  useEffect(() => {
    fetchTemplate();
  }, [id]);

  const fetchTemplate = async () => {
    try {
      const res = await fetch(`/api/admin/templates/${id}`);
      if (!res.ok) throw new Error('Failed to fetch template');
      const data = await res.json();
      setTemplate({
        id: data.id,
        name: data.name,
        certificateType: data.certificateType,
        description: data.description || '',
        isDefault: data.isDefault,
        isActive: data.isActive,
        version: data.version,
        template: data.template,
      });
    } catch (err) {
      toast.error('Failed to load template');
      router.push('/admin/templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!template) return;
    if (!template.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          isDefault: template.isDefault,
          isActive: template.isActive,
          template: template.template,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save template');
      }

      toast.success('Template saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
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
            <h1 className="text-2xl font-bold">{template.name}</h1>
            <p className="text-gray-600 text-sm">
              {certificateTypes.find(t => t.value === template.certificateType)?.label ?? template.certificateType}
              {' · '}v{template.version}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/admin/templates/${id}/preview`}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Link>
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader><CardTitle>Template Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={template.name}
                  onChange={e => setTemplate(prev => prev ? { ...prev, name: e.target.value } : prev)}
                  placeholder="Enter template name"
                />
              </div>
              <div>
                <Label htmlFor="certType">Certificate Type</Label>
                <Select
                  value={template.certificateType}
                  onValueChange={v => setTemplate(prev => prev ? { ...prev, certificateType: v } : prev)}
                >
                  <SelectTrigger id="certType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {certificateTypes.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={template.description}
                  onChange={e => setTemplate(prev => prev ? { ...prev, description: e.target.value } : prev)}
                  placeholder="Template description"
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isDefault">Default Template</Label>
                <Switch
                  id="isDefault"
                  checked={template.isDefault}
                  onCheckedChange={v => setTemplate(prev => prev ? { ...prev, isDefault: v } : prev)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Active</Label>
                <Switch
                  id="isActive"
                  checked={template.isActive}
                  onCheckedChange={v => setTemplate(prev => prev ? { ...prev, isActive: v } : prev)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Editor */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="design">Design</TabsTrigger>
                  <TabsTrigger value="json">JSON</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsContent value="design">
                  <TemplateEditor
                    template={template.template as any}
                    onChange={updated => setTemplate(prev => prev ? { ...prev, template: updated } : prev)}
                  />
                </TabsContent>
                <TabsContent value="json">
                  <Textarea
                    className="font-mono text-xs min-h-[500px]"
                    value={JSON.stringify(template.template, null, 2)}
                    onChange={e => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setTemplate(prev => prev ? { ...prev, template: parsed } : prev);
                      } catch {
                        // invalid JSON while typing — ignore
                      }
                    }}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
