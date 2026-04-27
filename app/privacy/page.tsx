import { Footer } from '@/components/landing/Footer';
import { Header } from '@/components/landing/Header';

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950">
      <Header />
      <main className="container mx-auto flex-grow px-4 py-20">
        <div className="prose prose-slate mx-auto max-w-4xl dark:prose-invert">
          <h1 className="mb-4 text-4xl font-bold text-slate-900 dark:text-white">Privacy Policy</h1>
          <p className="mb-8 text-lg text-slate-600 dark:text-slate-400">
            ai-certificates.app
            <br />
            Last updated: 27 April 2026
          </p>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-slate-900 dark:text-white">1. Introduction</h2>
            <p className="mb-4 text-slate-600 dark:text-slate-400">
              This Privacy Policy explains how ai-certificates.app (“we”, “us”, or “our”) collects, uses, stores,
              and protects personal information when you use our website and mobile app. We respect your privacy and
              aim to be clear about what data we process and why.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-slate-900 dark:text-white">2. Information we collect</h2>
            <p className="mb-4 text-slate-600 dark:text-slate-400">
              Depending on how you use the app, we may collect the following types of information:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-slate-600 dark:text-slate-400">
              <li>
                <strong>Account information</strong> such as your name, email address, and account identifiers.
              </li>
              <li>
                <strong>Inspection content</strong> such as notes, forms, reports, certificates, and other content
                you enter into the app.
              </li>
              <li>
                <strong>Photos and videos</strong> that you capture or upload for inspections or reports.
              </li>
              <li>
                <strong>Location data</strong> when you allow the app to access device location for field work or job
                context.
              </li>
              <li>
                <strong>Device and usage data</strong> such as app interactions, crash information, and technical
                diagnostics.
              </li>
              <li>
                <strong>Contact details</strong> if you submit them through forms, support requests, or customer
                records.
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-slate-900 dark:text-white">3. How we use your information</h2>
            <p className="mb-4 text-slate-600 dark:text-slate-400">
              We use collected information to provide, maintain, and improve the app and related services. This
              includes:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-slate-600 dark:text-slate-400">
              <li>Creating and managing user accounts</li>
              <li>Saving and displaying inspection records</li>
              <li>Generating certificates and reports</li>
              <li>Supporting customer and job workflows</li>
              <li>Synchronising data between connected services where enabled</li>
              <li>Diagnosing bugs, crashes, and performance issues</li>
              <li>Responding to support requests</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-slate-900 dark:text-white">4. Sharing and disclosure</h2>
            <p className="mb-4 text-slate-600 dark:text-slate-400">
              We do not sell your personal information. We may share data only when necessary to operate the app,
              for example with service providers that help us host, sync, secure, or support the app. We may also
              disclose information if required by law or to protect our rights, users, or systems.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-slate-900 dark:text-white">5. Data retention</h2>
            <p className="mb-4 text-slate-600 dark:text-slate-400">
              We keep personal information only for as long as necessary to provide the app, meet legal obligations,
              resolve disputes, and enforce agreements. You can request deletion of your account or data by contacting
              us using the details below.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-slate-900 dark:text-white">6. Security</h2>
            <p className="mb-4 text-slate-600 dark:text-slate-400">
              We use reasonable technical and organisational safeguards to protect your information. No method of
              transmission or storage is completely secure, so we cannot guarantee absolute security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-slate-900 dark:text-white">7. Your rights and choices</h2>
            <p className="mb-4 text-slate-600 dark:text-slate-400">
              Depending on your location, you may have rights to access, correct, delete, or restrict the use of your
              personal information. You may also be able to withdraw permissions such as camera or location access
              through your device settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-slate-900 dark:text-white">8. Children’s privacy</h2>
            <p className="mb-4 text-slate-600 dark:text-slate-400">
              ai-certificates.app is not intended for children under 13, and we do not knowingly collect personal
              information from children under 13.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-slate-900 dark:text-white">9. Changes to this policy</h2>
            <p className="mb-4 text-slate-600 dark:text-slate-400">
              We may update this Privacy Policy from time to time. When we do, we will revise the date shown at the
              top of this page.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-slate-900 dark:text-white">10. Contact us</h2>
            <p className="mb-4 text-slate-600 dark:text-slate-400">
              If you have any questions about this Privacy Policy or your data, please use our{' '}
              <a href="/contact" className="font-medium text-blue-600 underline dark:text-blue-400">
                contact page
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
