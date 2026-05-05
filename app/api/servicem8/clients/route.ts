/**
 * ServiceM8 Clients Sync API
 * 
 * GET - List clients from ServiceM8
 * POST - Sync clients between ServiceM8 and local database
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { servicem8ClientMappings, customers } from '@/lib/db/schema';
import { ServiceM8Client_API } from '@/lib/servicem8/client';
import {
  loadServiceM8ContactDetails,
  normalizeServiceM8Client,
} from '@/app/api/mobile/servicem8/_shared';

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

    const client = await ServiceM8Client_API.fromUserId(context.userId);
    if (!client) {
      return NextResponse.json({ error: 'ServiceM8 not connected' }, { status: 400 });
    }

    const clients = await client.getClients('active eq 1');
    const enrichedClients = await Promise.all(
      clients.map(async (serviceM8Client) => {
        const contactDetails = await loadServiceM8ContactDetails(client, serviceM8Client.uuid);
        return normalizeServiceM8Client(serviceM8Client, contactDetails);
      }),
    );

    return NextResponse.json({ clients: enrichedClients });
  } catch (error) {
    console.error('Error fetching ServiceM8 clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getServiceM8Context();
    if (!context) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sm8Client = await ServiceM8Client_API.fromUserId(context.userId);
    if (!sm8Client) {
      return NextResponse.json({ error: 'ServiceM8 not connected' }, { status: 400 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'import_all') {
      // Import all ServiceM8 clients as local customers
      const sm8Clients = await sm8Client.getClients('active eq 1');
      
      let imported = 0;
      let skipped = 0;

      for (const c of sm8Clients) {
        // Check if already mapped
        const existing = await db
          .select()
          .from(servicem8ClientMappings)
          .where(
            and(
              eq(servicem8ClientMappings.teamId, context.teamId),
              eq(servicem8ClientMappings.servicem8CompanyUuid, c.uuid)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          skipped++;
          continue;
        }

        const contactDetails = await loadServiceM8ContactDetails(sm8Client, c.uuid);
        const normalizedClient = normalizeServiceM8Client(c, contactDetails);
        const contactPerson =
          [normalizedClient.firstName, normalizedClient.lastName].filter(Boolean).join(' ') ||
          null;

        const [newCustomer] = await db.insert(customers).values({
          teamId: context.teamId,
          name: normalizedClient.name || 'Unnamed Client',
          email: normalizedClient.email || null,
          phone: normalizedClient.phone || null,
          address: normalizedClient.address || null,
          postcode: normalizedClient.postcode || null,
          contactPerson,
        }).returning();

        // Create mapping
        await db.insert(servicem8ClientMappings).values({
          teamId: context.teamId,
          servicem8ConnectionUserId: context.userId,
          customerId: newCustomer.id,
          servicem8CompanyUuid: c.uuid,
          syncStatus: 'synced',
          lastSyncAt: new Date(),
        });

        imported++;
      }

      return NextResponse.json({
        success: true,
        imported,
        skipped,
        total: sm8Clients.length,
      });
    }

    if (action === 'link') {
      // Link a local customer to a ServiceM8 client
      const { customerId, servicem8CompanyUuid } = body;
      if (!customerId || !servicem8CompanyUuid) {
        return NextResponse.json({ error: 'customerId and servicem8CompanyUuid required' }, { status: 400 });
      }

      const existing = await db
        .select()
        .from(servicem8ClientMappings)
        .where(
          and(
            eq(servicem8ClientMappings.teamId, context.teamId),
            eq(servicem8ClientMappings.customerId, customerId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(servicem8ClientMappings)
          .set({
            servicem8ConnectionUserId: context.userId,
            servicem8CompanyUuid,
            syncStatus: 'synced',
            lastSyncAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(servicem8ClientMappings.id, existing[0].id));
      } else {
        await db.insert(servicem8ClientMappings).values({
          teamId: context.teamId,
          servicem8ConnectionUserId: context.userId,
          customerId,
          servicem8CompanyUuid,
          syncStatus: 'synced',
          lastSyncAt: new Date(),
        });
      }

      return NextResponse.json({ success: true, message: 'Client linked' });
    }

    if (action === 'export') {
      // Export a local customer to ServiceM8
      const { customerId } = body;
      if (!customerId) {
        return NextResponse.json({ error: 'customerId required' }, { status: 400 });
      }

      const customer = await db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.id, customerId),
            eq(customers.teamId, context.teamId)
          )
        )
        .limit(1);

      if (customer.length === 0) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }

      const c = customer[0];
      const result = await sm8Client.createClient({
        name: c.name,
        address: c.address || '',
        address_postcode: c.postcode || '',
        email: c.email || '',
        phone: c.phone || '',
        mobile: c.phone || '',
      });

      // Create mapping
      await db.insert(servicem8ClientMappings).values({
        teamId: context.teamId,
        servicem8ConnectionUserId: context.userId,
        customerId,
        servicem8CompanyUuid: result.uuid,
        syncStatus: 'synced',
        lastSyncAt: new Date(),
      });

      return NextResponse.json({ success: true, companyUuid: result.uuid });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error syncing ServiceM8 clients:', error);
    return NextResponse.json({ error: 'Failed to sync clients' }, { status: 500 });
  }
}
