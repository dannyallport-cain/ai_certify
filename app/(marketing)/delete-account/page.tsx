import Link from 'next/link';
import { CheckCircle2, Clock, FileWarning, Mail, ShieldCheck } from 'lucide-react';

import { CallToAction } from '@/components/marketing/CallToAction';
import { PageHero } from '@/components/marketing/PageHero';
import { Reveal } from '@/components/marketing/Reveal';
import { Section, SectionHeading } from '@/components/marketing/Section';

export const metadata = {
  title: 'Delete your account | AI-Certificates',
  description:
    'Request deletion of your AI-Certificates or AI Certify Field account and associated personal data.',
};

const lastUpdated = '2 May 2026';

const steps = [
  'Send us a request using the contact page.',
  'Include the email address associated with the account.',
  'Tell us whether you want the full account deleted or only specific data removed.',
  'We may ask for additional information to verify the request and protect your account.',
];

const deleted = [
  'Account profile data',
  'Login access and session data',
  'Support messages tied to the account',
  'User-uploaded files that are not required to be retained',
];

const retained = [
  'Records we must keep for legal, tax, or compliance reasons',
  'Backups that are overwritten in the normal course of operations',
  'Fraud prevention or security logs where required',
];

export default function DeleteAccountPage() {
  return (
    <>
      <PageHero
        size="compact"
        eyebrow="Account Deletion"
        title="Request deletion of your account or personal data"
        description="Use this page to submit a request to delete your AI-Certificates or AI Certify Field account and associated personal data."
      >
        <p className="text-sm text-slate-400">Last updated: {lastUpdated}</p>
      </PageHero>

      <Section tone="white">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          <Reveal>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">How to request deletion</h2>
            <ol className="mt-6 space-y-4">
              {steps.map((step, index) => (
                <li key={step} className="flex gap-4">
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <p className="pt-1 text-sm leading-7 text-slate-600 dark:text-slate-300">{step}</p>
                </li>
              ))}
            </ol>
            <Link
              href="/contact"
              className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-blue-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <Mail className="h-4 w-4" />
              Open contact form
            </Link>
          </Reveal>

          <Reveal delay={80} className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/60">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-950">
              <Clock className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">What happens next</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Once we verify the request, we will delete or anonymise personal data where possible and confirm
              completion by email. If some data must be retained, we will explain why and limit access to it.
            </p>
          </Reveal>
        </div>
      </Section>

      <Section tone="muted">
        <SectionHeading
          eyebrow="Scope"
          title="What is deleted and what may be kept"
          description="Deletion is handled carefully so compliance records are not lost while personal data is removed."
        />

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Reveal className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">What may be deleted</h3>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {deleted.map((item) => (
                <li key={item} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={80} className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
              <FileWarning className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">What may be retained</h3>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {retained.map((item) => (
                <li key={item} className="flex gap-3">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-amber-400" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </Section>

      <Section tone="white" padding="compact">
        <Reveal className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Need help?</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                If you have questions about data deletion, account closure, or privacy rights, please review
                our <Link href="/privacy" className="font-medium text-blue-600 underline underline-offset-4 dark:text-blue-400">privacy policy</Link>{' '}
                or <Link href="/support" className="font-medium text-blue-600 underline underline-offset-4 dark:text-blue-400">support page</Link>.
              </p>
            </div>
          </div>
        </Reveal>
      </Section>

      <CallToAction
        title="Want to keep your records instead?"
        description="You can export certificates and reports before closing an account, or talk to us about a plan that fits your team."
        primaryHref="/support"
        primaryLabel="Talk to support"
        secondaryHref="/pricing"
        secondaryLabel="View pricing"
      />
    </>
  );
}
