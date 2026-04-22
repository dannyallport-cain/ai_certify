/**
 * ServiceM8 Connection Management API
 *
 * GET  - Get connection status for current user
 * DELETE - Disconnect ServiceM8 from current user
 * PATCH - Update sync settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { servicem8Connections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getUser, getTeamForUser } from '@/lib/db/queries';

async function getServiceM8Context(): Promise<{ userId: number; teamId: number } | null> {
  const user = await getUser();
  if (!user) return null;

  const team = await getTeamForUser();
  if (!team) return null;

  return {
    userId: user.id,
    teamId: team.id,
  };
}

export async function GET() {
  try {
    const context = await getServiceM8Context();
    if (!context) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const connections = await db
      .select({
        id: servicem8Connections.id,
        isActive: servicem8Connections.isActive,
        servicem8CompanyName: servicem8Connections.servicem8CompanyName,
        syncEnabled: servicem8Connections.syncEnabled,
        syncDirection: servicem8Connections.syncDirection,
        lastSyncAt: servicem8Connections.lastSyncAt,
        createdAt: servicem8Connections.createdAt,
        updatedAt: servicem8Connections.updatedAt,
        userId: servicem8Connections.userId,
        teamId: servicem8Connections.teamId,
      })
      .from(servicem8Connections)
      .where(eq(servicem8Connections.userId, context.userId))
      .limit(1);

    if (connections.length === 0) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      connection: connections[0],
    });
  } catch (error) {
    console.error('Error fetching ServiceM8 connection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const context = await getServiceM8Context();
    if (!context) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await db
      .delete(servicem8Connections)
      .where(eq(servicem8Connections.userId, context.userId));

    return NextResponse.json({ success: true, message: 'ServiceM8 disconnected' });
  } catch (error) {
    console.error('Error disconnecting ServiceM8:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await getServiceM8Context();
    if (!context) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { syncEnabled, syncDirection } = body;

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (typeof syncEnabled === 'boolean') updates.syncEnabled = syncEnabled;
    if (syncDirection && ['to_servicem8', 'from_servicem8', 'bidirectional'].includes(syncDirection)) {
      updates.syncDirection = syncDirection;
    }

    await db
      .update(servicem8Connections)
      .set(updates)
      .where(eq(servicem8Connections.userId, context.userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating ServiceM8 settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
