import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { users, type EicrInspectorHistoryEntry, type EicrProfileDefaults } from '@/lib/db/schema';

function buildUserAssetProxyUrl(kind: 'avatar' | 'signature', key?: string | null) {
  if (key) {
    return `/api/user/asset/${kind}?key=${encodeURIComponent(key)}`;
  }

  return `/api/user/asset/${kind}`;
}

function shouldProxyUserAsset(
  key: string | null | undefined,
  url: string | null | undefined
) {
  return Boolean(key || (typeof url === 'string' && /^data:image\//i.test(url)));
}

function getUserAssetUrl(
  kind: 'avatar' | 'signature',
  key: string | null | undefined,
  url: string | null | undefined
) {
  if (shouldProxyUserAsset(key, url)) {
    return buildUserAssetProxyUrl(kind, key);
  }

  return url || null;
}

function withoutPasswordHash<T extends { passwordHash?: string | null }>(user: T) {
  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

function sanitizeEicrProfileDefaults(value: unknown): EicrProfileDefaults | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const source = value as Record<string, unknown>;
  const sanitized: EicrProfileDefaults = {};

  for (const key of [
    'tradingTitle',
    'companyAddress',
    'registrationNumber',
    'companyTelephone',
    'companyEmail',
  ] as const) {
    const raw = source[key];
    if (typeof raw === 'string') {
      sanitized[key] = raw.trim();
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : {};
}

function sanitizeEicrInspectorHistory(value: unknown): EicrInspectorHistoryEntry[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const sanitized = value
    .map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        return null;
      }

      const source = entry as Record<string, unknown>;
      const name = typeof source.name === 'string' ? source.name.trim() : '';
      const position = typeof source.position === 'string' ? source.position.trim() : '';

      if (!name || !position) {
        return null;
      }

      return { name, position };
    })
    .filter((entry): entry is EicrInspectorHistoryEntry => Boolean(entry));

  return sanitized;
}

export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sanitizedUser = withoutPasswordHash(user);

    return NextResponse.json(
      {
        ...sanitizedUser,
        avatarUrl: getUserAssetUrl(
          'avatar',
          sanitizedUser.avatarR2Key,
          sanitizedUser.avatarUrl
        ),
        signatureUrl: getUserAssetUrl(
          'signature',
          sanitizedUser.signatureR2Key,
          sanitizedUser.signatureUrl
        ),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    let hasAnyUpdate = false;

    if ('eicrProfileDefaults' in body) {
      const defaults = sanitizeEicrProfileDefaults((body as Record<string, unknown>).eicrProfileDefaults);

      if (defaults === null) {
        return NextResponse.json({ error: 'Invalid EICR profile defaults payload' }, { status: 400 });
      }

      updates.eicrProfileDefaults = defaults;
      hasAnyUpdate = true;
    }

    if ('eicrInspectorHistory' in body) {
      const history = sanitizeEicrInspectorHistory((body as Record<string, unknown>).eicrInspectorHistory);

      if (history === null) {
        return NextResponse.json({ error: 'Invalid EICR inspector history payload' }, { status: 400 });
      }

      updates.eicrInspectorHistory = history.slice(0, 20);
      hasAnyUpdate = true;
    }

    if (!hasAnyUpdate) {
      return NextResponse.json({ error: 'No supported fields provided' }, { status: 400 });
    }

    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, user.id))
      .returning();

    if (!updatedUser) {
      return NextResponse.json({ error: 'Unable to update user' }, { status: 500 });
    }

    const sanitizedUser = withoutPasswordHash(updatedUser);

    return NextResponse.json({
      ...sanitizedUser,
      avatarUrl: getUserAssetUrl(
        'avatar',
        sanitizedUser.avatarR2Key,
        sanitizedUser.avatarUrl
      ),
      signatureUrl: getUserAssetUrl(
        'signature',
        sanitizedUser.signatureR2Key,
        sanitizedUser.signatureUrl
      ),
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
