/**
 * Mobile ServiceM8 clients.
 *
 * Contacts used to be fetched one client at a time, which burned the 180/min
 * rate limit the moment an account had more than a few hundred clients and made
 * every later lookup fail silently. The directory is now loaded in three
 * paginated requests and shared by the whole response.
 */

import { NextRequest, NextResponse } from 'next/server';

import {
  getMobileServiceM8Client,
  isServiceM8Context,
  loadMobileClientDirectory,
  matchesText,
  type ServiceM8ClientRecord,
} from '../_shared';

const MAX_CLIENTS_PER_RESPONSE = 500;

function matchesClientSearch(record: ServiceM8ClientRecord, search: string): boolean {
  return matchesText(
    [
      record.name,
      record.companyName,
      record.firstName,
      record.lastName,
      record.billingContactName,
      record.email,
      record.phone,
      record.mobile,
      record.address,
      record.billingAddress,
      record.postcode,
      record.billingPostcode,
      record.abnNumber,
      record.website,
    ],
    search,
  );
}

export async function GET(request: NextRequest) {
  try {
    const result = await getMobileServiceM8Client(request);

    if (!isServiceM8Context(result)) {
      return result.error;
    }

    const search = request.nextUrl.searchParams.get('search') ?? '';
    const directory = await loadMobileClientDirectory(result.serviceM8Client);

    const clients = directory.clients
      .filter((record) => matchesClientSearch(record, search))
      .slice(0, MAX_CLIENTS_PER_RESPONSE);

    return NextResponse.json({
      clients,
      total: directory.clients.length,
      warnings: directory.warnings,
    });
  } catch (error) {
    console.error('Error fetching mobile ServiceM8 clients:', error);
    return NextResponse.json({ error: 'Failed to fetch ServiceM8 clients' }, { status: 500 });
  }
}
