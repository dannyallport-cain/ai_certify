'use client';

import { useEffect, useState } from 'react';
import type { ApprovalSchemeInfo } from '@/lib/approval-schemes';
import { cn } from '@/lib/utils';

type ApprovalSchemeLogoBadgeProps = {
  scheme: ApprovalSchemeInfo;
  isSelected: boolean;
};

/**
 * Renders a scheme's logo inside the badge tile.
 *
 * Logos come from the database as either a bundled path (e.g. `/logos/stroma.png`)
 * or an inline data URI uploaded through the admin screen. When the logo is
 * absent — or the stored path no longer resolves — the tile falls back to the
 * scheme symbol so the badge never renders as an empty or broken tile.
 */
export function ApprovalSchemeLogoBadge({
  scheme,
  isSelected,
}: ApprovalSchemeLogoBadgeProps) {
  const [hasLoadFailed, setHasLoadFailed] = useState(false);
  const logoSrc = scheme.logoSrc?.trim() ?? '';

  useEffect(() => {
    setHasLoadFailed(false);
  }, [logoSrc]);

  const shouldShowLogo = logoSrc.length > 0 && !hasLoadFailed;

  return (
    <div
      className={cn(
        'flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border-2 border-black text-lg font-black uppercase shadow-[2px_2px_0_0_rgba(0,0,0,1)]',
        isSelected ? 'bg-white text-black' : 'text-white',
      )}
      style={{ backgroundColor: isSelected ? '#ffffff' : scheme.accentColor }}
    >
      {shouldShowLogo ? (
        <img
          src={logoSrc}
          alt={scheme.logoAlt?.trim() || `${scheme.label} logo`}
          className="h-full w-full object-contain p-1"
          loading="lazy"
          decoding="async"
          onError={() => setHasLoadFailed(true)}
        />
      ) : (
        scheme.symbol
      )}
    </div>
  );
}
