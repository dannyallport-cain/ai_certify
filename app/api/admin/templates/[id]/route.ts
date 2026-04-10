import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { certificateTemplates } from '@/lib/db/schema';
import { isAdminRole } from '@/lib/auth/roles';
import { getUser } from '@/lib/db/queries';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const templateElementTypeSchema = z.enum([
  'static-text',
  'dynamic-text',
  'rectangle',
  'line',
  'image',
]);

const templateElementBaseSchema = z.object({
  id: z.string(),
  type: templateElementTypeSchema,
  x: z.number(),
  y: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  zIndex: z.number().optional(),
  rotation: z.number().optional(),
  opacity: z.number().min(0).max(1).optional(),
  locked: z.boolean().optional(),
  pageId: z.string().optional(),
  style: z.record(z.any()).default({}),
}).passthrough();

const templateElementSchema = z.discriminatedUnion('type', [
  templateElementBaseSchema.extend({
    type: z.literal('static-text'),
    text: z.string(),
    fontSize: z.number().optional(),
    fontFamily: z.string().optional(),
    fontWeight: z.string().optional(),
    color: z.string().optional(),
    align: z.enum(['left', 'center', 'right']).optional(),
  }),
  templateElementBaseSchema.extend({
    type: z.literal('dynamic-text'),
    field: z.string().optional(),
    fieldKey: z.string().optional(),
    sampleText: z.string().optional(),
    text: z.string().optional(),
    fontSize: z.number().optional(),
    fontFamily: z.string().optional(),
    fontWeight: z.string().optional(),
    color: z.string().optional(),
    align: z.enum(['left', 'center', 'right']).optional(),
  }),
  templateElementBaseSchema.extend({
    type: z.literal('rectangle'),
    fill: z.string().optional(),
    stroke: z.string().optional(),
    strokeWidth: z.number().optional(),
    cornerRadius: z.number().optional(),
  }),
  templateElementBaseSchema.extend({
    type: z.literal('line'),
    points: z.array(z.number()).min(4).optional(),
    stroke: z.string().optional(),
    strokeWidth: z.number().optional(),
  }),
  templateElementBaseSchema.extend({
    type: z.literal('image'),
    src: z.string().optional(),
  }),
]);

const pageCanvasSchema = z.object({
  width: z.number(),
  height: z.number(),
  backgroundColor: z.string().optional(),
  snapToGrid: z.boolean().optional(),
  gridSize: z.number().optional(),
  showGrid: z.boolean().optional(),
  pagePadding: z.number().optional(),
}).passthrough();

const templatePageSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  order: z.number().optional(),
  canvas: pageCanvasSchema,
}).passthrough();

const legacyCanvasSchema = z.object({
  width: z.number(),
  height: z.number(),
  backgroundColor: z.string().optional(),
  backgroundImage: z.string().optional(),
  backgroundImageScaleX: z.number().optional(),
  backgroundImageScaleY: z.number().optional(),
  backgroundImageX: z.number().optional(),
  backgroundImageY: z.number().optional(),
  pagePadding: z.number().optional(),
}).passthrough();

const dragDropEditorSchema = z.object({
  version: z.number().optional(),
  activePageId: z.string().optional(),
  canvas: legacyCanvasSchema.optional(),
  elements: z.array(templateElementSchema).optional(),
  pages: z.array(templatePageSchema).optional(),
}).passthrough().superRefine((value, ctx) => {
  const hasLegacyShape = !!value.canvas || !!value.elements;
  const hasMultiPageShape = !!value.pages;

  if (!hasLegacyShape && !hasMultiPageShape) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'dragDropEditor must include either legacy canvas/elements or pages',
    });
  }
});

const updateTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').optional(),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  certificateType: z.enum(['BS5839-1', 'BS5839-6', 'BS5266', 'FIRE_EXTINGUISHER', 'DRY_RISER', 'CP12', 'EICR']).optional(),
  template: z.object({
    sections: z.array(
      z.object({
        id: z.string(),
        type: z.string(),
        order: z.number(),
        visible: z.boolean(),
      }).passthrough()
    ),
    colors: z.object({
      primary: z.string(),
      secondary: z.string(),
      accent: z.string(),
      background: z.string(),
      text: z.string(),
    }),
    fonts: z.object({
      heading: z.string(),
      body: z.string(),
      size: z.object({
        small: z.number(),
        medium: z.number(),
        large: z.number(),
      }),
    }),
    layout: z.object({
      margins: z.object({
        top: z.number(),
        right: z.number(),
        bottom: z.number(),
        left: z.number(),
      }),
      spacing: z.number(),
    }),
    dragDropEditor: dragDropEditorSchema.optional(),
  }).passthrough().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const resolvedParams = await params;
    const templateId = parseInt(resolvedParams.id);

    if (isNaN(templateId)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    const template = await db
      .select()
      .from(certificateTemplates)
      .where(eq(certificateTemplates.id, templateId))
      .limit(1);

    if (!template.length) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json(template[0]);
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const resolvedParams = await params;
    const templateId = parseInt(resolvedParams.id);

    if (isNaN(templateId)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = updateTemplateSchema.parse(body);

    // First, check if template exists
    const existingTemplate = await db
      .select()
      .from(certificateTemplates)
      .where(eq(certificateTemplates.id, templateId))
      .limit(1);

    if (!existingTemplate.length) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Update the template
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.isDefault !== undefined) updateData.isDefault = validatedData.isDefault;
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;
    if (validatedData.certificateType !== undefined) updateData.certificateType = validatedData.certificateType;
    if (validatedData.template !== undefined) {
      updateData.template = validatedData.template;
      updateData.version = (existingTemplate[0].version ?? 0) + 1;
    }

    const updatedTemplate = await db
      .update(certificateTemplates)
      .set(updateData)
      .where(eq(certificateTemplates.id, templateId))
      .returning();

    return NextResponse.json(updatedTemplate[0]);
  } catch (error) {
    console.error('Error updating template:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors,
      }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const resolvedParams = await params;
    const templateId = parseInt(resolvedParams.id);

    if (isNaN(templateId)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    // Check if template exists
    const existingTemplate = await db
      .select()
      .from(certificateTemplates)
      .where(eq(certificateTemplates.id, templateId))
      .limit(1);

    if (!existingTemplate.length) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Don't allow deletion of default templates
    if (existingTemplate[0].isDefault) {
      return NextResponse.json({
        error: 'Cannot delete default template'
      }, { status: 400 });
    }

    await db
      .delete(certificateTemplates)
      .where(eq(certificateTemplates.id, templateId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
