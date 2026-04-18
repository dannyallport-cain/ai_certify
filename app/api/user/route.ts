import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/admin';

function buildUserAssetProxyUrl(kind: 'avatar' | 'signature', key: string | null | undefined) {
  if (!key) {
    return null;
  }

  return `/api/user/asset/${kind}?key=${encodeURIComponent(key)}`;
}

function withoutPasswordHash<T extends { passwordHash?: string | null }>(user: T) {
  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
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
        avatarUrl: buildUserAssetProxyUrl('avatar', sanitizedUser.avatarR2Key) || sanitizedUser.avatarUrl,
        signatureUrl:
          buildUserAssetProxyUrl('signature', sanitizedUser.signatureR2Key) || sanitizedUser.signatureUrl,
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
