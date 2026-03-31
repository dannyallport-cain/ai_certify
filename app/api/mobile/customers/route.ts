import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { customers } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getMobileUser } from '@/lib/auth/mobile';

export async function GET(request: NextRequest) {
  const auth = await getMobileUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!auth.team) {
    return NextResponse.json({ error: 'No team found' }, { status: 403 });
  }

  const list = await db
    .select()
    .from(customers)
    .where(eq(customers.teamId, auth.team.id))
    .orderBy(desc(customers.createdAt));

  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  const auth = await getMobileUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!auth.team) {
    return NextResponse.json({ error: 'No team found' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, email, phone, address, postcode, contactPerson } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    }

    const [created] = await db
      .insert(customers)
      .values({
        teamId: auth.team.id,
        name: String(name).trim(),
        email: email ? String(email).trim() : null,
        phone: phone ? String(phone).trim() : null,
        address: address ? String(address).trim() : null,
        postcode: postcode ? String(postcode).trim() : null,
        contactPerson: contactPerson ? String(contactPerson).trim() : null,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
