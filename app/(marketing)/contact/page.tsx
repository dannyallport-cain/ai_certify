import Link from 'next/link';
import { Building2, LifeBuoy, PhoneCall, Zap } from 'lucide-react';

import { ContactForm } from '@/components/marketing/ContactForm';
import { InfoCard } from '@/components/marketing/InfoCard';
import { PageHero } from '@/components/marketing/PageHero';
import { Reveal } from '@/components/marketing/Reveal';
import { Section, SectionHeading } from '@/components/marketing/Section';

export const metadata = {
  title: 'Contact | AI-Certificates',
  description:
    'Ask about templates, pricing, housing workflows or mobile capture. Send a message and the AI-Certificates team will reply.',
};

const reasons = [
  {
    title: 'Talk to sales',
    description: 'Plan rollouts for multiple engineers, teams or housing stock.',
    href: '/pricing',
    icon: Building2,
  },
  {
    title: 'Get product help',
    description: 'Account access, templates, mobile capture or billing questions.',
    href: '/support',
    icon: LifeBuoy,
  },
  {
    title: 'Try the AI demo',
    description: 'See OCR and photo analysis work on a real certificate image.',
    href: '/ai-analysis',
    icon: Zap,
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        size="compact"
        eyebrow="Contact"
        title="Talk to the team behind AI-Certificates"
        description="Questions about templates, pricing, housing workflows or mobile capture? Send a message and we will reply to the email address you provide."
      />

      <Section tone="white">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <Reveal className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">We are here to help</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
                AI-Certificates is built by Cain Enabled Engineering Ltd. Whether you are converting your
                first PDF certificate or rolling out reporting across a housing team, we would rather hear
                about it early.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
                The form is our preferred route for new enquiries — it reaches the right inbox and keeps the
                details together.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60">
              <PhoneCall className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                Existing customer?
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                The <Link href="/support" className="font-medium text-blue-600 underline underline-offset-4 dark:text-blue-400">support page</Link>{' '}
                covers the fastest routes for account, billing and data requests.
              </p>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <ContactForm />
          </Reveal>
        </div>
      </Section>

      <Section tone="muted">
        <SectionHeading
          eyebrow="Before you write"
          title="You might find the answer here"
          description="These three pages cover most of the questions we get asked."
        />

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {reasons.map((reason, index) => (
            <Reveal key={reason.href} delay={index * 80}>
              <InfoCard
                title={reason.title}
                description={reason.description}
                href={reason.href}
                icon={reason.icon}
                ctaLabel="Open"
                className="h-full"
              />
            </Reveal>
          ))}
        </div>
      </Section>
    </>
  );
}
