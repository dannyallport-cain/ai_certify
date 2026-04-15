import { NextRequest, NextResponse } from 'next/server';
import {
  ServiceM8ConnectionStatus,
  buildServiceM8Address,
  getMobileServiceM8Client,
} from '../_shared';

export async function GET(request: NextRequest) {
  try {
    const result = await getMobileServiceM8Client(request);

    if ('error' in result) {
      return result.error;
    }

    const companyInfo = await result.serviceM8Client.getCompanyInfo();

    const payload: ServiceM8ConnectionStatus = {
      connected: true,
      connection: {
        teamId: result.teamId,
        companyName: companyInfo.name ?? null,
        email: companyInfo.email ?? null,
        phone: companyInfo.phone ?? null,
        address: buildServiceM8Address({
          address: companyInfo.address,
          city: companyInfo.city,
          state: companyInfo.state,
          postcode: companyInfo.postcode,
          country: companyInfo.country,
        }),
      },
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error fetching mobile ServiceM8 connection:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ServiceM8 connection' },
      { status: 500 },
    );
  }
}