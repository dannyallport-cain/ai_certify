/**
 * ServiceM8 attachment file proxy.
 *
 * ServiceM8 serves attachment bytes from a 302 redirect to short-lived signed
 * storage URLs, and its documentation is explicit that API credentials must not
 * be forwarded to that host. Browsers also cannot send the OAuth bearer token
 * the API requires.
 *
 * This route resolves the signed URL server-side and streams the bytes back from
 * our own origin, which is what makes the `fileUrl` on normalised client and job
 * records actually load.
 */

import { NextRequest, NextResponse } from 'next/server';

import { getMobileUser } from '@/lib/auth/mobile';
import { getTeamForUser, getUser } from '@/lib/db/queries';
import { ServiceM8ApiError, ServiceM8Client_API } from '@/lib/servicem8/client';

interface RouteContext {
  params: Promise<{ uuid: string }>;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Resolves the connection for either a dashboard session or a mobile token. */
async function resolveServiceM8Client(request: NextRequest): Promise<ServiceM8Client_API | null> {
  const webUser = await getUser().catch(() => null);

  if (webUser) {
    const byUser = await ServiceM8Client_API.fromUserId(webUser.id);
    if (byUser) {
      return byUser;
    }

    const team = await getTeamForUser().catch(() => null);
    if (team) {
      return ServiceM8Client_API.fromTeamId(team.id);
    }
  }

  const mobileSession = await getMobileUser(request).catch(() => null);

  if (mobileSession?.user?.id != null) {
    const byUser = await ServiceM8Client_API.fromUserId(mobileSession.user.id);
    if (byUser) {
      return byUser;
    }
  }

  if (mobileSession?.team?.id != null) {
    return ServiceM8Client_API.fromTeamId(mobileSession.team.id);
  }

  return null;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { uuid } = await context.params;

  if (!uuid || !UUID_PATTERN.test(uuid)) {
    return NextResponse.json({ error: 'Invalid attachment id' }, { status: 400 });
  }

  const client = await resolveServiceM8Client(request);

  if (!client) {
    return NextResponse.json({ error: 'ServiceM8 not connected' }, { status: 401 });
  }

  try {
    const file = await client.fetchAttachment(uuid);

    const safeName = (file.fileName ?? `attachment-${uuid}`).replace(/["\r\n]/g, '');

    const headers = new Headers({
      'Content-Type': file.contentType,
      // Signed storage URLs expire, so cache privately and briefly rather than not at all.
      'Cache-Control': 'private, max-age=300',
      'Content-Disposition': `inline; filename="${safeName}"`,
    });

    if (file.contentLength !== null) {
      headers.set('Content-Length', String(file.contentLength));
    }

    return new NextResponse(file.body, { status: 200, headers });
  } catch (error) {
    if (error instanceof ServiceM8ApiError) {
      const status = error.status === 404 ? 404 : error.isPermissionError ? 403 : 502;
      return NextResponse.json({ error: error.message }, { status });
    }

    console.error(`Failed to proxy ServiceM8 attachment ${uuid}:`, error);
    return NextResponse.json({ error: 'Failed to fetch attachment' }, { status: 500 });
  }
}
