/**
 * Links a fire alarm survey to a ServiceM8 job.
 *
 * This is the piece that removes the need to retype client details: picking a
 * job resolves its ServiceM8 client, mirrors that client into the local
 * `customers` table (reusing an existing import when there is one), and returns
 * the job's diary detail so the survey can be filed against it.
 */

import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { customers, servicem8ClientMappings } from '@/lib/db/schema';
import {
  ServiceM8Client_API,
  findServiceM8Client,
  mapServiceM8ClientToCustomer,
  normalizeServiceM8Job,
  type ServiceM8ClientRecord,
  type ServiceM8Job,
} from '@/lib/servicem8';

import { formatSurveyDate } from './format';
import type { FireAlarmSurveyServiceM8Link } from './types';

/** The link plus the local customer it resolved to. */
export interface ResolvedSurveyJobLink {
  customerId: number | null;
  customerName: string | null;
  serviceM8: FireAlarmSurveyServiceM8Link;
  /** True when a remote job resolved to a local client record. */
  clientResolved: boolean;
}

/**
 * Mirrors a ServiceM8 client into the local `customers` table.
 *
 * A client already mapped from a previous import is updated in place so the
 * same ServiceM8 company never produces duplicate customers. Returns the local
 * customer id, or null when the write failed (linking still proceeds without it).
 */
export async function ensureCustomerForServiceM8Client(input: {
  teamId: number;
  connectionUserId: number;
  client: ServiceM8ClientRecord;
}): Promise<number | null> {
  const { teamId, connectionUserId, client } = input;

  const existingMapping = await db
    .select()
    .from(servicem8ClientMappings)
    .where(
      and(
        eq(servicem8ClientMappings.teamId, teamId),
        eq(servicem8ClientMappings.servicem8CompanyUuid, client.uuid),
      ),
    )
    .limit(1);

  const mapped = existingMapping[0] ?? null;
  const mappedFields = mapServiceM8ClientToCustomer(client);
  const now = new Date();

  const customerValues = {
    teamId,
    name: mappedFields.name,
    email: mappedFields.email,
    phone: mappedFields.phone,
    mobile: mappedFields.mobile,
    address: mappedFields.address,
    postcode: mappedFields.postcode,
    contactPerson: mappedFields.contactPerson,
    firstName: mappedFields.firstName,
    lastName: mappedFields.lastName,
    website: mappedFields.website,
    abnNumber: mappedFields.abnNumber,
    billingAddress: mappedFields.billingAddress,
    billingPostcode: mappedFields.billingPostcode,
    billingAttention: mappedFields.billingAttention,
    updatedAt: now,
  };

  if (mapped) {
    const customerId = mapped.customerId;

    await db.update(customers).set(customerValues).where(eq(customers.id, customerId));

    await db
      .update(servicem8ClientMappings)
      .set({
        servicem8ConnectionUserId: connectionUserId,
        companyData: client,
        lastSyncAt: now,
        syncStatus: 'synced',
        lastError: null,
        updatedAt: now,
      })
      .where(eq(servicem8ClientMappings.id, mapped.id));

    return customerId;
  }

  const [createdCustomer] = await db
    .insert(customers)
    .values({ ...customerValues, createdAt: now })
    .returning({ id: customers.id });

  if (!createdCustomer) {
    return null;
  }

  await db.insert(servicem8ClientMappings).values({
    teamId,
    servicem8ConnectionUserId: connectionUserId,
    customerId: createdCustomer.id,
    servicem8CompanyUuid: client.uuid,
    companyData: client,
    lastSyncAt: now,
    syncStatus: 'synced',
    lastError: null,
    updatedAt: now,
  });

  return createdCustomer.id;
}

/**
 * Turns a raw ServiceM8 job into the link a survey stores.
 *
 * Blank fields are kept as null rather than empty strings so the dashboard can
 * tell "no address on the job" from "address is an empty value".
 */
export function buildSurveyLinkFromJob(job: ServiceM8Job): FireAlarmSurveyServiceM8Link {
  return {
    companyUuid: job.company_uuid ?? null,
    companyName: null,
    jobUuid: job.uuid,
    jobNumber: job.generated_job_id ?? null,
    jobDate: job.date ?? null,
    jobAddress: job.job_address ?? null,
  };
}

/**
 * Resolves a picked job uuid into a local customer and a storable link.
 *
 * The client lookup is best-effort: a job whose client cannot be read still
 * links, it simply carries the job detail without a local customer record.
 */
export async function resolveSurveyJobLink(input: {
  teamId: number;
  connectionUserId: number;
  jobUuid: string;
}): Promise<{ link: ResolvedSurveyJobLink; job: ServiceM8Job } | null> {
  const serviceM8Client = await ServiceM8Client_API.fromUserId(input.connectionUserId);

  if (!serviceM8Client) {
    return null;
  }

  const job = await serviceM8Client.getJob(input.jobUuid);

  if (!job) {
    return null;
  }

  let clientRecord: ServiceM8ClientRecord | null = null;

  if (job.company_uuid) {
    clientRecord = await findServiceM8Client(serviceM8Client, job.company_uuid).catch(() => null);
  }

  const normalized = normalizeServiceM8Job(job, { client: clientRecord });

  const link: FireAlarmSurveyServiceM8Link = {
    companyUuid: job.company_uuid ?? null,
    companyName: clientRecord?.name ?? normalized.companyName ?? null,
    jobUuid: job.uuid,
    jobNumber: normalized.generatedJobId ?? job.generated_job_id ?? null,
    jobDate: normalized.date ?? job.date ?? null,
    jobAddress: normalized.workAddress ?? job.job_address ?? null,
  };

  let customerId: number | null = null;

  if (clientRecord) {
    customerId = await ensureCustomerForServiceM8Client({
      teamId: input.teamId,
      connectionUserId: input.connectionUserId,
      client: clientRecord,
    }).catch((error) => {
      console.warn('[fire-alarm-surveys] unable to mirror ServiceM8 client:', error);
      return null;
    });
  }

  return {
    job,
    link: {
      customerId,
      customerName: clientRecord?.name ?? link.companyName,
      serviceM8: link,
      clientResolved: Boolean(clientRecord),
    },
  };
}

/** `Job 1234 · 16 Oct 2026`, matching the dashboard's wording. */
export function describeResolvedJob(link: FireAlarmSurveyServiceM8Link): string {
  const parts = [
    link.jobNumber ? `Job ${link.jobNumber}` : 'ServiceM8 job',
    formatSurveyDate(link.jobDate),
  ].filter((part): part is string => Boolean(part));

  return parts.join(' · ');
}
