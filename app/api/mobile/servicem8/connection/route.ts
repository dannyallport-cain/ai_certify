/**
 * Mobile ServiceM8 connection status.
 */

import { NextRequest, NextResponse } from 'next/server';

import {
  buildServiceM8Address,
  getMobileServiceM8Client,
  isServiceM8Context,
  type ServiceM8ConnectionStatus,
} from '../_shared';

export async function GET(request: NextRequest) {
  try {
    const result = await getMobileServiceM8Client(request);

    if (!isServiceM8Context(result)) {
      return result.error;
    }

    // Company info is an optional endpoint: a connection without the `vendor`
    // scope returns an empty record rather than throwing, so the connection is
    // still reported as healthy.
    const companyInfo = await result.serviceM8Client.getCompanyInfo();

    const payload: ServiceM8ConnectionStatus = {
      connected: true,
      connection: {
        teamId: result.teamId,
        companyName: companyInfo.name,
        email: companyInfo.email,
        phone: companyInfo.phone,
        address: buildServiceM8Address({
          raw: companyInfo.address,
          city: companyInfo.city,
          state: companyInfo.state,
          postcode: companyInfo.postcode,
          country: companyInfo.country,
        }).formatted,
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
