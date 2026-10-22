import Link from 'next/link';
import { BookOpen, Clock, LifeBuoy, MessageSquare, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';

import { CallToAction } from '@/components/marketing/CallToAction';
import { InfoCard } from '@/components/marketing/InfoCard';
import { PageHero } from '@/components/marketing/PageHero';
import { Reveal } from '@/components/marketing/Reveal';
import { Section, SectionHeading } from '@/components/marketing/Section';

export const metadata = {
  title: 'Support | AI-Certificates',
  description:
    'Get help with AI-Certificates and AI Certify Field: account access, billing, mobile capture, privacy and data deletion.',
};

const lastUpdated = '2 May 2026';

const commonIssues = [
  'Camera or location permissions not granted on device',
  'Sign-in or password reset issues',
  'Sync delays for reports, templates, or certificates',
  'Questions about subscriptions or billing',
  'Requests to delete an account or personal data',
];

const resources = [
  {
    title: 'Privacy policy',
    description: 'Learn what data we collect, how we use it, and how to request deletion.',
    href: '/privacy',
    icon: ShieldCheck,
  },
  {
    title: 'Terms and conditions',
    description: 'Read the rules for using the service, subscriptions, and acceptable use.',
    href: '/terms',
    icon: BookOpen,
  },
  {
    title: 'Delete your account',
    description: 'Follow the steps to request account or data deletion.',
    href: '/delete-account',
    icon: Trash2,
  },
];

export default function SupportPage() {
  return (
    <>
      <PageHero
        size="compact"
        eyebrow="Support"
        title="Support for AI-Certificates and AI Certify Field"
        description="Use this page to find help with the web platform, mobile app, billing, privacy, and account deletion requests."
      >
        <p className="text-sm text-slate-400">Last updated: {lastUpdated}</p>
      </PageHero>

      <Section tone="white">
        <div className="grid gap-6 md:grid-cols-2">
          <Reveal>
            <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                <MessageSquare className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">Contact support</h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                For help with login issues, subscription questions, missing data, or app behaviour, please use
                our contact page.
              </p>
              <Link
                href="/contact"
                className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Open contact form
              </Link>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
                <LifeBuoy className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">Common issues</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {commonIssues.map((issue) => (
                  <li key={issue} className="flex gap-2">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-slate-300 dark:bg-slate-600" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </Section>

      <Section tone="muted">
        <SectionHeading
          eyebrow="Self-service"
          title="Resources you can use right away"
          description="Most account, privacy, and data questions are answered in these pages."
        />

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {resources.map((resource, index) => (
            <Reveal key={resource.href} delay={index * 80}>
              <InfoCard
                title={resource.title}
                description={resource.description}
                href={resource.href}
                icon={resource.icon}
                ctaLabel="Read more"
                className="h-full"
              />
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="white">
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900/60">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-950">
              <Clock className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">
              Response expectations
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              We aim to respond to support requests within a reasonable time frame during normal business
              hours. If your message concerns account access, billing, or data deletion, please include the
              email address used on the account and enough detail for us to locate the request safely.
            </p>
          </Reveal>

          <Reveal delay={80} className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900/60">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-950">
              <Smartphone className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">Mobile permissions</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Field capture needs camera access, and site context features may ask for location. You can grant
              or revoke these permissions at any time in your device settings — the web dashboard continues to
              work without them.
            </p>
          </Reveal>
        </div>
      </Section>

      <CallToAction
        tone="muted"
        title="Still stuck on something?"
        description="Send us the details and we will help you get the workflow moving again."
        primaryHref="/contact"
        primaryLabel="Contact support"
        secondaryHref="/how-it-works"
        secondaryLabel="How it works"
      />
    </>
  );
}
