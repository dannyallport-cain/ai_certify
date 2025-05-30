// filepath: app/api/admin/users/[id]/route.ts
import { NextResponse } from 'next/server';
import { deactivateUserById } from '@/lib/db/queries';

export async function DELETE(_request: Request, context: any) {
  const id = parseInt(context.params.id, 10);
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
