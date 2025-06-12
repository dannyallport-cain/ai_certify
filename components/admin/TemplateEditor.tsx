'use client';

import { useState, useCallback } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  DropResult 
} from '@hello-pangea/dnd';
import { 
  Settings, 
  Eye, 
  EyeOff, 
  GripVertical, 
  Palette,
  Type,
  Layout,
  Plus,
  Trash2
} from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Section {
  id: string;
  type: string;
  title: string;
  order: number;
  visible: boolean;
  style: {
    backgroundColor?: string;
    textColor?: string;
    fontSize?: number;
    padding?: number;
    margin?: number;
  };
}

interface TemplateConfig {
  sections: Section[];
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
}

interface TemplateEditorProps {
  template: TemplateConfig;
  onChange: (template: TemplateConfig) => void;
}

const sectionTypes = [
  { value: 'header', label: 'Company Header', icon: '🏢' },
  { value: 'title', label: 'Certificate Title', icon: '📋' },
  { value: 'certificate-number', label: 'Certificate Number', icon: '🏷️' },
  { value: 'data-table', label: 'Data Table', icon: '📊' },
  { value: 'items-table', label: 'Items Table', icon: '📋' },
  { value: 'defects', label: 'Defects & Recommendations', icon: '⚠️' },
  { value: 'certification', label: 'Certification Statement', icon: '✅' },
  { value: 'signatures', label: 'Signatures', icon: '✍️' },
];

const fontOptions = [
  'Helvetica',
  'Arial',
  'Times',
  'Calibri',
  'Verdana',
];

export default function TemplateEditor({ template, onChange }: TemplateEditorProps) {
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('sections');

  const updateTemplate = useCallback((updates: Partial<TemplateConfig>) => {
    onChange({ ...template, ...updates });
  }, [template, onChange]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sections = Array.from(template.sections);
    const [reorderedSection] = sections.splice(result.source.index, 1);
    sections.splice(result.destination.index, 0, reorderedSection);

    // Update order values
    const updatedSections = sections.map((section, index) => ({
      ...section,
      order: index + 1,
    }));

    updateTemplate({ sections: updatedSections });
  };

  const updateSection = (sectionId: string, updates: Partial<Section>) => {
    const sections = template.sections.map(section =>
      section.id === sectionId ? { ...section, ...updates } : section
    );
    updateTemplate({ sections });
  };

  const updateSectionStyle = (sectionId: string, styleUpdates: Partial<Section['style']>) => {
    const sections = template.sections.map(section =>
      section.id === sectionId 
        ? { ...section, style: { ...section.style, ...styleUpdates } }
        : section
    );
    updateTemplate({ sections });
  };

  const addSection = (type: string) => {
    const newSection: Section = {
      id: `${type}-${Date.now()}`,
      type,
      title: sectionTypes.find(t => t.value === type)?.label || type,
      order: template.sections.length + 1,
      visible: true,
      style: {
        backgroundColor: '#f8f9fa',
        textColor: '#000000',
        fontSize: 10,
        padding: 15,
        margin: 5,
      },
    };

    updateTemplate({ sections: [...template.sections, newSection] });
  };

  const deleteSection = (sectionId: string) => {
    const sections = template.sections.filter(section => section.id !== sectionId);
    updateTemplate({ sections });
  };

  const updateColors = (colorUpdates: Partial<TemplateConfig['colors']>) => {
    updateTemplate({ colors: { ...template.colors, ...colorUpdates } });
  };

  const updateFonts = (fontUpdates: Partial<TemplateConfig['fonts']>) => {
    updateTemplate({ fonts: { ...template.fonts, ...fontUpdates } });
  };

  const updateLayout = (layoutUpdates: Partial<TemplateConfig['layout']>) => {
    updateTemplate({ layout: { ...template.layout, ...layoutUpdates } });
  };

  const selectedSectionData = selectedSection 
    ? template.sections.find(s => s.id === selectedSection)
    : null;

  return (
    <div className="flex h-full gap-4">
      {/* Main Editor Panel */}
      <div className="flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="sections">Sections</TabsTrigger>
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="fonts">Typography</TabsTrigger>
            <TabsTrigger value="layout">Layout</TabsTrigger>
          </TabsList>

          <TabsContent value="sections" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Certificate Sections</h3>
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Section
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56">
                  <div className="space-y-2">
                    <h4 className="font-medium">Select Section Type</h4>
                    {sectionTypes.map((type) => (
                      <Button
                        key={type.value}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => addSection(type.value)}
                      >
                        <span className="mr-2">{type.icon}</span>
                        {type.label}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="sections">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                    {template.sections.map((section, index) => (
                      <Draggable key={section.id} draggableId={section.id} index={index}>
                        {(provided) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`cursor-pointer transition-colors ${
                              selectedSection === section.id ? 'ring-2 ring-blue-500' : ''
                            }`}
                            onClick={() => setSelectedSection(section.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <div {...provided.dragHandleProps}>
                                  <GripVertical className="h-4 w-4 text-gray-400" />
                                </div>
                                
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{section.title}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {section.type}
                                    </Badge>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={section.visible}
                                    onCheckedChange={(visible) => updateSection(section.id, { visible })}
                                    aria-label={`Toggle ${section.title} visibility`}
                                  />
                                  {section.visible ? (
                                    <Eye className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <EyeOff className="h-4 w-4 text-gray-400" />
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteSection(section.id);
                                    }}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </TabsContent>

          <TabsContent value="colors" className="space-y-6">
            <h3 className="text-lg font-medium">Color Scheme</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(template.colors).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <Label className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-10 p-1">
                        <div 
                          className="w-full h-full rounded border"
                          style={{ backgroundColor: value }}
                        />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64">
                      <HexColorPicker
                        color={value}
                        onChange={(color) => updateColors({ [key]: color } as any)}
                      />
                      <Input
                        value={value}
                        onChange={(e) => updateColors({ [key]: e.target.value } as any)}
                        className="mt-2"
                        placeholder="#000000"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="fonts" className="space-y-6">
            <h3 className="text-lg font-medium">Typography</h3>
            <div className="space-y-4">
              <div>
                <Label>Heading Font</Label>
                <Select 
                  value={template.fonts.heading} 
                  onValueChange={(value) => updateFonts({ heading: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontOptions.map((font) => (
                      <SelectItem key={font} value={font}>{font}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Body Font</Label>
                <Select 
                  value={template.fonts.body} 
                  onValueChange={(value) => updateFonts({ body: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontOptions.map((font) => (
                      <SelectItem key={font} value={font}>{font}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Font Sizes</Label>
                {Object.entries(template.fonts.size).map(([size, value]) => (
                  <div key={size} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="capitalize text-sm">{size}</span>
                      <span className="text-sm text-gray-500">{value}pt</span>
                    </div>
                    <Slider
                      value={[value]}
                      onValueChange={([newValue]) => 
                        updateFonts({ 
                          size: { ...template.fonts.size, [size]: newValue } 
                        })
                      }
                      min={6}
                      max={24}
                      step={1}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="layout" className="space-y-6">
            <h3 className="text-lg font-medium">Layout Settings</h3>
            <div className="space-y-4">
              <div>
                <Label>Page Margins</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {Object.entries(template.layout.margins).map(([side, value]) => (
                    <div key={side} className="space-y-1">
                      <Label className="text-xs capitalize">{side}</Label>
                      <Input
                        type="number"
                        value={value}
                        onChange={(e) => updateLayout({
                          margins: { 
                            ...template.layout.margins, 
                            [side]: parseInt(e.target.value) || 0 
                          }
                        })}
                        min="0"
                        max="50"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Section Spacing</Label>
                  <span className="text-sm text-gray-500">{template.layout.spacing}pt</span>
                </div>
                <Slider
                  value={[template.layout.spacing]}
                  onValueChange={([value]) => updateLayout({ spacing: value })}
                  min={5}
                  max={30}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Section Properties Sidebar */}
      {selectedSectionData && (
        <div className="w-80">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Section Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Section Title</Label>
                <Input
                  value={selectedSectionData.title}
                  onChange={(e) => updateSection(selectedSection!, { title: e.target.value })}
                />
              </div>

              <div className="space-y-3">
                <Label>Background Color</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-8 p-1">
                      <div 
                        className="w-full h-full rounded border"
                        style={{ backgroundColor: selectedSectionData.style.backgroundColor }}
                      />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <HexColorPicker
                      color={selectedSectionData.style.backgroundColor || '#ffffff'}
                      onChange={(color) => updateSectionStyle(selectedSection!, { backgroundColor: color })}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-3">
                <Label>Text Color</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-8 p-1">
                      <div 
                        className="w-full h-full rounded border"
                        style={{ backgroundColor: selectedSectionData.style.textColor }}
                      />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <HexColorPicker
                      color={selectedSectionData.style.textColor || '#000000'}
                      onChange={(color) => updateSectionStyle(selectedSection!, { textColor: color })}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Font Size</Label>
                  <span className="text-sm text-gray-500">{selectedSectionData.style.fontSize}pt</span>
                </div>
                <Slider
                  value={[selectedSectionData.style.fontSize || 10]}
                  onValueChange={([value]) => updateSectionStyle(selectedSection!, { fontSize: value })}
                  min={6}
                  max={24}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Padding</Label>
                  <span className="text-sm text-gray-500">{selectedSectionData.style.padding}pt</span>
                </div>
                <Slider
                  value={[selectedSectionData.style.padding || 10]}
                  onValueChange={([value]) => updateSectionStyle(selectedSection!, { padding: value })}
                  min={0}
                  max={50}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Margin</Label>
                  <span className="text-sm text-gray-500">{selectedSectionData.style.margin}pt</span>
                </div>
                <Slider
                  value={[selectedSectionData.style.margin || 5]}
                  onValueChange={([value]) => updateSectionStyle(selectedSection!, { margin: value })}
                  min={0}
                  max={30}
                  step={1}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 