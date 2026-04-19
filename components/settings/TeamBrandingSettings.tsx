'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Upload, X, Loader2 } from 'lucide-react';
import useSWR from 'swr';

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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (1MB limit)
    if (file.size > 1024 * 1024) {
      setError('Image is too large (max 1MB)');
      return;
    }

    try {
      setIsUploading(true);
      setError('');
      setSuccess('');

      const reader = new FileReader();
      reader.onload = async () => {
        if (typeof reader.result !== 'string') {
          setError('Failed to read image');
          setIsUploading(false);
          return;
        }

        try {
          const response = await fetch('/api/team/logo', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ logoDataUri: reader.result }),
          });

          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || 'Failed to upload logo');
          }

          setSuccess('Logo uploaded successfully');
          mutate(); // Refresh team data
        } catch (err) {
          setError(
            err instanceof Error ? err.message : 'Failed to upload logo'
          );
        } finally {
          setIsUploading(false);
        }
      };

      reader.onerror = () => {
        setError('Failed to read image');
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload logo');
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
            Upload a logo to display in the header of generated reports (PNG, JPG, or GIF - max 1MB)
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
            accept="image/*"
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
