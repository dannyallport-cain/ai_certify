import Link from 'next/link';
import { ArrowLeft, Compass } from 'lucide-react';

import { Footer } from '@/components/marketing/Footer';
import { Header } from '@/components/marketing/Header';

const suggestions = [
  { label: 'Features', href: '/features' },
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Support', href: '/support' },
];

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-white dark:bg-slate-950">
      <Header />

      <main className="flex flex-1 items-center px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-xl text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <Compass className="h-6 w-6" />
          </span>

          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
            Error 404
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            That page is not here
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
            The page may have moved, been renamed, or never existed. Try one of these instead.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {suggestions.map((suggestion) => (
              <Link
                key={suggestion.href}
                href={suggestion.href}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {suggestion.label}
              </Link>
            ))}
          </div>

          <Link
            href="/"
            className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-blue-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
