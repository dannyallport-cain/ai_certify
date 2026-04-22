import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { getMobileUser } from '@/lib/auth/mobile';
import { db } from '@/lib/db/drizzle';
import {
  fireAlarmCaptureDevices,
  fireAlarmRoomCaptures,
  type NewFireAlarmCaptureDevice,
} from '@/lib/db/schema';

type CaptureDeviceInput = {
  id?: string;
  type?: string;
  label?: string | null;
  manufacturer?: string | { name?: string | null; confidence?: number | null } | null;
  confidence?: number | null;
  location?: {
    x?: number | null;
    y?: number | null;
    z?: number | null;
  } | null;
  boundingBox?: Record<string, unknown> | null;
  notes?: string | null;
  source?: string | null;
  roomId?: string | null;
  wallSegmentId?: string | null;
  metadata?: Record<string, unknown> | null;
  identifiedByUser?: boolean;
};

type CaptureSessionInput = {
  id?: string;
  status?: string;
  metadata?: {
    sessionName?: string | null;
    startedAt?: string | null;
    endedAt?: string | null;
    [key: string]: unknown;
  } | null;
  floorplan?: {
    units?: string | null;
    rooms?: unknown[];
    deviceCount?: number | null;
    wallCount?: number | null;
  } | null;
};

function toNullableTimestamp(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeManufacturer(
  value: CaptureDeviceInput['manufacturer'],
): { name: string | null; confidence: number | null } {
  if (!value) {
    return { name: null, confidence: null };
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return {
      name: trimmed.length > 0 ? trimmed : null,
      confidence: null,
    };
  }

  return {
    name: typeof value.name === 'string' && value.name.trim() ? value.name.trim() : null,
    confidence: typeof value.confidence === 'number' ? value.confidence : null,
  };
}

function normalizeDevice(device: CaptureDeviceInput): NewFireAlarmCaptureDevice | null {
  const type = typeof device.type === 'string' ? device.type.trim() : '';

  const explicitlyIdentified =
    device.identifiedByUser === true || device.metadata?.identifiedByUser === true;

  if (!explicitlyIdentified || !type || type === 'unknown') {
    return null;
  }

  const manufacturer = normalizeManufacturer(device.manufacturer);

  return {
    captureId: 0,
    externalDeviceId: typeof device.id === 'string' && device.id.trim() ? device.id.trim() : null,
    deviceType: type,
    label: typeof device.label === 'string' && device.label.trim() ? device.label.trim() : null,
    manufacturerName: manufacturer.name,
    manufacturerConfidence: manufacturer.confidence,
    confidence: typeof device.confidence === 'number' ? device.confidence : null,
    locationX: typeof device.location?.x === 'number' ? device.location.x : null,
    locationY: typeof device.location?.y === 'number' ? device.location.y : null,
    locationZ: typeof device.location?.z === 'number' ? device.location.z : null,
    boundingBox: device.boundingBox ?? null,
    notes: typeof device.notes === 'string' && device.notes.trim() ? device.notes.trim() : null,
    source: typeof device.source === 'string' && device.source.trim() ? device.source.trim() : null,
    roomId: typeof device.roomId === 'string' && device.roomId.trim() ? device.roomId.trim() : null,
    wallSegmentId:
      typeof device.wallSegmentId === 'string' && device.wallSegmentId.trim()
        ? device.wallSegmentId.trim()
        : null,
    identifiedByUser: true,
    metadata: {
      ...(device.metadata ?? {}),
      savedFromMobileCapture: true,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const mobileUser = await getMobileUser(request);

    if (!mobileUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!mobileUser.team) {
      return NextResponse.json({ error: 'No team found' }, { status: 403 });
    }

    const body = (await request.json()) as {
      session?: CaptureSessionInput | null;
      devices?: CaptureDeviceInput[] | null;
      metadata?: Record<string, unknown> | null;
    };

    const session = body?.session;
    const sessionId = typeof session?.id === 'string' ? session.id.trim() : '';

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const normalizedDevices = Array.isArray(body?.devices)
      ? body.devices.map(normalizeDevice).filter((device): device is NewFireAlarmCaptureDevice => Boolean(device))
      : [];

    const savedCapture = await db.transaction(async (tx) => {
      const [existingCapture] = await tx
        .select({ id: fireAlarmRoomCaptures.id })
        .from(fireAlarmRoomCaptures)
        .where(
          and(
            eq(fireAlarmRoomCaptures.teamId, mobileUser.team!.id),
            eq(fireAlarmRoomCaptures.externalSessionId, sessionId),
          ),
        )
        .limit(1);

      const captureValues = {
        teamId: mobileUser.team!.id,
        createdBy: mobileUser.user.id,
        externalSessionId: sessionId,
        sessionName:
          typeof session?.metadata?.sessionName === 'string' && session.metadata.sessionName.trim()
            ? session.metadata.sessionName.trim()
            : null,
        captureStatus:
          typeof session?.status === 'string' && session.status.trim() ? session.status.trim() : 'completed',
        units:
          typeof session?.floorplan?.units === 'string' && session.floorplan.units.trim()
            ? session.floorplan.units.trim()
            : null,
        startedAt: toNullableTimestamp(session?.metadata?.startedAt),
        endedAt: toNullableTimestamp(session?.metadata?.endedAt),
        deviceCount: normalizedDevices.length,
        metadata: {
          ...(body?.metadata ?? {}),
          captureState: session?.metadata?.sessionName ?? null,
          roomCount: Array.isArray(session?.floorplan?.rooms) ? session?.floorplan?.rooms.length : 0,
          floorplanDeviceCount:
            typeof session?.floorplan?.deviceCount === 'number' ? session.floorplan.deviceCount : null,
          wallCount:
            typeof session?.floorplan?.wallCount === 'number' ? session.floorplan.wallCount : null,
          sessionMetadata: session?.metadata ?? null,
          savedDeviceCount: normalizedDevices.length,
          source: 'expo-mobile-roomplan',
        },
        updatedAt: new Date(),
      };

      let captureId = existingCapture?.id ?? null;

      if (captureId) {
        await tx
          .update(fireAlarmRoomCaptures)
          .set(captureValues)
          .where(eq(fireAlarmRoomCaptures.id, captureId));

        await tx
          .delete(fireAlarmCaptureDevices)
          .where(eq(fireAlarmCaptureDevices.captureId, captureId));
      } else {
        const [createdCapture] = await tx
          .insert(fireAlarmRoomCaptures)
          .values(captureValues)
          .returning({ id: fireAlarmRoomCaptures.id });

        captureId = createdCapture.id;
      }

      if (normalizedDevices.length > 0) {
        await tx.insert(fireAlarmCaptureDevices).values(
          normalizedDevices.map((device) => ({
            ...device,
            captureId: captureId!,
            updatedAt: new Date(),
          })),
        );
      }

      const [captureRecord] = await tx
        .select()
        .from(fireAlarmRoomCaptures)
        .where(eq(fireAlarmRoomCaptures.id, captureId!))
        .limit(1);

      return captureRecord;
    });

    return NextResponse.json(
      {
        capture: savedCapture,
        savedDeviceCount: normalizedDevices.length,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Save room capture error:', error);
    return NextResponse.json({ error: 'Failed to save room capture' }, { status: 500 });
  }
}
