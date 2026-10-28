import { getUser, getTeamForUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { teams } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { deleteObjectFromR2, downloadFromR2 } from '@/lib/storage/r2';
import { resolveTeamLogoDataUri, storeTeamLogoFromDataUri } from '@/lib/storage/team-logo';

const MAX_LOGO_BYTES = 1024 * 1024;

/**
 * Serves the signed-in team's logo. The object key is never taken from the URL:
 * the team is resolved from the session, so one team can never read another's
 * asset by guessing a key.
 */
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const team = await getTeamForUser();
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    if (team.logoR2Key) {
      const object = await downloadFromR2(team.logoR2Key);

      if (object) {
        return new NextResponse(new Uint8Array(object.body), {
          status: 200,
          headers: {
            'Content-Type': object.contentType ?? 'image/png',
            'Cache-Control': 'private, max-age=300',
          },
        });
      }
    }

    // Rows saved before the move to R2 still hold the image inline.
    const dataUri = await resolveTeamLogoDataUri(team);

    if (!dataUri) {
      return NextResponse.json({ error: 'No logo set' }, { status: 404 });
    }

    const [meta, base64] = dataUri.split(',');
    const contentType = meta.slice(meta.indexOf(':') + 1).replace(';base64', '') || 'image/png';

    return new NextResponse(Buffer.from(base64, 'base64'), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error) {
    console.error('Error reading logo:', error);
    return NextResponse.json({ error: 'Failed to read logo' }, { status: 500 });
  }
}

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

    if (!logoDataUri.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image data format' }, { status: 400 });
    }

    const sizeInBytes = Buffer.byteLength(logoDataUri, 'utf8');
    if (sizeInBytes > MAX_LOGO_BYTES) {
      return NextResponse.json({ error: 'Image is too large (max 1MB)' }, { status: 400 });
    }

    // The image itself lives in R2; the row keeps only the object key so team
    // rows stay small and are cheap to select everywhere.
    const stored = await storeTeamLogoFromDataUri(team.id, logoDataUri);

    await db
      .update(teams)
      .set({
        logoR2Key: stored.key,
        logoDataUri: null,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, team.id));

    return NextResponse.json({
      success: true,
      message: 'Logo uploaded successfully',
      key: stored.key,
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const team = await getTeamForUser();
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    if (team.logoR2Key) {
      try {
        await deleteObjectFromR2(team.logoR2Key);
      } catch (error) {
        // The row is cleared regardless: an orphaned object is harmless, a row
        // pointing at a deleted object is not.
        console.warn('Unable to delete team logo object:', error);
      }
    }

    await db
      .update(teams)
      .set({
        logoDataUri: null,
        logoR2Key: null,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, team.id));

    return NextResponse.json({ success: true, message: 'Logo deleted successfully' });
  } catch (error) {
    console.error('Error deleting logo:', error);
    return NextResponse.json({ error: 'Failed to delete logo' }, { status: 500 });
  }
}
