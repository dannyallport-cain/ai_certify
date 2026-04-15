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

    let companyInfo: Awaited<ReturnType<typeof result.serviceM8Client.getCompanyInfo>> | null = null;
    try {
      companyInfo = await result.serviceM8Client.getCompanyInfo();
    } catch (error) {
      console.warn('ServiceM8 company info unavailable for mobile connection status:', error);
    }

    const payload: ServiceM8ConnectionStatus = {
      connected: true,
      connection: {
        teamId: result.teamId,
        companyName: companyInfo?.name ?? null,
        email: companyInfo?.email ?? null,
        phone: companyInfo?.phone ?? null,
        address: buildServiceM8Address({
          address: companyInfo?.address ?? null,
          city: companyInfo?.city ?? null,
          state: companyInfo?.state ?? null,
          postcode: companyInfo?.postcode ?? null,
          country: companyInfo?.country ?? null,
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
