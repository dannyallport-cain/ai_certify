import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type PageHeroProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  aside?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
  size?: 'default' | 'compact';
};

/**
 * The single hero used by every marketing page, so the top of the site
 * always has the same weight, spacing and atmosphere.
 */
export function PageHero({
  eyebrow,
  title,
  description,
  children,
  aside,
  align = 'left',
  className,
  size = 'default',
}: PageHeroProps) {
  const isCentered = align === 'center';

  return (
    <section
      className={cn(
        'relative overflow-hidden bg-slate-950 text-white',
        size === 'compact' ? 'py-14 sm:py-16' : 'py-16 sm:py-24',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_15%_0%,rgba(37,99,235,0.38),transparent_55%),radial-gradient(90%_90%_at_85%_10%,rgba(34,211,238,0.22),transparent_50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]"
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            'flex flex-col gap-10',
            aside ? 'lg:flex-row lg:items-center lg:gap-16' : '',
          )}
        >
          <div className={cn('min-w-0 flex-1', isCentered && 'mx-auto max-w-3xl text-center')}>
            {eyebrow ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100 backdrop-blur">
                {eyebrow}
              </span>
            ) : null}

            <h1
              className={cn(
                'mt-5 text-balance font-bold tracking-tight text-white',
                size === 'compact'
                  ? 'text-3xl sm:text-4xl'
                  : 'text-4xl leading-[1.08] sm:text-5xl lg:text-6xl',
              )}
            >
              {title}
            </h1>

            {description ? (
              <p
                className={cn(
                  'mt-5 max-w-2xl text-pretty text-base leading-8 text-slate-300 sm:text-lg',
                  isCentered && 'mx-auto',
                )}
              >
                {description}
              </p>
            ) : null}

            {children ? (
              <div
                className={cn(
                  'mt-8 flex flex-col gap-3 sm:flex-row sm:items-center',
                  isCentered && 'sm:justify-center',
                )}
              >
                {children}
              </div>
            ) : null}
          </div>

          {aside ? <div className="min-w-0 flex-1">{aside}</div> : null}
        </div>
      </div>
    </section>
  );
}
