import Link from 'next/link';
import { Footer } from '@/components/landing/Footer';
import { Header } from '@/components/landing/Header';

const lastUpdated = '2 May 2026';

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950">
      <Header />

      <main className="flex-grow">
        <section className="border-b border-slate-200 bg-slate-50 py-16 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="container mx-auto max-w-5xl px-4">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
              Privacy Policy
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white md:text-5xl">
              Privacy Policy for AI-Certificates and AI Certify Field
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              This policy explains how Cain Enabled Engineering Ltd. collects, uses, stores, and protects
              information when you use our website, dashboard, and mobile app.
            </p>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Last updated: {lastUpdated}
            </p>
          </div>
        </section>

        <div className="container mx-auto max-w-5xl px-4 py-16">
          <div className="space-y-8">
            <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950/60">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">What we collect</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Account details, inspection data, photos, device information, billing data, and support
                    messages.
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950/60">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">Why we use it</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    To provide templates, generate reports, support AI features, process payments, and keep the
                    service secure.
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950/60">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">Your choices</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    You can contact us for access, correction, deletion, or to withdraw permissions such as camera
                    and location access.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">1. Scope</h2>
              <p className="leading-7 text-slate-600 dark:text-slate-300">
                This policy applies to AI-Certificates, AI Certify Field, and related services operated by Cain
                Enabled Engineering Ltd. It covers our website, admin tools, mobile applications, and any support
                channels that link to this policy.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">2. Information we collect</h2>
              <p className="leading-7 text-slate-600 dark:text-slate-300">
                Depending on how you use the service, we may collect the following categories of information:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-slate-600 dark:text-slate-300">
                <li>
                  <strong>Account information</strong> such as your name, email address, organisation name, login
                  credentials, and profile settings.
                </li>
                <li>
                  <strong>Business and inspection content</strong> such as certificates, reports, forms, notes,
                  observations, measurements, and uploaded files.
                </li>
                <li>
                  <strong>Media</strong> such as photos or videos you capture or upload for inspections, evidence,
                  or support requests.
                </li>
                <li>
                  <strong>Device and usage data</strong> such as device type, operating system, browser type, app
                  interactions, crash reports, and diagnostic logs.
                </li>
                <li>
                  <strong>Location data</strong> when you grant permission for field work, site context, or other
                  app features that require it.
                </li>
                <li>
                  <strong>Billing and transaction data</strong> if you purchase a subscription or paid service
                  through us or a payment processor.
                </li>
                <li>
                  <strong>Communications</strong> such as support requests, feedback, and messages sent through our
                  forms or email channels.
                </li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">3. How we use information</h2>
              <p className="leading-7 text-slate-600 dark:text-slate-300">
                We use information to run and improve the platform, including to:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-slate-600 dark:text-slate-300">
                <li>Create and manage user accounts and organisation workspaces.</li>
                <li>Store and display inspection records, certificates, and generated documents.</li>
                <li>Power AI-assisted workflows, OCR, template detection, and field mapping.</li>
                <li>Process subscriptions, payments, invoices, and refunds where applicable.</li>
                <li>Provide customer support, troubleshoot bugs, and maintain service security.</li>
                <li>Send service notifications, important updates, and account-related communications.</li>
                <li>Meet legal, tax, compliance, and audit obligations.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">4. Legal bases and sharing</h2>
              <p className="leading-7 text-slate-600 dark:text-slate-300">
                Where applicable, we rely on contract performance, legitimate interests, consent, and legal
                obligations to process personal data. We do not sell personal information.
              </p>
              <p className="leading-7 text-slate-600 dark:text-slate-300">
                We may share information with service providers that help us host, secure, analyse, process
                payments, send communications, or run AI and document-processing features. We may also share data
                with organisation administrators when the account is managed by a business customer, or if we are
                required to do so by law.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">5. Data retention and deletion</h2>
              <p className="leading-7 text-slate-600 dark:text-slate-300">
                We keep personal information only for as long as necessary to provide the service, meet legal and
                accounting obligations, resolve disputes, and enforce agreements. Some inspection records or audit
                data may need to be retained longer if they form part of a customer’s compliance history or if law
                requires it.
              </p>
              <p className="leading-7 text-slate-600 dark:text-slate-300">
                To request deletion of your account or personal data, visit our{' '}
                <Link href="/delete-account" className="font-medium text-blue-600 underline underline-offset-4 dark:text-blue-400">
                  account deletion page
                </Link>{' '}
                or use our{' '}
                <Link href="/contact" className="font-medium text-blue-600 underline underline-offset-4 dark:text-blue-400">
                  contact page
                </Link>
                .
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">6. Cookies, permissions, and device access</h2>
              <p className="leading-7 text-slate-600 dark:text-slate-300">
                Our web app may use cookies or similar technologies for authentication, preferences, and session
                management. On mobile devices, the app may request access to the camera, photos, microphone,
                location, or notifications when those features are used. You can manage many permissions in your
                device settings.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">7. Security</h2>
              <p className="leading-7 text-slate-600 dark:text-slate-300">
                We use reasonable technical and organisational safeguards to protect information, including access
                controls, secure hosting, and monitoring for suspicious activity. No system is completely secure, so
                we cannot guarantee absolute security.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">8. International transfers</h2>
              <p className="leading-7 text-slate-600 dark:text-slate-300">
                If data is transferred outside your country, we take steps intended to protect it appropriately,
                including using trusted service providers and contractual safeguards where required.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">9. Children’s privacy</h2>
              <p className="leading-7 text-slate-600 dark:text-slate-300">
                Our services are not directed to children under 13, and we do not knowingly collect personal
                information from children under 13.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">10. Changes to this policy</h2>
              <p className="leading-7 text-slate-600 dark:text-slate-300">
                We may update this policy from time to time. When we do, we will revise the date at the top of this
                page and, where appropriate, notify users through the service or by email.
              </p>
            </section>

            <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-8 dark:border-slate-800 dark:bg-slate-900/60">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">11. Contact us</h2>
              <p className="leading-7 text-slate-600 dark:text-slate-300">
                If you have questions about this policy, privacy rights, or data deletion, please use our{' '}
                <Link href="/support" className="font-medium text-blue-600 underline underline-offset-4 dark:text-blue-400">
                  support page
                </Link>{' '}
                or{' '}
                <Link href="/contact" className="font-medium text-blue-600 underline underline-offset-4 dark:text-blue-400">
                  contact page
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
