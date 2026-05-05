import { NextRequest, NextResponse } from 'next/server';
import { getMobileServiceM8Client, loadServiceM8ContactDetails, normalizeServiceM8Client } from '../_shared';

export async function GET(request: NextRequest) {
  try {
    const result = await getMobileServiceM8Client(request);

    if ('error' in result) {
      return result.error;
    }

    const search = request.nextUrl.searchParams.get('search')?.trim();
    const clients = await result.serviceM8Client.getClients('active eq 1');

    const enrichedClients = await Promise.all(
      clients
        .filter((client) => {
          if (!search) return true;

          const haystack = [
            client.name,
            client.company_name,
            client.first_name,
            client.last_name,
            client.email,
            client.phone,
            client.mobile,
            client.address,
            client.address_city,
            client.address_postcode,
            client.billing_address,
            client.billing_city,
            client.billing_postcode,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          return haystack.includes(search.toLowerCase());
        })
        .map(async (client) => {
          const contactDetails = await loadServiceM8ContactDetails(result.serviceM8Client, client.uuid);
          return normalizeServiceM8Client(client, contactDetails);
        }),
    );

    const filteredClients = enrichedClients;

    return NextResponse.json({ clients: filteredClients });
  } catch (error) {
    console.error('Error fetching mobile ServiceM8 clients:', error);
    return NextResponse.json({ error: 'Failed to fetch ServiceM8 clients' }, { status: 500 });
  }
}
