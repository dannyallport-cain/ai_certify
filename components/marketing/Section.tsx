import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { Reveal } from './Reveal';

type SectionTone = 'white' | 'muted' | 'plain';
type SectionWidth = 'narrow' | 'default' | 'wide';

const toneClasses: Record<SectionTone, string> = {
  white: 'bg-white dark:bg-slate-950',
  muted: 'bg-slate-50 dark:bg-slate-900/40',
  plain: '',
};

const widthClasses: Record<SectionWidth, string> = {
  narrow: 'max-w-3xl',
  default: 'max-w-7xl',
  wide: 'max-w-[88rem]',
};

type SectionProps = {
  children: ReactNode;
  id?: string;
  tone?: SectionTone;
  width?: SectionWidth;
  className?: string;
  containerClassName?: string;
  padding?: 'default' | 'compact' | 'none';
};

export function Section({
  children,
  id,
  tone = 'white',
  width = 'default',
  className,
  containerClassName,
  padding = 'default',
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        'scroll-mt-20',
        toneClasses[tone],
        padding === 'default' && 'py-16 sm:py-20 lg:py-24',
        padding === 'compact' && 'py-10 sm:py-12',
        className,
      )}
    >
      <div
        className={cn(
          'mx-auto w-full px-4 sm:px-6 lg:px-8',
          widthClasses[width],
          containerClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}

type SectionHeadingProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
  tone?: 'light' | 'dark';
  className?: string;
  children?: ReactNode;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  tone = 'light',
  className,
  children,
}: SectionHeadingProps) {
  const isDark = tone === 'dark';

  return (
    <Reveal
      className={cn(
        'max-w-3xl',
        align === 'center' ? 'mx-auto text-center' : 'text-left',
        className,
      )}
    >
      {eyebrow ? (
        <p
          className={cn(
            'text-xs font-semibold uppercase tracking-[0.2em]',
            isDark ? 'text-cyan-300' : 'text-blue-600 dark:text-blue-400',
          )}
        >
          {eyebrow}
        </p>
      ) : null}

      <h2
        className={cn(
          'mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl',
          isDark ? 'text-white' : 'text-slate-900 dark:text-white',
        )}
      >
        {title}
      </h2>

      {description ? (
        <p
          className={cn(
            'mt-4 text-pretty text-base leading-8 sm:text-lg',
            isDark ? 'text-slate-300' : 'text-slate-600 dark:text-slate-300',
          )}
        >
          {description}
        </p>
      ) : null}

      {children}
    </Reveal>
  );
}
