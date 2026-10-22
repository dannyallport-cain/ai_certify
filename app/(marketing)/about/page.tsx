import Link from 'next/link';
import { ArrowRight, ClipboardList, FileStack, ScanLine, Smartphone } from 'lucide-react';

import { CallToAction } from '@/components/marketing/CallToAction';
import { InfoCard } from '@/components/marketing/InfoCard';
import { PageHero } from '@/components/marketing/PageHero';
import { Reveal } from '@/components/marketing/Reveal';
import { Section, SectionHeading } from '@/components/marketing/Section';

export const metadata = {
  title: 'About | AI-Certificates',
  description:
    'AI-Certificates is built by Cain Enabled Engineering Ltd. to turn the certificates and reports engineers already use into fast, accurate digital workflows.',
};

const pillars = [
  {
    title: 'Start from your documents',
    description:
      'Every team already has certificates and reports that customers recognise. We digitise those, instead of forcing a new format on you.',
    icon: FileStack,
  },
  {
    title: 'Capture where the work happens',
    description:
      'Site evidence, photos and readings should be recorded on site, not retyped in an office a week later.',
    icon: Smartphone,
  },
  {
    title: 'Automate the boring parts',
    description:
      'AI reads layouts, spots blank fields and merges live data so engineers spend time inspecting, not formatting.',
    icon: ScanLine,
  },
  {
    title: 'Keep it auditable',
    description:
      'Compliance work needs a clean trail: who inspected what, when, and which document was issued.',
    icon: ClipboardList,
  },
];

const stats = [
  { value: '6', label: 'Certificate families supported' },
  { value: '2', label: 'Platforms: web dashboard and field app' },
  { value: '1', label: 'Template library per team, reusable forever' },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About"
        title="Built by engineers who were tired of retyping certificates"
        description="AI-Certificates is a product of Cain Enabled Engineering Ltd. We build tooling for the people who inspect, test and certify buildings — starting from the paperwork they already trust."
      >
        <Link
          href="/how-it-works"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-slate-950 transition-all hover:-translate-y-0.5 hover:bg-slate-100"
        >
          See how it works
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/contact"
          className="inline-flex h-12 items-center justify-center rounded-full border border-white/25 px-6 text-sm font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/10"
        >
          Talk to us
        </Link>
      </PageHero>

      <Section tone="white">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-16">
          <SectionHeading
            align="left"
            eyebrow="Why we built this"
            title="The certificate was never the hard part"
            description="The hard part is everything around it: reading handwriting from site, chasing photographs, re-keying customer details, and rebuilding the same PDF for the hundredth time."
            className="max-w-none"
          />

          <Reveal delay={80} className="space-y-5 text-sm leading-7 text-slate-600 dark:text-slate-300">
            <p>
              Electrical, fire and gas work all follow the same shape. An engineer inspects a real building,
              records what they found, and issues a document that a customer or regulator will rely on. The
              inspection needs judgement. The document should not.
            </p>
            <p>
              We started by asking engineers to hand over the PDFs they already use — BS 5839 certificates,
              EICRs, CP12 records, floorplans. From there we built the missing middle: a visual editor that
              maps fields onto those documents, AI that finds the blank areas for you, and a mobile app that
              fills them with real site data.
            </p>
            <p>
              The result is a report that looks like the one your customer expects, produced in minutes rather
              than evenings, with a record of exactly how it was assembled.
            </p>
          </Reveal>
        </div>
      </Section>

      <Section tone="muted">
        <SectionHeading
          eyebrow="Principles"
          title="Four things we refuse to compromise on"
          description="They shape every feature we ship and every feature we turn down."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {pillars.map((pillar, index) => (
            <Reveal key={pillar.title} delay={index * 70}>
              <InfoCard
                title={pillar.title}
                description={pillar.description}
                icon={pillar.icon}
                className="h-full"
              />
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="white">
        <Reveal className="rounded-[2rem] border border-slate-200 bg-slate-50 p-8 sm:p-12 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="grid gap-10 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{stat.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </Section>

      <CallToAction
        tone="muted"
        title="Want to see it against your own certificates?"
        description="Bring a PDF you already issue and we will walk through how it becomes a template, a mobile workflow and a finished report."
        primaryHref="/contact"
        primaryLabel="Book a walkthrough"
        secondaryHref="/features"
        secondaryLabel="Browse features"
      />
    </>
  );
}
