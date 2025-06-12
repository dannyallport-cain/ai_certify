import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Clear the session cookie
    const cookieStore = await cookies();
    cookieStore.delete('session');
    
    return NextResponse.json({ message: 'Signed out successfully' });
  } catch (error) {
    console.error('Error signing out:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 