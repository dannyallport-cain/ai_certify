'use client';

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import useSWR from 'swr';
import { Camera, PenLine, QrCode, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { User } from '@/lib/db/schema';
import type { UserAssetKind } from '@/lib/auth/mobile-capture';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type CaptureSession = {
  kind: UserAssetKind;
  captureUrl: string;
  expiresAt: string;
  initialValue: string | null;
  initialUpdatedAt: string | null;
};

function getAssetValue(user: User | undefined, kind: UserAssetKind) {
  if (!user) {
    return null;
  }

  return kind === 'avatar' ? user.avatarUrl || null : user.signatureUrl || null;
}

function getAssetUpdatedAt(user: User | undefined, kind: UserAssetKind) {
  if (!user) {
    return null;
  }

  return kind === 'avatar'
    ? user.avatarUpdatedAt?.toString() || null
    : user.signatureUpdatedAt?.toString() || null;
}

function getUserInitials(user: User | undefined) {
  const label = user?.name || user?.email || '?';
  return label
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function ProfileMediaSettings() {
  const [activeCapture, setActiveCapture] = useState<CaptureSession | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isOpening, setIsOpening] = useState<UserAssetKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { data: user } = useSWR<User>('/api/user', fetcher, {
    refreshInterval: activeCapture ? 2500 : 0,
  });

  const previewInitials = useMemo(() => getUserInitials(user), [user]);

  useEffect(() => {
    if (!activeCapture) {
      setQrCodeDataUrl('');
      return;
    }

    let isMounted = true;

    QRCode.toDataURL(activeCapture.captureUrl, {
      width: 280,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((nextQrCodeDataUrl: string) => {
        if (isMounted) {
          setQrCodeDataUrl(nextQrCodeDataUrl);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('Failed to generate the QR code.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeCapture]);

  useEffect(() => {
    if (!activeCapture || !user) {
      return;
    }

    const currentValue = getAssetValue(user, activeCapture.kind);
    const currentUpdatedAt = getAssetUpdatedAt(user, activeCapture.kind);

    if (
      currentValue &&
      (currentValue !== activeCapture.initialValue ||
        currentUpdatedAt !== activeCapture.initialUpdatedAt)
    ) {
      setActiveCapture(null);
      setSuccess(
        activeCapture.kind === 'avatar'
          ? 'Avatar updated successfully.'
          : 'Signature updated successfully.'
      );
    }
  }, [activeCapture, user]);

  const openMobileCapture = async (kind: UserAssetKind) => {
    try {
      setIsOpening(kind);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/user/mobile-capture/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ kind }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to create the mobile capture link.');
      }

      setActiveCapture({
        kind,
        captureUrl: payload.captureUrl,
        expiresAt: payload.expiresAt,
        initialValue: getAssetValue(user, kind),
        initialUpdatedAt: getAssetUpdatedAt(user, kind),
      });
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Failed to create the mobile capture link.'
      );
    } finally {
      setIsOpening(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Mobile Avatar and Signature</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Scan a QR code from your phone to capture your signature on-screen or upload a profile photo directly from your mobile device.
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-4 flex items-center gap-4">
                <Avatar className="size-20 ring-1 ring-slate-200">
                  <AvatarImage src={user?.avatarUrl || undefined} alt={user?.name || user?.email || 'User avatar'} />
                  <AvatarFallback>{previewInitials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-slate-900">Avatar photo</p>
                  <p className="text-sm text-slate-600">Capture or choose a square profile image from your phone.</p>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => void openMobileCapture('avatar')}
                disabled={isOpening !== null}
                className="w-full"
              >
                <Camera className="mr-2 h-4 w-4" />
                {isOpening === 'avatar' ? 'Preparing QR code...' : 'Capture avatar on phone'}
              </Button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                    <PenLine className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Signature</p>
                    <p className="text-sm text-slate-600">Draw your signature on your phone screen and save it to your account.</p>
                  </div>
                </div>
                <div className="flex min-h-24 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-3">
                  {user?.signatureUrl ? (
                    <img src={user.signatureUrl} alt="Signature preview" className="max-h-20 w-full object-contain" />
                  ) : (
                    <p className="text-sm text-slate-500">No signature saved yet</p>
                  )}
                </div>
              </div>
              <Button
                type="button"
                onClick={() => void openMobileCapture('signature')}
                disabled={isOpening !== null}
                className="w-full"
              >
                <PenLine className="mr-2 h-4 w-4" />
                {isOpening === 'signature' ? 'Preparing QR code...' : 'Capture signature on phone'}
              </Button>
            </div>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
        </CardContent>
      </Card>

      {activeCapture ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 px-4 py-6">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  <QrCode className="h-3.5 w-3.5" />
                  Mobile capture
                </div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {activeCapture.kind === 'avatar' ? 'Scan to capture your avatar' : 'Scan to capture your signature'}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Scan this QR code with your phone camera. Keep this window open while the phone uploads the update.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveCapture(null)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close QR code dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              {qrCodeDataUrl ? (
                <img src={qrCodeDataUrl} alt="Mobile capture QR code" className="h-64 w-64 rounded-2xl bg-white p-3" />
              ) : (
                <div className="flex h-64 w-64 items-center justify-center rounded-2xl bg-white text-sm text-slate-500">
                  Generating QR code...
                </div>
              )}
              <a
                href={activeCapture.captureUrl}
                target="_blank"
                rel="noreferrer"
                className="break-all text-center text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Open capture link directly
              </a>
              <p className="text-xs text-slate-500">
                Link expires at {new Date(activeCapture.expiresAt).toLocaleTimeString()}.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
