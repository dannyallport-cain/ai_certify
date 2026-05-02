import Link from 'next/link';
import { Footer } from '@/components/landing/Footer';
import { Header } from '@/components/landing/Header';

const lastUpdated = '2 May 2026';

export default function SupportPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950">
      <Header />

      <main className="flex-grow">
        <section className="border-b border-slate-200 bg-slate-50 py-16 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="container mx-auto max-w-5xl px-4">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
              Support
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white md:text-5xl">
              Support for AI-Certificates and AI Certify Field
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              Use this page to find help with the web platform, mobile app, billing, privacy, and account
              deletion requests.
            </p>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Last updated: {lastUpdated}
            </p>
          </div>
        </section>

        <div className="container mx-auto max-w-5xl px-4 py-16">
          <div className="space-y-8">
            <section className="grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Contact support</h2>
                <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
                  For help with login issues, subscription questions, missing data, or app behaviour, please use
                  our contact page.
                </p>
                <Link
                  href="/contact"
                  className="mt-6 inline-flex rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Open contact form
                </Link>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Common issues</h2>
                <ul className="mt-4 space-y-3 text-slate-600 dark:text-slate-300">
                  <li>• Camera or location permissions not granted on device</li>
                  <li>• Sign-in or password reset issues</li>
                  <li>• Sync delays for reports, templates, or certificates</li>
                  <li>• Questions about subscriptions or billing</li>
                  <li>• Requests to delete an account or personal data</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Self-service resources</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <Link
                  href="/privacy"
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-blue-700 dark:hover:bg-slate-900"
                >
                  <h3 className="font-semibold text-slate-900 dark:text-white">Privacy policy</h3>
                  <p className="mt-2 text-sm leading-6">
                    Learn what data we collect, how we use it, and how to request deletion.
                  </p>
                </Link>

                <Link
                  href="/terms"
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-blue-700 dark:hover:bg-slate-900"
                >
                  <h3 className="font-semibold text-slate-900 dark:text-white">Terms and conditions</h3>
                  <p className="mt-2 text-sm leading-6">
                    Read the rules for using the service, subscriptions, and acceptable use.
                  </p>
                </Link>

                <Link
                  href="/delete-account"
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-blue-700 dark:hover:bg-slate-900"
                >
                  <h3 className="font-semibold text-slate-900 dark:text-white">Delete your account</h3>
                  <p className="mt-2 text-sm leading-6">
                    Follow the steps to request account or data deletion.
                  </p>
                </Link>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-8 dark:border-slate-800 dark:bg-slate-900/60">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Response expectations</h2>
              <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
                We aim to respond to support requests within a reasonable time frame during normal business hours.
                If your message concerns account access, billing, or data deletion, please include the email address
                used on the account and enough detail for us to locate the request safely.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
