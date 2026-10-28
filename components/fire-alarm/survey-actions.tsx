'use client';

/**
 * Rename, complete and delete controls for a single survey.
 *
 * Every action goes through the survey API and then refreshes the server
 * component, so the page always shows what the database holds rather than an
 * optimistic guess that could drift.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, Pencil, Trash2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { FireAlarmSurveyStatus } from '@/lib/fire-alarm/types';

interface SurveyActionsProps {
  surveyId: number;
  name: string;
  status: FireAlarmSurveyStatus;
}

export default function SurveyActions({ surveyId, name, status }: SurveyActionsProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patchSurvey(body: Record<string, unknown>, failureMessage: string) {
    setError(null);

    const response = await fetch(`/api/fire-alarm/surveys/${surveyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setError(payload.error ?? failureMessage);
      return false;
    }

    router.refresh();
    return true;
  }

  async function saveName() {
    setIsSaving(true);

    const trimmed = draftName.trim();
    const saved = await patchSurvey(
      { name: trimmed.length > 0 ? trimmed : null },
      'Unable to rename the survey.',
    );

    setIsSaving(false);

    if (saved) {
      setIsEditing(false);
    }
  }

  async function toggleStatus() {
    setIsSaving(true);
    await patchSurvey(
      { status: status === 'completed' ? 'draft' : 'completed' },
      'Unable to change the survey status.',
    );
    setIsSaving(false);
  }

  async function deleteSurvey() {
    const confirmed = window.confirm(
      `Delete "${name}"? The captured devices for this survey are removed too. This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/fire-alarm/surveys/${surveyId}`, { method: 'DELETE' });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? 'Unable to delete the survey.');
        return;
      }

      router.push('/fire-alarm-surveys');
      router.refresh();
    } catch {
      setError('Unable to reach the server. Check your connection and try again.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {isEditing ? (
          <>
            <Input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="Survey name"
              className="h-9 w-full max-w-sm"
              aria-label="Survey name"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void saveName();
                }
                if (event.key === 'Escape') {
                  setIsEditing(false);
                  setDraftName(name);
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              onClick={() => void saveName()}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-1 h-4 w-4" />
              )}
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsEditing(false);
                setDraftName(name);
              }}
            >
              <X className="mr-1 h-4 w-4" />
              Cancel
            </Button>
          </>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="mr-1 h-4 w-4" />
            Rename
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void toggleStatus()}
          disabled={isSaving || isEditing}
        >
          <Check className="mr-1 h-4 w-4" />
          {status === 'completed' ? 'Reopen as draft' : 'Mark completed'}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={() => void deleteSurvey()}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-1 h-4 w-4" />
          )}
          Delete
        </Button>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
