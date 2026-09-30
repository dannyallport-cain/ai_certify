/**
 * ServiceM8 Clients API.
 *
 * GET  - List clients from ServiceM8, fully enriched.
 * POST - Import, link or export clients.
 *
 * The previous implementation fetched contacts once per client and threw the
 * results away whenever a mapping already existed, so re-importing never filled
 * in the blanks. Contacts and images now come from a single bulk load, and an
 * import refreshes records that are already mapped.
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { getUser, getTeamForUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { customers, servicem8ClientMappings } from '@/lib/db/schema';
import { ServiceM8Client_API } from '@/lib/servicem8/client';
import {
  getServiceM8ClientDirectory,
  invalidateServiceM8DirectoryCache,
} from '@/lib/servicem8/directory';
import { mapServiceM8ClientToCustomer } from '@/lib/servicem8/client-mapping';
import type { ServiceM8ClientRecord } from '@/lib/servicem8/types';

async function getServiceM8Context(): Promise<{ userId: number; teamId: number } | null> {
  const user = await getUser();
  if (!user) return null;

  const team = await getTeamForUser();
  if (!team) return null;

  return { userId: user.id, teamId: team.id };
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

    const directory = await getServiceM8ClientDirectory(client);

    return NextResponse.json({
      clients: directory.clients,
      total: directory.clients.length,
      warnings: directory.warnings,
    });
  } catch (error) {
    console.error('Error fetching ServiceM8 clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

async function importClient(
  record: ServiceM8ClientRecord,
  context: { userId: number; teamId: number },
  refreshExisting: boolean,
): Promise<'imported' | 'updated' | 'skipped'> {
  const fields = mapServiceM8ClientToCustomer(record);

  const existingMapping = await db
    .select({
      id: servicem8ClientMappings.id,
      customerId: servicem8ClientMappings.customerId,
    })
    .from(servicem8ClientMappings)
    .where(
      and(
        eq(servicem8ClientMappings.teamId, context.teamId),
        eq(servicem8ClientMappings.servicem8CompanyUuid, record.uuid),
      ),
    )
    .limit(1);

  const editDate = record.editDate ? new Date(record.editDate) : null;
  const resolvedEditDate = editDate && !Number.isNaN(editDate.getTime()) ? editDate : null;

  if (existingMapping.length > 0) {
    const mapping = existingMapping[0];

    if (!refreshExisting) {
      // Still refresh the stored snapshot so cached detail is never stale.
      await db
        .update(servicem8ClientMappings)
        .set({
          companyData: record,
          servicem8EditDate: resolvedEditDate,
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(servicem8ClientMappings.id, mapping.id));

      return 'skipped';
    }

    await db
      .update(customers)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(customers.id, mapping.customerId));

    await db
      .update(servicem8ClientMappings)
      .set({
        servicem8ConnectionUserId: context.userId,
        companyData: record,
        servicem8EditDate: resolvedEditDate,
        syncStatus: 'synced',
        lastSyncAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(servicem8ClientMappings.id, mapping.id));

    return 'updated';
  }

  const [insertedCustomer] = await db
    .insert(customers)
    .values({ teamId: context.teamId, ...fields })
    .returning({ id: customers.id });

  await db.insert(servicem8ClientMappings).values({
    teamId: context.teamId,
    servicem8ConnectionUserId: context.userId,
    customerId: insertedCustomer.id,
    servicem8CompanyUuid: record.uuid,
    companyData: record,
    servicem8EditDate: resolvedEditDate,
    syncStatus: 'synced',
    lastSyncAt: new Date(),
  });

  return 'imported';
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
      // Defaults to refreshing already-imported clients, because leaving them
      // alone is exactly what kept the blank contact details in place.
      const refreshExisting = body.refreshExisting !== false;

      const directory = await getServiceM8ClientDirectory(sm8Client, {
        includeContacts: true,
        includeImages: true,
      });

      let imported = 0;
      let updated = 0;
      let skipped = 0;

      for (const record of directory.clients) {
        const outcome = await importClient(record, context, refreshExisting);

        if (outcome === 'imported') imported += 1;
        else if (outcome === 'updated') updated += 1;
        else skipped += 1;
      }

      invalidateServiceM8DirectoryCache(context.teamId);

      const importedWithGaps = directory.clients.filter(
        (record) => !record.email && !record.phone && !record.mobile,
      ).length;

      return NextResponse.json({
        success: true,
        imported,
        updated,
        skipped,
        total: directory.clients.length,
        importedWithGaps,
        warnings: directory.warnings,
      });
    }

    if (action === 'link') {
      const { customerId, servicem8CompanyUuid } = body;
      if (!customerId || !servicem8CompanyUuid) {
        return NextResponse.json(
          { error: 'customerId and servicem8CompanyUuid required' },
          { status: 400 },
        );
      }

      const existing = await db
        .select({ id: servicem8ClientMappings.id })
        .from(servicem8ClientMappings)
        .where(
          and(
            eq(servicem8ClientMappings.teamId, context.teamId),
            eq(servicem8ClientMappings.customerId, customerId),
          ),
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
      const { customerId } = body;
      if (!customerId) {
        return NextResponse.json({ error: 'customerId required' }, { status: 400 });
      }

      const customerRows = await db
        .select()
        .from(customers)
        .where(and(eq(customers.id, customerId), eq(customers.teamId, context.teamId)))
        .limit(1);

      if (customerRows.length === 0) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }

      const customer = customerRows[0];

      // Contact details belong on the client's CompanyContact, which
      // `createClient` writes for us.
      const result = await sm8Client.createClient({
        name: customer.name,
        address: customer.address ?? '',
        address_postcode: customer.postcode ?? '',
        email: customer.email ?? '',
        phone: customer.phone ?? '',
        mobile: customer.mobile ?? customer.phone ?? '',
        first_name: customer.firstName ?? customer.contactPerson ?? '',
        last_name: customer.lastName ?? '',
      });

      await db.insert(servicem8ClientMappings).values({
        teamId: context.teamId,
        servicem8ConnectionUserId: context.userId,
        customerId,
        servicem8CompanyUuid: result.uuid,
        syncStatus: 'synced',
        lastSyncAt: new Date(),
      });

      invalidateServiceM8DirectoryCache(context.teamId);

      return NextResponse.json({ success: true, companyUuid: result.uuid });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error syncing ServiceM8 clients:', error);
    const message = error instanceof Error ? error.message : 'Failed to sync clients';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
