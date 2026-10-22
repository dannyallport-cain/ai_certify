import Link from 'next/link';
import { Code2, Compass, GraduationCap, HeartHandshake, MapPin, Smartphone } from 'lucide-react';

import { CallToAction } from '@/components/marketing/CallToAction';
import { InfoCard } from '@/components/marketing/InfoCard';
import { PageHero } from '@/components/marketing/PageHero';
import { Reveal } from '@/components/marketing/Reveal';
import { Section, SectionHeading } from '@/components/marketing/Section';

export const metadata = {
  title: 'Careers | AI-Certificates',
  description:
    'How we work at AI-Certificates, the kinds of people we hire, and how to send a speculative application.',
};

const values = [
  {
    title: 'Ship what the field needs',
    description:
      'Decisions are tested against one question: does this help someone finish a real inspection faster and more accurately?',
    icon: Compass,
  },
  {
    title: 'Small, senior, direct',
    description:
      'People own their area end to end, from the database migration to the copy on the screen. Less process, more judgement.',
    icon: Code2,
  },
  {
    title: 'Respect the paperwork',
    description:
      'Certificates carry legal weight. We treat accuracy, traceability and clear wording as product features, not chores.',
    icon: HeartHandshake,
  },
  {
    title: 'Learn the trade',
    description:
      'You do not need to be an electrician, but you will need to understand BS 5839, EICRs and CP12 well enough to challenge a design.',
    icon: GraduationCap,
  },
];

const roles = [
  {
    title: 'Full-stack engineer',
    detail: 'Next.js, TypeScript, PostgreSQL, React Native',
    type: 'Remote (UK) · Full time',
  },
  {
    title: 'Product designer with field-research instincts',
    detail: 'Mobile-first flows, document editors, data-dense dashboards',
    type: 'Contract or full time',
  },
  {
    title: 'Customer engineer (electrical or fire background)',
    detail: 'Template builds, onboarding, workflow reviews with customers',
    type: 'Remote (UK) · Full time',
  },
];

export default function CareersPage() {
  return (
    <>
      <PageHero
        eyebrow="Careers"
        title="Build software the trades actually keep using"
        description="We are a small team making certification and reporting less painful for engineers, contractors and housing teams. If that sounds worth doing properly, we would like to hear from you."
      >
        <Link
          href="/contact"
          className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-slate-950 transition-all hover:-translate-y-0.5 hover:bg-slate-100"
        >
          Send an introduction
        </Link>
      </PageHero>

      <Section tone="white">
        <SectionHeading
          eyebrow="How we work"
          title="What you can expect"
          description="No layers of management, no invented urgency. Clear problems, real users, and time to solve things properly."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {values.map((value, index) => (
            <Reveal key={value.title} delay={index * 70}>
              <InfoCard
                title={value.title}
                description={value.description}
                icon={value.icon}
                className="h-full"
              />
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="muted">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <SectionHeading
            align="left"
            eyebrow="Open roles"
            title="What we are hiring for right now"
            description="These are the areas where we would grow fastest. If your skills sit slightly to one side of a role, tell us how."
            className="max-w-none"
          />

          <div className="space-y-4">
            {roles.map((role, index) => (
              <Reveal
                key={role.title}
                delay={index * 70}
                className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">{role.title}</h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{role.detail}</p>
                </div>
                <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <MapPin className="h-3.5 w-3.5" />
                  {role.type}
                </p>
              </Reveal>
            ))}

            <Reveal delay={240} className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 dark:border-slate-700 dark:bg-slate-900/40">
              <div className="flex gap-3">
                <Smartphone className="mt-0.5 h-5 w-5 flex-none text-blue-600 dark:text-blue-400" />
                <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                  Nothing here matches you exactly? Send a short note about what you are good at and something
                  you have built or fixed. We read everything.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </Section>

      <CallToAction
        tone="white"
        title="Interested but not applying yet?"
        description="Ask us anything about the product, the stack or how the team works. We answer plainly."
        primaryHref="/contact"
        primaryLabel="Get in touch"
        secondaryHref="/about"
        secondaryLabel="About the company"
      />
    </>
  );
}
