import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { certificateTemplates } from '@/lib/db/schema';
import { isAdminRole } from '@/lib/auth/roles';
import { getUser } from '@/lib/db/queries';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').optional(),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  // Accept any well-formed template JSON — sections vary by certificate type
  // (some use 'title', others use 'label'; some have 'config', others 'style')
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
  }).optional(),
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
        details: error.errors 
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
