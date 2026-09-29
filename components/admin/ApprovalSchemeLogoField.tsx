'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { normaliseCompanyLogoFile } from '@/lib/pdf/logo-upload';

/**
 * Logos are stored inline on the scheme row as a data URI rather than as a
 * hosted URL. Certificate and report PDFs embed the logo via `resolvePdfImage`,
 * which reads data URIs directly, and the R2 bucket has no publicly readable
 * URL configured - so a hosted reference would render as a broken image. This
 * mirrors the existing `teams.logo_data_uri` approach.
 */
const MAX_LOGO_BYTES = 1024 * 1024;

/** SVG is rasterised to PNG in the browser so the stored logo is always embeddable. */
const LOGO_ACCEPT_ATTRIBUTE = 'image/png,image/jpeg,image/webp,.svg';

type ApprovalSchemeLogoFieldProps = {
  value: string;
  onChange: (nextValue: string) => void;
  label?: string;
  alt?: string;
  className?: string;
};

export default function ApprovalSchemeLogoField({
  value,
  onChange,
  label = 'Logo',
  alt,
  className,
}: ApprovalSchemeLogoFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreviewBroken, setIsPreviewBroken] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setIsPreviewBroken(false);
  }, [value]);

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    setError('');
    setIsProcessing(true);

    try {
      const dataUri = await normaliseCompanyLogoFile(file);

      if (new Blob([dataUri]).size > MAX_LOGO_BYTES) {
        throw new Error('Logo is too large once encoded (max 1MB) - try a smaller image.');
      }

      onChange(dataUri);
    } catch (processingError) {
      setError(
        processingError instanceof Error ? processingError.message : 'That image could not be used.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const hasValue = value.trim().length > 0;
  const isInlineLogo = value.startsWith('data:');

  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs uppercase tracking-wide text-slate-500">{label}</Label>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50">
          {hasValue && !isPreviewBroken ? (
            <img
              src={value}
              alt={alt?.trim() || 'Logo preview'}
              className="max-h-full max-w-full object-contain"
              onError={() => setIsPreviewBroken(true)}
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-slate-400">
              <ImageIcon className="h-5 w-5" />
              <span className="text-[10px] font-medium uppercase tracking-wide">
                {hasValue ? 'No preview' : 'No logo'}
              </span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {isProcessing ? 'Reading image...' : hasValue ? 'Replace logo' : 'Choose file'}
            </Button>

            {hasValue ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setError('');
                  onChange('');
                }}
                disabled={isProcessing}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </Button>
            ) : null}
          </div>

          <p className="text-xs text-slate-500">
            PNG, JPG, WEBP or SVG - max 1MB. The image is stored with the scheme and embedded in
            generated certificates and reports.
          </p>

          {isInlineLogo ? (
            <p className="text-xs text-slate-500">
              Uploaded logo stored inline — {Math.max(1, Math.round(value.length / 1024))}KB
            </p>
          ) : (
            <Input
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder="/logos/niceic-logo.png"
              className="text-xs"
              aria-label="Logo source"
            />
          )}

          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={LOGO_ACCEPT_ATTRIBUTE}
        className="hidden"
        onChange={handleFileSelect}
        disabled={isProcessing}
      />
    </div>
  );
}
