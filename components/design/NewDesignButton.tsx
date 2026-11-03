'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';

/**
 * Creates a blank design and opens it.
 *
 * The design is created server-side rather than rendered from client state so that the editor
 * always has a real row to save against, and a browser crash mid-drawing cannot lose the sheet
 * details the surveyor has already typed.
 */
export default function NewDesignButton() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New building design' }),
      });
      const body = (await response.json().catch(() => null)) as
        | { design?: { id: number }; error?: string }
        | null;

      if (!response.ok || !body?.design) {
        throw new Error(body?.error ?? 'Could not create the design');
      }

      router.push(`/designs/${body.design.id}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not create the design');
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={creating}
        className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-sm font-semibold text-background transition disabled:opacity-60"
      >
        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        {creating ? 'Creating…' : 'New design'}
      </button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
