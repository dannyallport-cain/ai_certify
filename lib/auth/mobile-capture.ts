import { SignJWT, jwtVerify } from 'jose';
import { z } from 'zod';

export const USER_ASSET_KINDS = ['avatar', 'signature'] as const;
export const userAssetKindSchema = z.enum(USER_ASSET_KINDS);
export type UserAssetKind = z.infer<typeof userAssetKindSchema>;

export const MOBILE_CAPTURE_TOKEN_TTL_MINUTES = 15;
const MOBILE_CAPTURE_AUDIENCE = 'user-mobile-capture';

function getMobileCaptureKey() {
  const authSecret = process.env.AUTH_SECRET;

  if (!authSecret) {
    throw new Error('AUTH_SECRET is required for mobile capture tokens.');
  }

  return new TextEncoder().encode(authSecret);
}

const mobileCapturePayloadSchema = z.object({
  sub: z.string().regex(/^\d+$/),
  kind: userAssetKindSchema,
});

export async function createMobileCaptureToken({
  userId,
  kind,
}: {
  userId: number;
  kind: UserAssetKind;
}) {
  return new SignJWT({ kind })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setAudience(MOBILE_CAPTURE_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${MOBILE_CAPTURE_TOKEN_TTL_MINUTES}m`)
    .sign(getMobileCaptureKey());
}

export async function verifyMobileCaptureToken(token: string) {
  const { payload } = await jwtVerify(token, getMobileCaptureKey(), {
    algorithms: ['HS256'],
    audience: MOBILE_CAPTURE_AUDIENCE,
  });

  const parsedPayload = mobileCapturePayloadSchema.safeParse({
    sub: payload.sub,
    kind: payload.kind,
  });

  if (!parsedPayload.success) {
    throw new Error('Invalid mobile capture token payload.');
  }

  return {
    userId: Number(parsedPayload.data.sub),
    kind: parsedPayload.data.kind,
  };
}