import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';

type InfoCardProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  href?: string;
  ctaLabel?: string;
  children?: React.ReactNode;
  className?: string;
};

/**
 * The standard content card used across marketing pages, so cards in
 * different sections look and behave the same way.
 */
export function InfoCard({
  title,
  description,
  icon: Icon,
  href,
  ctaLabel,
  children,
  className,
}: InfoCardProps) {
  const content = (
    <>
      {Icon ? (
        <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
          <Icon className="h-5 w-5" />
        </span>
      ) : null}

      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>

      {description ? (
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      ) : null}

      {children}

      {ctaLabel ? (
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400">
          {ctaLabel}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      ) : null}
    </>
  );

  const baseClasses = cn(
    'rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 dark:border-slate-800 dark:bg-slate-900',
    className,
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          baseClasses,
          'group block hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10 dark:hover:border-blue-700',
        )}
      >
        {content}
      </Link>
    );
  }

  return <div className={baseClasses}>{content}</div>;
}
