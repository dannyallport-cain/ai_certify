/**
 * ServiceM8 Webhook Endpoint
 * 
 * Receives webhook notifications from ServiceM8 when jobs or clients change.
 * This allows real-time sync from ServiceM8 to our system.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { servicem8Connections, servicem8JobMappings, servicem8ClientMappings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // ServiceM8 sends webhooks with these fields:
    // - entry: Array of changes
    // - object: The type of object that changed
    const { entry, object } = body;

    if (!entry || !Array.isArray(entry)) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    for (const change of entry) {
      const { uuid, type, account_uuid } = change;

      // Find the team associated with this ServiceM8 account
      const connections = await db
        .select()
        .from(servicem8Connections)
        .where(eq(servicem8Connections.servicem8AccountUuid, account_uuid))
        .limit(1);

      if (connections.length === 0) {
        console.warn(`No connection found for ServiceM8 account: ${account_uuid}`);
        continue;
      }

      const connection = connections[0];
      if (!connection.syncEnabled) continue;

      // Handle different webhook types
      switch (type) {
        case 'job':
          await handleJobWebhook(connection.teamId, uuid);
          break;
        case 'company':
          await handleClientWebhook(connection.teamId, uuid);
          break;
        default:
          console.log(`Unhandled webhook type: ${type}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('ServiceM8 webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleJobWebhook(teamId: number, jobUuid: string) {
  // Mark the mapping as needing sync
  await db
    .update(servicem8JobMappings)
    .set({
      syncStatus: 'pending',
      updatedAt: new Date(),
    })
    .where(eq(servicem8JobMappings.servicem8JobUuid, jobUuid));
}

async function handleClientWebhook(teamId: number, companyUuid: string) {
  // Mark the mapping as needing sync
  await db
    .update(servicem8ClientMappings)
    .set({
      syncStatus: 'pending',
      updatedAt: new Date(),
    })
    .where(eq(servicem8ClientMappings.servicem8CompanyUuid, companyUuid));
}
