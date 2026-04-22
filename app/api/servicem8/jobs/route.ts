/**
 * ServiceM8 Jobs API
 *
 * GET - List jobs from ServiceM8
 * POST - Link or create a ServiceM8 job for a certificate, then process sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';

import { ServiceM8Client_API } from '@/lib/servicem8/client';
import { processServiceM8JobMapping } from '@/lib/servicem8/sync';
import { db } from '@/lib/db/drizzle';
import { servicem8JobMappings, certificates } from '@/lib/db/schema';
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

export async function GET(request: NextRequest) {
  try {
    const context = await getServiceM8Context();
    if (!context) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const client = await ServiceM8Client_API.fromUserId(context.userId);
    if (!client) {
      return NextResponse.json({ error: 'ServiceM8 not connected' }, { status: 400 });
    }

    const status = request.nextUrl.searchParams.get('status');
    let filter: string | undefined;
    if (status) {
      filter = `status eq '${status}'`;
    }

    const jobs = await client.getJobs(filter);

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('Error fetching ServiceM8 jobs:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getServiceM8Context();
    if (!context) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const client = await ServiceM8Client_API.fromUserId(context.userId);
    if (!client) {
      return NextResponse.json({ error: 'ServiceM8 not connected' }, { status: 400 });
    }

    const body = await request.json();
    const { certificateId, servicem8JobUuid, action } = body;

    if (action === 'link') {
      if (!certificateId || !servicem8JobUuid) {
        return NextResponse.json(
          { error: 'certificateId and servicem8JobUuid required' },
          { status: 400 }
        );
      }

      const existing = await db
        .select({ id: servicem8JobMappings.id })
        .from(servicem8JobMappings)
        .where(
          and(
            eq(servicem8JobMappings.teamId, context.teamId),
            eq(servicem8JobMappings.certificateId, certificateId)
          )
        )
        .limit(1);

      let mappingId: number;

      if (existing.length > 0) {
        mappingId = existing[0].id;

        await db
          .update(servicem8JobMappings)
          .set({
            servicem8ConnectionUserId: context.userId,
            servicem8JobUuid,
            syncStatus: 'pending',
            lastSyncAt: null,
            updatedAt: new Date(),
          })
          .where(eq(servicem8JobMappings.id, mappingId));
      } else {
        const inserted = await db
          .insert(servicem8JobMappings)
          .values({
            teamId: context.teamId,
            servicem8ConnectionUserId: context.userId,
            certificateId,
            servicem8JobUuid,
            syncStatus: 'pending',
            lastSyncAt: null,
          })
          .returning({ id: servicem8JobMappings.id });

        mappingId = inserted[0].id;
      }

      const syncResult = await processServiceM8JobMapping(mappingId);

      return NextResponse.json({
        success: syncResult.syncStatus !== 'error',
        message: 'Job linked',
        sync: syncResult,
      });
    }

    if (action === 'create') {
      // Create a new ServiceM8 job from a certificate
      if (!certificateId) {
        return NextResponse.json({ error: 'certificateId required' }, { status: 400 });
      }

      const cert = await db
        .select()
        .from(certificates)
        .where(
          and(
            eq(certificates.id, certificateId),
            eq(certificates.teamId, context.teamId)
          )
        )
        .limit(1);

      if (cert.length === 0) {
        return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
      }

      const certificate = cert[0];

      // Build the job data
      const jobData: Record<string, any> = {
        job_address: certificate.siteAddress || '',
        job_description: `${certificate.certificateType} - ${certificate.certificateNumber}`,
        status: certificate.status === 'completed' ? 'Completed' : 'Quote',
      };

      if (certificate.inspectionDate) {
        jobData.date = certificate.inspectionDate;
      }

      const result = await client.createJob(jobData);

      const inserted = await db
        .insert(servicem8JobMappings)
        .values({
          teamId: context.teamId,
          servicem8ConnectionUserId: context.userId,
          certificateId,
          servicem8JobUuid: result.uuid,
          syncStatus: 'pending',
          lastSyncAt: null,
        })
        .returning({ id: servicem8JobMappings.id });

      const syncResult = await processServiceM8JobMapping(inserted[0].id);

      return NextResponse.json({
        success: syncResult.syncStatus !== 'error',
        jobUuid: result.uuid,
        sync: syncResult,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error syncing ServiceM8 job:', error);
    return NextResponse.json({ error: 'Failed to sync job' }, { status: 500 });
  }
}
