import { NextRequest, NextResponse } from 'next/server';
import { getCertificatesForTeamPage } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.trim() || undefined;
    const certificateType = url.searchParams.get('type')?.trim() || undefined;
    const status = url.searchParams.get('status')?.trim() || undefined;
    const startDate = url.searchParams.get('from')?.trim() || undefined;
    const endDate = url.searchParams.get('to')?.trim() || undefined;
    const sortKey = (url.searchParams.get('sortKey') as 'createdAt' | 'inspectionDate' | 'certificateNumber' | 'certificateType') || 'createdAt';
    const sortDir = (url.searchParams.get('sortDir') as 'asc' | 'desc') || 'desc';
    const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    const response = await getCertificatesForTeamPage({
      search,
      certificateType,
      status,
      startDate,
      endDate,
      sortKey,
      sortDir,
      limit,
      offset,
    });

    return NextResponse.json({
      items: response.items,
      total: response.total,
      page,
      pageSize: limit,
    });
  } catch (error) {
    console.error('Error fetching certificates list:', error);
    return NextResponse.json({ error: 'Failed to fetch certificates' }, { status: 500 });
  }
}
