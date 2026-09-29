'use client';

import { Check } from 'lucide-react';
import {
  type ApprovalSchemeId,
  type ApprovalSchemeInfo,
} from '@/lib/approval-schemes';
import { useApprovalSchemes } from '@/lib/use-approval-schemes';
import { cn } from '@/lib/utils';
import { ApprovalSchemeLogoBadge } from './ApprovalSchemeLogoBadge';

type ApprovalSchemeSelectorProps = {
  selectedSchemes: ApprovalSchemeId[];
  onChange: (nextSchemes: ApprovalSchemeId[]) => void;
  /** Catalogue to render. Defaults to the admin-managed catalogue from the API. */
  schemes?: ApprovalSchemeInfo[];
  className?: string;
};

export function ApprovalSchemeSelector({
  selectedSchemes,
  onChange,
  schemes,
  className,
}: ApprovalSchemeSelectorProps) {
  const { schemes: managedSchemes } = useApprovalSchemes();
  const catalogue = schemes ?? managedSchemes;

  function toggleScheme(schemeId: ApprovalSchemeId) {
    onChange(
      selectedSchemes.includes(schemeId)
        ? selectedSchemes.filter((current) => current !== schemeId)
        : [...selectedSchemes, schemeId],
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Approval body badges</p>
          <p className="text-sm text-gray-600">
            Pick the logos and standards you want shown on your profile and on generated reports.
          </p>
        </div>
        <div className="rounded-full border-2 border-black bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-700 shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
          {selectedSchemes.length} selected
        </div>
      </div>

      {catalogue.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-black bg-white p-4 text-sm text-gray-600">
          No approval bodies are configured yet. An administrator can add them under Admin &rsaquo;
          Approval schemes.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {catalogue.map((scheme) => {
            const isSelected = selectedSchemes.includes(scheme.id);

            return (
              <button
                key={scheme.id}
                type="button"
                onClick={() => toggleScheme(scheme.id)}
                className={cn(
                  'group flex min-h-24 items-center gap-3 rounded-2xl border-2 border-black p-3 text-left shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5',
                  isSelected ? 'bg-black text-white' : 'bg-white text-gray-900',
                )}
                aria-pressed={isSelected}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold uppercase tracking-wide">{scheme.label}</p>
                    <span
                      className={cn(
                        'rounded-full border border-current px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        isSelected ? 'bg-white text-black' : 'bg-transparent text-inherit',
                      )}
                    >
                      {isSelected ? 'Selected' : 'Add'}
                    </span>
                  </div>
                  <p className={cn('mt-1 text-xs leading-4', isSelected ? 'text-gray-200' : 'text-gray-600')}>
                    {scheme.description}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <ApprovalSchemeLogoBadge scheme={scheme} isSelected={isSelected} />

                  <span
                    className={cn(
                      'inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-black',
                      isSelected ? 'bg-white text-black' : 'bg-gray-100 text-transparent',
                    )}
                    aria-hidden="true"
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
