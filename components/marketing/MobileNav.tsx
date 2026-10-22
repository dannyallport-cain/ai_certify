'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { ArrowRight, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { primaryNav } from './nav';

type MobileNavProps = {
  open: boolean;
  onClose: () => void;
  pathname: string;
};

export function MobileNav({ open, onClose, pathname }: MobileNavProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-[60] lg:hidden',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close menu"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />

      <div
        className={cn(
          'absolute inset-x-0 top-0 max-h-[100dvh] overflow-y-auto rounded-b-[2rem] border-b border-slate-200 bg-white shadow-2xl transition-all duration-300 ease-out dark:border-slate-800 dark:bg-slate-950',
          open ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0',
        )}
      >
        <div className="flex items-center justify-between px-5 pb-2 pt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Menu</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav aria-label="Mobile" className="px-5 pb-6">
          {primaryNav.map((group, groupIndex) => (
            <div
              key={group.id}
              className="border-b border-slate-100 py-3 last:border-b-0 dark:border-slate-800"
              style={{
                transitionDelay: open ? `${80 + groupIndex * 40}ms` : '0ms',
              }}
            >
              {group.links.length === 0 && group.href ? (
                <Link
                  href={group.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center justify-between py-1.5 text-base font-semibold',
                    pathname === group.href
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-900 dark:text-white',
                  )}
                >
                  {group.label}
                  <ArrowRight className="h-4 w-4 opacity-40" />
                </Link>
              ) : (
                <>
                  <p className="py-1.5 text-base font-semibold text-slate-900 dark:text-white">
                    {group.label}
                  </p>
                  <div className="mt-1 grid gap-0.5">
                    {group.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={onClose}
                        className={cn(
                          'rounded-xl px-3 py-2 text-sm transition-colors',
                          pathname === link.href
                            ? 'bg-blue-50 font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white',
                        )}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}

          <div className="mt-6 grid gap-2">
            <Link
              href="/sign-up"
              onClick={onClose}
              className="inline-flex h-12 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Get started
            </Link>
            <Link
              href="/login"
              onClick={onClose}
              className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Sign in
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}
