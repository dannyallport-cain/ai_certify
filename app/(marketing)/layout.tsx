import '@/app/globals.css';

import { Footer } from '@/components/marketing/Footer';
import { Header } from '@/components/marketing/Header';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-white dark:bg-slate-950">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-slate-950 focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <Header />

      <main id="main-content" className="flex-1">
        {children}
      </main>

      <Footer />
    </div>
  );
}
