/**
 * ServiceM8 Jobs API
 * 
 * GET - List jobs from ServiceM8
 * POST - Sync a certificate to a ServiceM8 job
 */

import { NextRequest, NextResponse } from 'next/server';
import { ServiceM8Client_API } from '@/lib/servicem8/client';
import { db } from '@/lib/db/drizzle';
import { servicem8JobMappings, certificates, customers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getUser, getTeamForUser } from '@/lib/db/queries';

async function getTeamId(): Promise<number | null> {
  const user = await getUser();
  if (!user) return null;
  const team = await getTeamForUser();
  return team?.id ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const teamId = await getTeamId();
    if (!teamId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const client = await ServiceM8Client_API.fromTeamId(teamId);
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
    const teamId = await getTeamId();
    if (!teamId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const client = await ServiceM8Client_API.fromTeamId(teamId);
    if (!client) {
      return NextResponse.json({ error: 'ServiceM8 not connected' }, { status: 400 });
    }

    const body = await request.json();
    const { certificateId, servicem8JobUuid, action } = body;

    if (action === 'link') {
      // Link an existing ServiceM8 job to a certificate
      if (!certificateId || !servicem8JobUuid) {
        return NextResponse.json({ error: 'certificateId and servicem8JobUuid required' }, { status: 400 });
      }

      // Check if mapping already exists
      const existing = await db
        .select()
        .from(servicem8JobMappings)
        .where(
          and(
            eq(servicem8JobMappings.teamId, teamId),
            eq(servicem8JobMappings.certificateId, certificateId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(servicem8JobMappings)
          .set({
            servicem8JobUuid,
            syncStatus: 'synced',
            lastSyncAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(servicem8JobMappings.id, existing[0].id));
      } else {
        await db.insert(servicem8JobMappings).values({
          teamId,
          certificateId,
          servicem8JobUuid,
          syncStatus: 'synced',
          lastSyncAt: new Date(),
        });
      }

      return NextResponse.json({ success: true, message: 'Job linked' });
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
            eq(certificates.teamId, teamId)
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

      // Create mapping
      await db.insert(servicem8JobMappings).values({
        teamId,
        certificateId,
        servicem8JobUuid: result.uuid,
        syncStatus: 'synced',
        lastSyncAt: new Date(),
      });

      return NextResponse.json({ success: true, jobUuid: result.uuid });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error syncing ServiceM8 job:', error);
    return NextResponse.json({ error: 'Failed to sync job' }, { status: 500 });
  }
}
