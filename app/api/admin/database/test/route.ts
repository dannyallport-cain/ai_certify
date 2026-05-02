import { NextResponse } from 'next/server';

import { isAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const rows = await db.select().from(users).limit(1);

    return NextResponse.json({
      success: true,
      service: 'database',
      message: 'Database query executed successfully.',
      checkedAt: new Date().toISOString(),
      details: {
        sampleRows: rows.length,
        hasData: rows.length > 0,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to verify database connectivity';

    return NextResponse.json(
      {
        success: false,
        service: 'database',
        message,
      },
      { status: 500 }
    );
  }
}
