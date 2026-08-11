import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import {
  createApprovalSchemeType,
  getAdminApprovalSchemeTypes,
} from '@/lib/db/queries';

function normalizePayload(payload: Record<string, unknown>) {
  const code = String(payload.code ?? '').trim();
  const label = String(payload.label ?? '').trim();
  const shortLabel = String(payload.shortLabel ?? '').trim();

  if (!code || !label || !shortLabel) {
    throw new Error('code, label and shortLabel are required');
  }

  return {
    code,
    label,
    shortLabel,
    description: payload.description ? String(payload.description).trim() : null,
    accentColor: payload.accentColor ? String(payload.accentColor).trim() : '#1d4ed8',
    textColor: payload.textColor ? String(payload.textColor).trim() : '#ffffff',
    symbol: payload.symbol ? String(payload.symbol).trim() : '',
    logoSrc: payload.logoSrc ? String(payload.logoSrc).trim() : null,
    logoAlt: payload.logoAlt ? String(payload.logoAlt).trim() : null,
    sortOrder:
      typeof payload.sortOrder === 'number'
        ? payload.sortOrder
        : Number.parseInt(String(payload.sortOrder ?? '0'), 10) || 0,
    isActive:
      typeof payload.isActive === 'boolean'
        ? payload.isActive
        : String(payload.isActive ?? 'true').toLowerCase() !== 'false',
  };
}

export async function GET() {
  try {
    await requireAdmin();
    const schemes = await getAdminApprovalSchemeTypes();
    return NextResponse.json(schemes);
  } catch (error) {
    console.error('Error fetching admin approval schemes:', error);
    return NextResponse.json({ error: 'Failed to fetch approval schemes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const payload = (await request.json()) as Record<string, unknown>;
    const normalized = normalizePayload(payload);
    const created = await createApprovalSchemeType(normalized);

    if (!created) {
      return NextResponse.json({ error: 'Failed to create approval scheme' }, { status: 500 });
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error creating approval scheme:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create approval scheme' },
      { status: 400 }
    );
  }
}
