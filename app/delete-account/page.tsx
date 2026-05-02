import Link from 'next/link';
import { Footer } from '@/components/landing/Footer';
import { Header } from '@/components/landing/Header';

const lastUpdated = '2 May 2026';

export default function DeleteAccountPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950">
      <Header />

      <main className="flex-grow">
        <section className="border-b border-slate-200 bg-slate-50 py-16 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="container mx-auto max-w-5xl px-4">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
              Account Deletion
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white md:text-5xl">
              Request deletion of your account or personal data
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              Use this page to submit a request to delete your AI-Certificates or AI Certify Field account and
              associated personal data.
            </p>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Last updated: {lastUpdated}
            </p>
          </div>
        </section>

        <div className="container mx-auto max-w-5xl px-4 py-16">
          <div className="space-y-8">
            <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">How to request deletion</h2>
              <ol className="mt-4 list-decimal space-y-3 pl-6 text-slate-600 dark:text-slate-300">
                <li>Send us a request using the contact page.</li>
                <li>Include the email address associated with the account.</li>
                <li>Tell us whether you want the full account deleted or only specific data removed.</li>
                <li>We may ask for additional information to verify the request and protect your account.</li>
              </ol>
              <Link
                href="/contact"
                className="mt-6 inline-flex rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Open contact form
              </Link>
            </section>

            <section className="grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">What may be deleted</h2>
                <ul className="mt-4 space-y-3 text-slate-600 dark:text-slate-300">
                  <li>• Account profile data</li>
                  <li>• Login access and session data</li>
                  <li>• Support messages tied to the account</li>
                  <li>• User-uploaded files that are not required to be retained</li>
                </ul>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">What may be retained</h2>
                <ul className="mt-4 space-y-3 text-slate-600 dark:text-slate-300">
                  <li>• Records we must keep for legal, tax, or compliance reasons</li>
                  <li>• Backups that are overwritten in the normal course of operations</li>
                  <li>• Fraud prevention or security logs where required</li>
                </ul>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-8 dark:border-slate-800 dark:bg-slate-900/60">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">What happens next</h2>
              <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
                Once we verify the request, we will delete or anonymise personal data where possible and confirm
                completion by email. If some data must be retained, we will explain why and limit access to it.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Need help?</h2>
              <p className="leading-7 text-slate-600 dark:text-slate-300">
                If you have questions about data deletion, account closure, or privacy rights, please review our{' '}
                <Link href="/privacy" className="font-medium text-blue-600 underline underline-offset-4 dark:text-blue-400">
                  privacy policy
                </Link>{' '}
                or{' '}
                <Link href="/support" className="font-medium text-blue-600 underline underline-offset-4 dark:text-blue-400">
                  support page
                </Link>
                .
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
