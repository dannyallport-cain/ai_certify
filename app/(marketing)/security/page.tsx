import Link from 'next/link';
import {
  Database,
  FileLock2,
  KeyRound,
  Lock,
  Mail,
  ServerCog,
  ShieldCheck,
  Users,
} from 'lucide-react';

import { CallToAction } from '@/components/marketing/CallToAction';
import { InfoCard } from '@/components/marketing/InfoCard';
import { PageHero } from '@/components/marketing/PageHero';
import { Reveal } from '@/components/marketing/Reveal';
import { Section, SectionHeading } from '@/components/marketing/Section';

export const metadata = {
  title: 'Security | AI-Certificates',
  description:
    'How AI-Certificates protects certificates, customer records and uploaded documents: access control, encryption in transit, storage isolation and retention.',
};

const controls = [
  {
    title: 'Encrypted in transit',
    description:
      'Every request between your browser, the field app and our servers runs over HTTPS with modern TLS.',
    icon: Lock,
  },
  {
    title: 'Isolated document storage',
    description:
      'Templates, generated certificates and uploaded evidence live in object storage with scoped, signed access rather than public URLs.',
    icon: FileLock2,
  },
  {
    title: 'Role-based access',
    description:
      'Team members only see the certificates, customers and templates their role and team membership allow.',
    icon: Users,
  },
  {
    title: 'Credential hygiene',
    description:
      'Passwords are stored as salted hashes. API keys and integrations secrets are held server-side and never shipped to the browser.',
    icon: KeyRound,
  },
  {
    title: 'Managed database',
    description:
      'Production data runs on a managed PostgreSQL instance with restricted network access and routine backups.',
    icon: Database,
  },
  {
    title: 'Operational visibility',
    description:
      'Failed sign-ins, integration errors and background jobs are logged so unusual activity can be investigated.',
    icon: ServerCog,
  },
];

const dataPractices = [
  'We collect the minimum needed to run the service: account details, team membership, the documents you upload and the outputs generated from them.',
  'AI processing is used to read document layouts and extract fields. We do not sell your data or use customer documents to train public models.',
  'Records can be deleted on request, subject to the compliance retention described in the privacy policy.',
  'Third-party processors are limited to infrastructure, email delivery, payments and AI processing — each used only for the function they provide.',
];

export default function SecurityPage() {
  return (
    <>
      <PageHero
        eyebrow="Security"
        title="Your certificates are compliance records. We treat them that way."
        description="Certification data has to be accurate, attributable and available when a customer or regulator asks. These are the controls behind that promise."
      />

      <Section tone="white">
        <SectionHeading
          eyebrow="Controls"
          title="What protects your data"
          description="A short, honest summary of the measures in place today — you can verify the ones that matter to you in practice."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {controls.map((control, index) => (
            <Reveal key={control.title} delay={index * 60}>
              <InfoCard
                title={control.title}
                description={control.description}
                icon={control.icon}
                className="h-full"
              />
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="muted">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <SectionHeading
            align="left"
            eyebrow="Data handling"
            title="How we treat customer records"
            description="Straightforward practices, written so they can be checked rather than just claimed."
            className="max-w-none"
          />

          <Reveal delay={80} className="space-y-4">
            {dataPractices.map((practice) => (
              <div
                key={practice}
                className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
              >
                <ShieldCheck className="mt-0.5 h-5 w-5 flex-none text-emerald-500" />
                <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">{practice}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </Section>

      <Section tone="white">
        <Reveal className="rounded-[2rem] border border-slate-200 bg-slate-50 p-8 sm:p-10 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <span className="inline-flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-blue-600 text-white">
              <Mail className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Reporting a security concern
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                If you believe you have found a vulnerability, please contact us before disclosing it publicly.
                Include the steps to reproduce the issue and any affected URLs or accounts. We will acknowledge
                the report, keep you updated while we investigate, and credit you if you would like.
              </p>
              <Link
                href="/contact"
                className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                Contact the team
              </Link>
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                Full detail on data collection, retention and deletion is in the{' '}
                <Link href="/privacy" className="font-medium text-blue-600 underline underline-offset-4 dark:text-blue-400">
                  privacy policy
                </Link>
                .
              </p>
            </div>
          </div>
        </Reveal>
      </Section>

      <CallToAction
        tone="muted"
        title="Need a security conversation before you roll out?"
        description="We will talk through hosting region, retention, access model and the integrations your team relies on."
        primaryHref="/contact"
        primaryLabel="Talk to us"
        secondaryHref="/terms"
        secondaryLabel="Read the terms"
      />
    </>
  );
}
