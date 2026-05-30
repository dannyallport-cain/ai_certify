'use client';

import { ApprovalSchemeId, APPROVAL_SCHEMES } from '@/lib/approval-schemes';
import { cn } from '@/lib/utils';

type ApprovalSchemeSelectorProps = {
  selectedSchemes: ApprovalSchemeId[];
  onChange: (nextSchemes: ApprovalSchemeId[]) => void;
  className?: string;
};

export function ApprovalSchemeSelector({
  selectedSchemes,
  onChange,
  className,
}: ApprovalSchemeSelectorProps) {
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
          <p className="text-sm font-semibold text-gray-900">Trade association logos</p>
          <p className="text-sm text-gray-600">
            Pick the logos you want shown on your profile and on generated EICR reports.
          </p>
        </div>
        <div className="rounded-full border-2 border-black bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-700 shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
          {selectedSchemes.length} selected
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {APPROVAL_SCHEMES.map((scheme) => {
          const isSelected = selectedSchemes.includes(scheme.id);

          return (
            <button
              key={scheme.id}
              type="button"
              onClick={() => toggleScheme(scheme.id)}
              className={cn(
                'group flex min-h-24 items-stretch gap-3 rounded-2xl border-2 border-black p-3 text-left shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5',
                isSelected ? 'bg-black text-white' : 'bg-white text-gray-900',
              )}
              aria-pressed={isSelected}
            >
              <div
                className={cn(
                  'flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-black text-lg font-black uppercase shadow-[2px_2px_0_0_rgba(0,0,0,1)]',
                  isSelected ? 'bg-white text-black' : 'text-white',
                )}
                style={{ backgroundColor: isSelected ? '#ffffff' : scheme.accentColor }}
              >
                {scheme.logoSrc ? (
                  <img
                    src={scheme.logoSrc}
                    alt={scheme.logoAlt ?? `${scheme.label} logo`}
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  scheme.symbol
                )}
              </div>

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

              <div className="flex items-start pt-1">
                <span
                  className={cn(
                    'inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-black text-[11px] font-black',
                    isSelected ? 'bg-white text-black' : 'bg-gray-100 text-transparent',
                  )}
                >
                  ✓
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
