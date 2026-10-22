import Link from 'next/link';
import { Shield } from 'lucide-react';

import { cn } from '@/lib/utils';

type BrandMarkProps = {
  className?: string;
  tone?: 'default' | 'light';
  href?: string;
};

export function BrandMark({ className, tone = 'default', href = '/' }: BrandMarkProps) {
  return (
    <Link
      href={href}
      className={cn('group inline-flex items-center gap-2.5', className)}
      aria-label="AI-Certificates home"
    >
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/25 transition-transform duration-300 group-hover:scale-105">
        <Shield className="h-[18px] w-[18px] text-white" strokeWidth={2.25} />
      </span>
      <span
        className={cn(
          'text-lg font-bold tracking-tight',
          tone === 'light'
            ? 'text-white'
            : 'bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-white dark:to-slate-300',
        )}
      >
        AI-Certificates
      </span>
    </Link>
  );
}
