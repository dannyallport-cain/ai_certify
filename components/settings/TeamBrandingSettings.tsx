'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Upload, X, Loader2 } from 'lucide-react';
import useSWR from 'swr';
import {
  COMPANY_LOGO_ACCEPT_ATTRIBUTE,
  normaliseCompanyLogoFile,
} from '@/lib/pdf/logo-upload';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function TeamBrandingSettings() {
  const { data: team, mutate } = useSWR('/api/team', fetcher);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    if (file.size > 1024 * 1024) {
      setError('Image is too large (max 1MB)');
      return;
    }

    try {
      setIsUploading(true);
      setError('');
      setSuccess('');

      // Converts formats the PDF engine cannot embed (e.g. SVG) into PNG.
      const logoDataUri = await normaliseCompanyLogoFile(file);

      if (new Blob([logoDataUri]).size > 1024 * 1024) {
        throw new Error('Image is too large once encoded (max 1MB) - try a smaller logo');
      }

      const response = await fetch('/api/team/logo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoDataUri }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to upload logo');
      }

      setSuccess('Logo uploaded successfully');
      mutate(); // Refresh team data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload logo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!team?.logoDataUri) return;

    try {
      setIsUploading(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/team/logo', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete logo');
      }

      setSuccess('Logo deleted successfully');
      mutate(); // Refresh team data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete logo');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Branding</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="mb-2 block">Company Logo</Label>
          <p className="text-sm text-gray-600 mb-3">
            Upload a logo to display on generated certificates and reports (PNG, JPG, WEBP, GIF, BMP
            or SVG - max 1MB)
          </p>

          {team?.logoDataUri && (
            <div className="mb-4 p-3 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex items-center gap-3">
                <img
                  src={team.logoDataUri}
                  alt="Company logo preview"
                  className="h-12 w-auto max-w-[200px] object-contain"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteLogo}
                  disabled={isUploading}
                >
                  <X className="mr-1 h-4 w-4" />
                  Delete
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Logo size: {Math.round(team.logoDataUri.length / 1024)}KB
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => logoInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {team?.logoDataUri ? 'Update Logo' : 'Upload Logo'}
                </>
              )}
            </Button>
          </div>

          <input
            ref={logoInputRef}
            type="file"
            accept={COMPANY_LOGO_ACCEPT_ATTRIBUTE}
            className="hidden"
            onChange={handleLogoSelect}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
            {error}
          </p>
        )}

        {success && (
          <p className="text-sm text-green-600 bg-green-50 p-2 rounded border border-green-200">
            {success}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
