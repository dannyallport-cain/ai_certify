// filepath: app/api/admin/users/route.ts
import { NextResponse } from 'next/server';
import { getAllUsers, createUser } from '@/lib/db/queries';

export async function GET() {
  try {
    const users = await getAllUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, email, role } = await request.json();
    if (!name || !email || !role) {
      return NextResponse.json({ error: 'Name, email, and role required' }, { status: 400 });
    }
    const user = await createUser({ name, email, role });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
