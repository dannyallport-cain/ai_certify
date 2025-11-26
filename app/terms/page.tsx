import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-950">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto prose dark:prose-invert">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-8">Terms of Service</h1>
          
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
            Last updated: November 26, 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">1. Acceptance of Terms</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              By accessing and using AI-Certificates ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">2. Use of Service</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              You agree to use the Service only for purposes that are permitted by (a) the Terms and (b) any applicable law, regulation or generally accepted practices or guidelines in the relevant jurisdictions. You agree not to access (or attempt to access) any of the Services by any means other than through the interface that is provided by AI-Certificates.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">3. User Accounts</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              To access certain features of the Service, you may be required to create an account. You are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer, and you agree to accept responsibility for all activities that occur under your account or password.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">4. Intellectual Property</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              The Service and its original content, features and functionality are and will remain the exclusive property of AI-Certificates and its licensors. The Service is protected by copyright, trademark, and other laws of both the United States and foreign countries.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">5. Termination</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              We may terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">6. Limitation of Liability</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              In no event shall AI-Certificates, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
