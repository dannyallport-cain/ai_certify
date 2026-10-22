'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';

import { cn } from '@/lib/utils';
import { BrandMark } from './BrandMark';
import { DesktopNav } from './DesktopNav';
import { MobileNav } from './MobileNav';
import { ScrollProgress } from './ScrollProgress';

export function Header() {
  const pathname = usePathname() ?? '/';
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 w-full border-b transition-[background-color,box-shadow,border-color] duration-300',
          scrolled
            ? 'border-slate-200/80 bg-white/85 shadow-[0_8px_30px_-24px_rgba(15,23,42,0.6)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/85'
            : 'border-transparent bg-white/70 backdrop-blur-md dark:bg-slate-950/70',
        )}
      >
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <BrandMark />

          <DesktopNav pathname={pathname} />

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:inline-flex dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="hidden h-10 items-center justify-center rounded-full bg-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-blue-600/30 sm:inline-flex"
            >
              Get started
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        <ScrollProgress />
      </header>

      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} pathname={pathname} />
    </>
  );
}
