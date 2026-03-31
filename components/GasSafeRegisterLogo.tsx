import Image from 'next/image';

import { cn } from '@/lib/utils';

type GasSafeRegisterLogoProps = {
  className?: string;
  imageClassName?: string;
  sizes?: string;
  priority?: boolean;
};

export function GasSafeRegisterLogo({
  className,
  imageClassName,
  sizes = '96px',
  priority = false,
}: GasSafeRegisterLogoProps) {
  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-xl border border-amber-200 bg-white p-2 shadow-sm',
        className,
      )}
    >
      <Image
        src="/gas-safe-vector-6231473.webp"
        alt="Gas Safe Register logo"
        fill
        sizes={sizes}
        priority={priority}
        className={cn('object-contain', imageClassName)}
      />
    </div>
  );
}