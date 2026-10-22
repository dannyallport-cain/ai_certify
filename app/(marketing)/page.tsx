import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Edit3,
  FileCheck,
  Layers,
  Lock,
  Shield,
  Smartphone,
  Sparkles,
  Zap,
} from 'lucide-react';

import { CallToAction } from '@/components/marketing/CallToAction';
import { InfoCard } from '@/components/marketing/InfoCard';
import { PageHero } from '@/components/marketing/PageHero';
import { Reveal } from '@/components/marketing/Reveal';
import { Section, SectionHeading } from '@/components/marketing/Section';

export const metadata = {
  title: 'AI-Certificates — Certification, reporting and field capture',
  description:
    'Turn the certificates and reports you already issue into digital workflows: AI template mapping, mobile capture and finished PDFs from real site data.',
};

const highlights = [
  { icon: Shield, label: 'Built for BS5839, BS5266, EICR and CP12 work' },
  { icon: Smartphone, label: 'Mobile capture that feeds the same report' },
  { icon: Lock, label: 'Secure storage for issued documents' },
];

const capabilities = [
  {
    icon: FileCheck,
    title: 'Certification & reporting',
    description:
      'Turn inspection PDFs into reusable certificate and reporting templates that produce consistent, professional results every time.',
  },
  {
    icon: Zap,
    title: 'Automatic template creation',
    description:
      'Let AI detect fields, layout hints and structure so you can create document templates much faster from the PDFs you already use.',
  },
  {
    icon: Layers,
    title: 'Fire alarm floorplans',
    description:
      'Build and refine floorplans for fire alarm documentation, with visual tools for accurate placement and layout control.',
  },
  {
    icon: Edit3,
    title: 'Mobile scan capture',
    description:
      'Scan on site, capture evidence, and turn real-world observations into structured document outputs without retyping.',
  },
  {
    icon: Shield,
    title: 'Compliance ready',
    description:
      'Keep outputs consistent, auditable and ready for customer delivery, internal review or certification workflows.',
  },
  {
    icon: Lock,
    title: 'Secure real results',
    description:
      'Generate finished documents from live site data and store the results safely for reuse, export and delivery.',
  },
];

const steps = [
  {
    step: '01',
    title: 'Upload and analyse your PDF',
    description:
      'Import the certificate, report or floorplan template you already use and let AI detect structure, fields and likely entry areas.',
  },
  {
    step: '02',
    title: 'Map, edit and capture',
    description:
      'Adjust the layout, place fields, add labels or branding, then scan with your mobile device when you need real site data.',
  },
  {
    step: '03',
    title: 'Generate real results',
    description:
      'Produce polished, accurate outputs for certification and reporting, then reuse the template whenever you need that workflow again.',
  },
];

const audiences = [
  {
    title: 'Electrical contractors',
    description: 'EICRs and certificates generated from records your engineers already collect on site.',
    href: '/features',
  },
  {
    title: 'Fire safety teams',
    description: 'BS5839 and BS5266 documentation, extinguisher checks and floorplan work in one place.',
    href: '/features#capabilities',
  },
  {
    title: 'Housing associations',
    description: 'Void inspections, stock condition surveys and compliance reporting across your stock.',
    href: '/housing-associations',
  },
];

export default function HomePage() {
  return (
    <>
      <PageHero
        eyebrow="Certification and reporting platform"
        title="Turn inspections and reports into smart, auto-filled documents"
        description="Create document templates from your existing PDFs, capture real site data on mobile, and generate finished certification outputs with far less manual work."
        aside={
          <div className="relative">
            <div className="absolute -inset-4 rounded-[2.5rem] bg-cyan-500/20 blur-3xl" aria-hidden />
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl">
              <div className="relative aspect-[4/3]">
                <Image
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1600"
                  alt="AI-Certificates dashboard"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
              </div>

              <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-2">
                <div className="flex items-center gap-3 rounded-2xl bg-slate-950/85 p-3 backdrop-blur">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">Certification ready</p>
                    <p className="text-xs text-slate-400">Generated from your own template</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-slate-950/85 p-3 backdrop-blur">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15">
                    <Zap className="h-5 w-5 text-blue-400" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">Mobile scan captured</p>
                    <p className="text-xs text-slate-400">Real results generated from site data</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }
      >
        <Link
          href="/sign-up"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-slate-950 transition-all hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-xl hover:shadow-cyan-500/20"
        >
          Start free trial
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/contact"
          className="inline-flex h-12 items-center justify-center rounded-full border border-white/25 px-6 text-sm font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/10"
        >
          Book a demo
        </Link>
      </PageHero>

      <Section tone="white" padding="compact">
        <Reveal className="grid gap-4 sm:grid-cols-3">
          {highlights.map((highlight) => {
            const Icon = highlight.icon;

            return (
              <div key={highlight.label} className="flex items-center gap-3">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <Icon className="h-4 w-4" />
                </span>
                <p className="text-sm font-medium leading-6 text-slate-700 dark:text-slate-300">
                  {highlight.label}
                </p>
              </div>
            );
          })}
        </Reveal>
      </Section>

      <Section tone="muted" id="capabilities">
        <SectionHeading
          eyebrow="What it does"
          title="Built for the field and powered by AI"
          description="Give the office and field teams the same workflow: capture evidence on mobile, let AI help structure the template, and generate polished outputs without rework."
        />

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((capability, index) => (
            <Reveal key={capability.title} delay={Math.min(index * 60, 240)}>
              <InfoCard
                title={capability.title}
                description={capability.description}
                icon={capability.icon}
                className="h-full"
              />
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/features"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            Explore all features
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/ai-analysis"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Sparkles className="h-4 w-4" />
            Try the AI demo
          </Link>
        </Reveal>
      </Section>

      <Section tone="white" id="how-it-works">
        <SectionHeading
          eyebrow="How it works"
          title="From a static PDF to a live workflow in three steps"
          description="No rebuilding your documents from scratch, and no specialist design tools."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((item, index) => (
            <Reveal
              key={item.step}
              delay={index * 90}
              className="relative rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="text-sm font-bold tracking-[0.2em] text-blue-600 dark:text-blue-400">
                {item.step}
              </span>
              <h3 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.description}</p>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-8">
          <Link
            href="/how-it-works"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            See the full workflow with examples
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </Section>

      <Section tone="muted">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
          <SectionHeading
            align="left"
            eyebrow="Who it is for"
            title="One platform, the certificates each trade actually issues"
            description="Templates and workflows are grouped by the work you do, not by our internal modules."
            className="max-w-none"
          />

          <div className="grid gap-3">
            {audiences.map((audience, index) => (
              <Reveal key={audience.title} delay={index * 70}>
                <Link
                  href={audience.href}
                  className="group flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700"
                >
                  <div>
                    <p className="text-base font-semibold text-slate-900 dark:text-white">{audience.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {audience.description}
                    </p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 flex-none text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" />
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      <Section tone="white" padding="compact">
        <Reveal className="grid gap-8 rounded-[2rem] border border-slate-200 bg-slate-50 p-8 sm:grid-cols-3 sm:p-10 dark:border-slate-800 dark:bg-slate-900/60">
          {[
            { value: '3 steps', label: 'From PDF upload to a reusable template' },
            { value: '1 record', label: 'Shared between the field app and the finished report' },
            { value: '14 days', label: 'Free trial, no card required' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {stat.value}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{stat.label}</p>
            </div>
          ))}
        </Reveal>
      </Section>

      <CallToAction
        title="Ready to modernise your certification workflow?"
        description="Build reusable templates, create fire alarm floorplans, scan on mobile, and deliver real results without manual rework."
        primaryHref="/sign-up"
        primaryLabel="Get started now"
        secondaryHref="/pricing"
        secondaryLabel="See pricing"
      />
    </>
  );
}
