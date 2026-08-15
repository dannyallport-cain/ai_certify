import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import {
  deleteApprovalSchemeTypeById,
  updateApprovalSchemeTypeById,
} from '@/lib/db/queries';

function parseId(params: { id: string }) {
  const id = Number.parseInt(params.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error('Invalid approval scheme id');
  }
  return id;
}

function normalizePatchPayload(payload: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};

  if (payload.code !== undefined) patch.code = String(payload.code).trim();
  if (payload.label !== undefined) patch.label = String(payload.label).trim();
  if (payload.shortLabel !== undefined) patch.shortLabel = String(payload.shortLabel).trim();
  if (payload.description !== undefined) patch.description = payload.description ? String(payload.description).trim() : null;
  if (payload.accentColor !== undefined) patch.accentColor = String(payload.accentColor).trim();
  if (payload.textColor !== undefined) patch.textColor = String(payload.textColor).trim();
  if (payload.symbol !== undefined) patch.symbol = String(payload.symbol).trim();
  if (payload.logoSrc !== undefined) patch.logoSrc = payload.logoSrc ? String(payload.logoSrc).trim() : null;
  if (payload.logoAlt !== undefined) patch.logoAlt = payload.logoAlt ? String(payload.logoAlt).trim() : null;
  if (payload.sortOrder !== undefined) {
    patch.sortOrder =
      typeof payload.sortOrder === 'number'
        ? payload.sortOrder
        : Number.parseInt(String(payload.sortOrder), 10) || 0;
  }
  if (payload.isActive !== undefined) {
    patch.isActive =
      typeof payload.isActive === 'boolean'
        ? payload.isActive
        : String(payload.isActive).toLowerCase() !== 'false';
  }

  return patch;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id: rawId } = await context.params;
    const id = parseId({ id: rawId });
    const payload = (await request.json()) as Record<string, unknown>;
    const patch = normalizePatchPayload(payload);

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No fields supplied for update' }, { status: 400 });
    }

    const updated = await updateApprovalSchemeTypeById(id, patch);
    if (!updated) {
      return NextResponse.json({ error: 'Approval scheme not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating approval scheme:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update approval scheme' },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id: rawId } = await context.params;
    const id = parseId({ id: rawId });
    const deleted = await deleteApprovalSchemeTypeById(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Approval scheme not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error('Error deleting approval scheme:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete approval scheme' },
      { status: 400 }
    );
  }
}
