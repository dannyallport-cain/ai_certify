// filepath: app/api/admin/users/[id]/route.ts
import { NextResponse } from 'next/server';
import { deactivateUserById } from '@/lib/db/queries';

interface Params {
  params: { id: string };
}

export async function DELETE(_request: Request, { params }: Params) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
  }
  try {
    await deactivateUserById(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deactivating user:', error);
    return NextResponse.json({ error: 'Failed to deactivate user' }, { status: 500 });
  }
}
