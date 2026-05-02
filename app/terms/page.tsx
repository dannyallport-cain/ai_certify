import Link from 'next/link';
import { Footer } from '@/components/landing/Footer';
import { Header } from '@/components/landing/Header';

const lastUpdated = '2 May 2026';

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950">
      <Header />

      <main className="flex-grow">
        <section className="border-b border-slate-200 bg-slate-50 py-16 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="container mx-auto max-w-5xl px-4">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
              Terms and Conditions
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white md:text-5xl">
              Terms of Service for AI-Certificates and AI Certify Field
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              These terms govern your use of our website, dashboard, and mobile application provided by Cain
              Enabled Engineering Ltd.
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
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">Use the service lawfully</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Use the platform only for lawful business purposes and in accordance with these terms.
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950/60">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">Keep your account secure</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    You are responsible for the activity on your account and for keeping credentials safe.
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950/60">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">Know the limits</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    AI features assist with workflows, but you remain responsible for the final output and use.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">1. Acceptance of terms</h2>
              <p className="leading-7 text-slate-600 dark:text-slate-300">
                By accessing or using AI-Certificates, AI Certify Field, or related services, you agree to these
                terms and any additional policies referenced here, including our{' '}
                <Link href="/privacy" className="font-medium text-blue-600 underline underline-offset-4 dark:text-blue-400">
                  privacy policy
                </Link>
                .
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">2. The service</h2>
              <p className="leading-7 text-slate-600 dark:text-slate-300">
                Our platform helps businesses create, store, and manage certificates, inspection records, reports,
                templates, and related data. Some features may depend on a subscription, external integrations, or
                device permissions such as camera and location access.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">3. Account registration</h2>
              <p className="leading-7 text-slate-600 dark:text-slate-300">
                You may need to create an account to use certain features. You must provide accurate information,
                keep your credentials confidential, and notify us promptly if you believe your account has been
                compromised.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">4. User content</h2>
              <p className="leading-7 text-slate-600 dark:text-slate-300">
                You retain ownership of the content you upload or create in the service. You grant us a limited
                licence to host, process, transmit, display, and back up that content solely to operate and improve
                the service, provide support, and fulfil our contractual obligations.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">5. AI and automation features</h2>
              <p className="leading-7 text-slate-600 dark:text-slate-300">
                AI-assisted suggestions, OCR, and template-detection tools are provided to help streamline your
                workflow. These features may produce incomplete or inaccurate output. You are responsible for
                reviewing and approving all generated content before using it in production, compliance, or customer
                communications.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">6. Subscriptions and payments</h2>
              <p className="leading-7 text-slate-600 dark:text-slate-300">
                If you purchase a subscription or other paid service, you agree to the pricing, billing cycle,
                renewal, cancellation, and refund terms shown at the point of purchase. We may use third-party
                payment processors to handle transactions securely.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">7. Acceptable use</h2>
              <p className="leading-7 text-slate-600 dark:text-slate-300">
                You must not misuse the service, including by attempting unauthorised access, interfering with
                system integrity, uploading malicious code, scraping without permission, or using the platform in
                violation of applicable law or regulation.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">8. Service changes and availability</h2>
              <p className="leading-7 text-slate-600 dark:text-slate-300">
                We may update, suspend, or discontinue features from time to time. We do not guarantee uninterrupted
                availability, and maintenance or outages may temporarily affect access to the service.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">9. Suspension and termination</h2>
              <p className="leading-7 text-slate-600 dark:text-slate-300">
                We may suspend or terminate access if we reasonably believe you have breached these terms, created a
                security risk, or used the service in a way that may harm us, other users, or third parties.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">10. Intellectual property</h2>
              <p className="leading-7 text-slate-600 dark:text-slate-300">
                The service, including its software, branding, and content provided by us, remains the property of
                Cain Enabled Engineering Ltd. and its licensors. You may not copy, modify, distribute, or create
                derivative works except as permitted by law or with our written consent.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">11. Disclaimer and liability</h2>
              <p className="leading-7 text-slate-600 dark:text-slate-300">
                The service is provided on an “as is” and “as available” basis to the extent permitted by law. To
                the maximum extent permitted by law, we are not liable for indirect, incidental, consequential, or
                special damages, or for losses arising from inaccurate user input, third-party services, or use of
                generated content without review.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">12. Governing law and changes</h2>
              <p className="leading-7 text-slate-600 dark:text-slate-300">
                These terms are governed by the laws applicable in the United Kingdom unless local mandatory law
                requires otherwise. We may update these terms from time to time, and the revised version will be
                posted on this page with a new effective date.
              </p>
            </section>

            <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-8 dark:border-slate-800 dark:bg-slate-900/60">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Contact</h2>
              <p className="leading-7 text-slate-600 dark:text-slate-300">
                If you have questions about these terms, please use our{' '}
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
