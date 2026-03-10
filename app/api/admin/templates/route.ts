import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { certificateTemplates } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  certificateType: z.enum(['BS5839-1', 'BS5839-6', 'BS5266', 'FIRE_EXTINGUISHER', 'DRY_RISER']),
  description: z.string().optional(),
  template: z.object({
    sections: z.array(z.object({
      id: z.string(),
      type: z.string(),
      title: z.string(),
      order: z.number(),
      visible: z.boolean(),
      style: z.object({
        backgroundColor: z.string().optional(),
        textColor: z.string().optional(),
        fontSize: z.number().optional(),
        padding: z.number().optional(),
        margin: z.number().optional(),
      }).optional(),
    })),
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
  }),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (user.role !== 'supersystemAdmin' && user.role !== 'systemAdmin' && user.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const certificateType = searchParams.get('type');

    let whereConditions = [];
    
    if (certificateType) {
      whereConditions.push(eq(certificateTemplates.certificateType, certificateType));
    }

    const templates = await db
      .select()
      .from(certificateTemplates)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(certificateTemplates.createdAt);

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (user.role !== 'supersystemAdmin' && user.role !== 'systemAdmin' && user.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createTemplateSchema.parse(body);

    const newTemplate = await db
      .insert(certificateTemplates)
      .values({
        teamId: user.teamId || 1, // Fallback to team 1 for admin templates
        name: validatedData.name,
        certificateType: validatedData.certificateType,
        description: validatedData.description || null,
        template: validatedData.template,
        createdBy: user.id,
        isDefault: false,
        isActive: true,
        version: 1,
      })
      .returning();

    return NextResponse.json(newTemplate[0], { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 