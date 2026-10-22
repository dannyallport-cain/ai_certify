'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { primaryNav, type NavGroup } from './nav';

type DesktopNavProps = {
  pathname: string;
};

const CLOSE_DELAY_MS = 140;

function isActiveGroup(group: NavGroup, pathname: string) {
  if (group.href && pathname === group.href) {
    return true;
  }
  return group.links.some((link) => pathname === link.href);
}

export function DesktopNav({ pathname }: DesktopNavProps) {
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  const openGroup = primaryNav.find((group) => group.id === openGroupId) ?? null;

  useEffect(() => {
    setOpenGroupId(null);
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenGroupId(null);
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenGroupId(null);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, []);

  useEffect(
    () => () => {
      if (closeTimer.current) {
        clearTimeout(closeTimer.current);
      }
    },
    [],
  );

  const scheduleClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
    }
    closeTimer.current = setTimeout(() => setOpenGroupId(null), CLOSE_DELAY_MS);
  };

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  return (
    <nav
      ref={navRef}
      aria-label="Primary"
      className="relative hidden items-center gap-1 lg:flex"
      onMouseLeave={scheduleClose}
    >
      {primaryNav.map((group) => {
        const hasMenu = group.links.length > 0;
        const isOpen = openGroupId === group.id;
        const isActive = isActiveGroup(group, pathname);

        if (!hasMenu && group.href) {
          return (
            <Link
              key={group.id}
              href={group.href}
              className={cn(
                'rounded-full px-3.5 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
              )}
            >
              {group.label}
            </Link>
          );
        }

        return (
          <button
            key={group.id}
            type="button"
            aria-expanded={isOpen}
            aria-haspopup="true"
            aria-controls={`nav-panel-${group.id}`}
            onMouseEnter={() => {
              cancelClose();
              setOpenGroupId(group.id);
            }}
            onFocus={() => {
              cancelClose();
              setOpenGroupId(group.id);
            }}
            onClick={() => setOpenGroupId(isOpen ? null : group.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors',
              isOpen || isActive
                ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
            )}
          >
            {group.label}
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform duration-200', isOpen && 'rotate-180')}
            />
          </button>
        );
      })}

      <div
        className={cn(
          'absolute left-1/2 top-full z-50 w-[min(46rem,calc(100vw-4rem))] -translate-x-1/2 pt-3 transition-all duration-200 ease-out',
          openGroup
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-1 opacity-0',
        )}
        aria-hidden={!openGroup}
      >
        {primaryNav.map((group) => {
          const isOpen = openGroupId === group.id;

          return (
            <div
              key={group.id}
              id={`nav-panel-${group.id}`}
              className={cn(
                'rounded-3xl border border-slate-200 bg-white/95 p-3 shadow-2xl shadow-slate-900/10 backdrop-blur-xl transition-opacity duration-150 dark:border-slate-800 dark:bg-slate-900/95',
                isOpen ? 'block' : 'hidden',
              )}
            >
              {group.description ? (
                <p className="px-3 pb-2 pt-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  {group.description}
                </p>
              ) : null}

              <div className="grid gap-1 sm:grid-cols-2">
                {group.links.map((link) => {
                  const Icon = link.icon;
                  const isCurrent = pathname === link.href;

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpenGroupId(null)}
                      className={cn(
                        'group flex items-start gap-3 rounded-2xl p-3 transition-colors',
                        isCurrent
                          ? 'bg-slate-100 dark:bg-slate-800'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60',
                      )}
                    >
                      {Icon ? (
                        <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-500/10 dark:text-blue-300">
                          <Icon className="h-[18px] w-[18px]" />
                        </span>
                      ) : null}
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">
                            {link.label}
                          </span>
                          {link.tag ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                              {link.tag}
                            </span>
                          ) : null}
                        </span>
                        {link.description ? (
                          <span className="mt-0.5 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                            {link.description}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
