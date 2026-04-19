import { getUser, getTeamForUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { teams } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const team = await getTeamForUser();
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const body = await request.json();
    const { logoDataUri } = body as { logoDataUri: string };

    if (!logoDataUri) {
      return NextResponse.json({ error: 'Logo data is required' }, { status: 400 });
    }

    // Validate that it's a data URL
    if (!logoDataUri.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image data format' }, { status: 400 });
    }

    // Check size - limit to 1MB
    const sizeInBytes = Buffer.byteLength(logoDataUri, 'utf8');
    if (sizeInBytes > 1024 * 1024) {
      return NextResponse.json({ error: 'Image is too large (max 1MB)' }, { status: 400 });
    }

    // Update the team with the logo
    await db
      .update(teams)
      .set({
        logoDataUri,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, team.id));

    return NextResponse.json({
      success: true,
      message: 'Logo uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    return NextResponse.json(
      { error: 'Failed to upload logo' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const team = await getTeamForUser();
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Remove the logo
    await db
      .update(teams)
      .set({
        logoDataUri: null,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, team.id));

    return NextResponse.json({
      success: true,
      message: 'Logo deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting logo:', error);
    return NextResponse.json(
      { error: 'Failed to delete logo' },
      { status: 500 }
    );
  }
}
