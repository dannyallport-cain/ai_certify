import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';

export type CompanyProfile = {
  id: string;
  tradingTitle: string;
  companyAddress?: string;
  registrationNumber?: string;
  companyTelephone?: string;
  companyEmail?: string;
};

function sanitizeCompanyProfiles(value: unknown): CompanyProfile[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const profiles: CompanyProfile[] = [];

  for (const profile of value) {
    if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
      continue;
    }

    const source = profile as Record<string, unknown>;
    const tradingTitle = typeof source.tradingTitle === 'string' ? source.tradingTitle.trim() : '';

    if (!tradingTitle) {
      continue;
    }

    profiles.push({
      id: typeof source.id === 'string' ? source.id : `${Date.now()}-${Math.random()}`,
      tradingTitle,
      companyAddress: typeof source.companyAddress === 'string' ? source.companyAddress.trim() : '',
      registrationNumber: typeof source.registrationNumber === 'string' ? source.registrationNumber.trim() : '',
      companyTelephone: typeof source.companyTelephone === 'string' ? source.companyTelephone.trim() : '',
      companyEmail: typeof source.companyEmail === 'string' ? source.companyEmail.trim() : '',
    });
  }

  return profiles;
}

export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user with company profiles
    const userData = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!userData.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRecord = userData[0];
    const companyProfiles = sanitizeCompanyProfiles((userRecord as any).eicrCompanyProfiles);

    return NextResponse.json({ profiles: companyProfiles });
  } catch (error) {
    console.error('Error fetching company profiles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const source = body as Record<string, unknown>;
    const tradingTitle = typeof source.tradingTitle === 'string' ? source.tradingTitle.trim() : '';

    if (!tradingTitle) {
      return NextResponse.json({ error: 'Trading title is required' }, { status: 400 });
    }

    // Get existing profiles
    const userData = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    const existingProfiles = sanitizeCompanyProfiles((userData[0] as any)?.eicrCompanyProfiles || []);

    // Create new profile
    const newProfile: CompanyProfile = {
      id: `${Date.now()}-${Math.random()}`,
      tradingTitle,
      companyAddress: typeof source.companyAddress === 'string' ? source.companyAddress.trim() : '',
      registrationNumber: typeof source.registrationNumber === 'string' ? source.registrationNumber.trim() : '',
      companyTelephone: typeof source.companyTelephone === 'string' ? source.companyTelephone.trim() : '',
      companyEmail: typeof source.companyEmail === 'string' ? source.companyEmail.trim() : '',
    };

    const updatedProfiles = [...existingProfiles, newProfile];

    // Update user with new profiles
    const [updatedUser] = await db
      .update(users)
      .set({ eicrCompanyProfiles: updatedProfiles } as any)
      .where(eq(users.id, user.id))
      .returning();

    if (!updatedUser) {
      return NextResponse.json({ error: 'Unable to save company profile' }, { status: 500 });
    }

    return NextResponse.json({ profile: newProfile, profiles: updatedProfiles });
  } catch (error) {
    console.error('Error saving company profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
