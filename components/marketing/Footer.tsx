import Link from 'next/link';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';

import { BrandMark } from './BrandMark';
import { footerColumns, legalLinks } from './nav';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
          <div className="max-w-sm">
            <BrandMark />
            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Turn the certificates, reports and floorplans you already use into digital workflows
              that capture real site data and generate finished documents.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Operated by Cain Enabled Ltd
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {footerColumns.map((column) => (
              <div key={column.heading}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  {column.heading}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={`${column.heading}-${link.label}`}>
                      <Link
                        href={link.href}
                        className="text-sm text-slate-600 transition-colors hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-slate-200 pt-6 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-500">
            &copy; {year} AI-Certificates. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400"
            >
              Start free trial
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
