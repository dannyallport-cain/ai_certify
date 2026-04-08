'use client';

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CheckCircle2, PenLine, RefreshCw, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UserAssetKind } from '@/lib/auth/mobile-capture';

type MobileCaptureClientProps = {
  token: string;
  kind: UserAssetKind;
};

const SIGNATURE_PAD_HEIGHT = 220;
const SIGNATURE_PAD_MAX_WIDTH = 560;
const SIGNATURE_EXPORT_PADDING = 12;
const SIGNATURE_EXPORT_MAX_WIDTH = 900;
const AVATAR_OUTPUT_SIZE = 512;

function getCaptureHeading(kind: UserAssetKind) {
  return kind === 'signature' ? 'Draw your signature' : 'Capture your avatar';
}

function getCaptureDescription(kind: UserAssetKind) {
  return kind === 'signature'
    ? 'Sign on the canvas below, then save it back to your account.'
    : 'Use your phone camera or photo library to upload a profile image.';
}

export default function MobileCaptureClient({ token, kind }: MobileCaptureClientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const pageTitle = useMemo(() => getCaptureHeading(kind), [kind]);
  const pageDescription = useMemo(() => getCaptureDescription(kind), [kind]);

  const resizeSignatureCanvas = useCallback(() => {
    const canvas = canvasRef.current;

    if (!canvas || kind !== 'signature') {
      return;
    }

    const width = Math.min(window.innerWidth - 32, SIGNATURE_PAD_MAX_WIDTH);
    const scale = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return;
    }

    canvas.width = width * scale;
    canvas.height = SIGNATURE_PAD_HEIGHT * scale;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${SIGNATURE_PAD_HEIGHT}px`;

    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, width, SIGNATURE_PAD_HEIGHT);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0f172a';

    setHasSignature(false);
  }, [kind]);

  useEffect(() => {
    if (kind !== 'signature') {
      return;
    }

    resizeSignatureCanvas();
    window.addEventListener('resize', resizeSignatureCanvas);

    return () => {
      window.removeEventListener('resize', resizeSignatureCanvas);
    };
  }, [kind, resizeSignatureCanvas]);

  const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (kind !== 'signature') {
      return;
    }

    const point = getCanvasPoint(event);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!point || !ctx || !canvas) {
      return;
    }

    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    isDrawingRef.current = true;
    lastPointRef.current = point;

    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (kind !== 'signature' || !isDrawingRef.current) {
      return;
    }

    const point = getCanvasPoint(event);
    const ctx = canvasRef.current?.getContext('2d');

    if (!point || !ctx || !lastPointRef.current) {
      return;
    }

    event.preventDefault();
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
  };

  const stopDrawing = (event?: React.PointerEvent<HTMLCanvasElement>) => {
    if (event && canvasRef.current?.hasPointerCapture(event.pointerId)) {
      canvasRef.current.releasePointerCapture(event.pointerId);
    }

    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const clearSignature = () => {
    resizeSignatureCanvas();
    setError(null);
    setSuccess(null);
  };

  const buildAvatarDataUrl = async (file: File) => {
    const imageUrl = URL.createObjectURL(file);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const nextImage = new Image();
        nextImage.onload = () => resolve(nextImage);
        nextImage.onerror = () => reject(new Error('Unable to load the selected image.'));
        nextImage.src = imageUrl;
      });

      const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
      const offsetX = (image.naturalWidth - cropSize) / 2;
      const offsetY = (image.naturalHeight - cropSize) / 2;
      const canvas = document.createElement('canvas');
      canvas.width = AVATAR_OUTPUT_SIZE;
      canvas.height = AVATAR_OUTPUT_SIZE;

      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Unable to prepare the selected image.');
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE);
      ctx.drawImage(
        image,
        offsetX,
        offsetY,
        cropSize,
        cropSize,
        0,
        0,
        AVATAR_OUTPUT_SIZE,
        AVATAR_OUTPUT_SIZE
      );

      return canvas.toDataURL('image/jpeg', 0.82);
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  };

  const handleAvatarFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      const nextAvatar = await buildAvatarDataUrl(file);
      setAvatarDataUrl(nextAvatar);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to prepare the selected image.');
    } finally {
      event.target.value = '';
    }
  };

  const buildSignatureDataUrl = () => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return null;
    }

    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return null;
    }

    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const alpha = pixels[(y * width + x) * 4 + 3];

        if (alpha > 0) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) {
      return null;
    }

    const croppedWidth = maxX - minX + 1;
    const croppedHeight = maxY - minY + 1;
    const exportScale = Math.min(1, SIGNATURE_EXPORT_MAX_WIDTH / croppedWidth);
    const outputWidth = Math.max(
      1,
      Math.round(croppedWidth * exportScale + SIGNATURE_EXPORT_PADDING * 2)
    );
    const outputHeight = Math.max(
      1,
      Math.round(croppedHeight * exportScale + SIGNATURE_EXPORT_PADDING * 2)
    );
    const exportCanvas = document.createElement('canvas');

    exportCanvas.width = outputWidth;
    exportCanvas.height = outputHeight;

    const exportCtx = exportCanvas.getContext('2d');

    if (!exportCtx) {
      return null;
    }

    exportCtx.clearRect(0, 0, outputWidth, outputHeight);
    exportCtx.drawImage(
      canvas,
      minX,
      minY,
      croppedWidth,
      croppedHeight,
      SIGNATURE_EXPORT_PADDING,
      SIGNATURE_EXPORT_PADDING,
      outputWidth - SIGNATURE_EXPORT_PADDING * 2,
      outputHeight - SIGNATURE_EXPORT_PADDING * 2
    );

    return exportCanvas.toDataURL('image/png');
  };

  const handleSubmit = async () => {
    const dataUrl = kind === 'signature' ? buildSignatureDataUrl() : avatarDataUrl;

    if (kind === 'signature' && !hasSignature) {
      setError('Add a signature before saving.');
      return;
    }

    if (kind === 'avatar' && !dataUrl) {
      setError('Choose a photo before saving.');
      return;
    }

    if (!dataUrl) {
      setError('Nothing to save yet.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/user/mobile-capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, dataUrl }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save your update.');
      }

      setSuccess(kind === 'signature' ? 'Signature saved. You can close this page.' : 'Avatar saved. You can close this page.');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to save your update.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
            {kind === 'signature' ? <PenLine className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
            Mobile capture
          </div>
          <h1 className="text-2xl font-semibold">{pageTitle}</h1>
          <p className="text-sm text-slate-600">{pageDescription}</p>
        </div>

        {kind === 'signature' ? (
          <section className="space-y-4">
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-3 shadow-inner">
              <canvas
                ref={canvasRef}
                className="block w-full touch-none rounded-xl bg-white"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={stopDrawing}
                onPointerLeave={stopDrawing}
                onPointerCancel={stopDrawing}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={clearSignature}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Clear
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={isSubmitting || !hasSignature}>
                <Upload className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Saving...' : 'Save signature'}
              </Button>
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
              {avatarDataUrl ? (
                <img
                  src={avatarDataUrl}
                  alt="Avatar preview"
                  className="h-48 w-48 rounded-3xl object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-48 w-48 flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white text-center text-sm text-slate-500">
                  <Camera className="mb-3 h-8 w-8 text-slate-400" />
                  No photo selected yet
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex cursor-pointer items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Camera className="mr-2 h-4 w-4" />
                Choose photo
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={handleAvatarFile}
                />
              </label>
              <Button type="button" onClick={handleSubmit} disabled={isSubmitting || !avatarDataUrl}>
                <Upload className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Saving...' : 'Save avatar'}
              </Button>
            </div>
          </section>
        )}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            {success}
          </div>
        ) : null}
      </div>
    </main>
  );
}
