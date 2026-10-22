import Image from 'next/image';
import Link from 'next/link';
import {
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  House,
  LayoutGrid,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { CallToAction } from '@/components/marketing/CallToAction';
import { InfoCard } from '@/components/marketing/InfoCard';
import { PageHero } from '@/components/marketing/PageHero';
import { Reveal } from '@/components/marketing/Reveal';
import { Section, SectionHeading } from '@/components/marketing/Section';

export const metadata = {
  title: 'Housing associations & local authorities | AI-Certificates',
  description:
    'Certificates and reports for housing teams: void inspections, stock condition surveys, damp and mould, communal areas, gas safety and electrical compliance.',
};

const certificates = [
  {
    title: 'CP12 gas safety',
    description: 'Landlord gas safety records for tenanted homes and managed properties.',
  },
  {
    title: 'EICR / electrical inspection',
    description: 'Electrical installation reporting for rented homes and housing stock.',
  },
  {
    title: 'Fire alarm / BS5839',
    description: 'Fire detection and alarm inspection workflows for communal and managed sites.',
  },
  {
    title: 'Emergency lighting / BS5266',
    description: 'Inspection and testing for escape lighting in blocks and common areas.',
  },
  {
    title: 'Fire extinguisher checks',
    description: 'Portable fire extinguishers across shared spaces, offices and schemes.',
  },
  {
    title: 'Dry riser checks',
    description: 'Dry riser inspection records for multi-storey blocks and larger developments.',
  },
];

const reports = [
  {
    title: 'Void property inspection report',
    description:
      'Room-by-room end-of-tenancy inspections with photos, defects, meter readings and key handover notes.',
  },
  {
    title: 'Pre-termination survey',
    description:
      'Capture issues before a tenant leaves so void works and scheduling can start earlier.',
  },
  {
    title: 'Stock condition survey',
    description:
      'Track component condition, remaining life and replacement planning across your housing stock.',
  },
  {
    title: 'Damp, mould and condensation survey',
    description:
      'Evidence-led survey notes for resolving the root causes of damp and mould issues.',
  },
  {
    title: 'Communal area inspection',
    description:
      'Inspect shared hallways, lifts, lighting, bins, landscaping and security across estates.',
  },
  {
    title: 'Plant room / M&E inspection',
    description:
      'Capture boiler rooms, pumps, plant assets and maintenance readings in one place.',
  },
  {
    title: 'Legionella / water hygiene log',
    description:
      'Track outlet temperatures, flushing and routine hygiene checks for compliance logs.',
  },
  {
    title: 'Contractor access / permit-to-work',
    description:
      'Record site access, RAMS checks and permit conditions for works inside housing assets.',
  },
];

const benefits = [
  'Keep housing void and compliance evidence in one secure workflow',
  'Capture on mobile, review in the office, generate from the same data',
  'Produce polished PDFs your contractors and auditors recognise',
  'Link the template pack to the right team members and billing entitlement',
];

const workflow = [
  {
    title: 'Void properties and handovers',
    description: 'Room-by-room evidence, meter readings, keys and defects in one record.',
  },
  {
    title: 'Stock condition and planned works',
    description: 'Component condition and remaining life captured consistently across stock.',
  },
  {
    title: 'Communal and estate inspections',
    description: 'Shared areas, plant rooms and estate assets inspected against the same template.',
  },
  {
    title: 'Compliance logs and site records',
    description: 'Dated, attributable records for gas, electrical and fire safety work.',
  },
];

export default function HousingAssociationsPage() {
  return (
    <>
      <PageHero
        eyebrow="Housing associations & local authorities"
        title="Certificates and reports built for housing teams"
        description="A dedicated workspace for voids, stock condition surveys, compliance inspections and property reporting across housing stock and managed estates."
        aside={
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
              <Image
                src="/housing-associations/hero.svg"
                alt="Housing certificate and report dashboard illustration"
                width={1200}
                height={800}
                priority
                className="h-56 w-full object-cover"
              />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
                <Image
                  src="/housing-associations/inspection.svg"
                  alt="Housing inspection workflow illustration"
                  width={1200}
                  height={800}
                  className="h-32 w-full object-cover"
                />
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-cyan-400/15 p-2.5">
                    <House className="h-5 w-5 text-cyan-300" />
                  </span>
                  <p className="text-sm font-semibold text-white">Ready for housing operations</p>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-300">
                  Polished PDFs, mobile capture and consistent reporting for every property visit.
                </p>
              </div>
            </div>
          </div>
        }
      >
        <Link
          href="/subscription"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-slate-950 transition-all hover:-translate-y-0.5 hover:bg-slate-100"
        >
          <Sparkles className="h-4 w-4" />
          Get the template pack
        </Link>
        <Link
          href="/pricing"
          className="inline-flex h-12 items-center justify-center rounded-full border border-white/25 px-6 text-sm font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/10"
        >
          View pricing
        </Link>
      </PageHero>

      <Section tone="white" padding="compact">
        <Reveal className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {benefits.map((benefit) => (
            <div
              key={benefit}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60"
            >
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">{benefit}</p>
            </div>
          ))}
        </Reveal>
      </Section>

      <Section tone="muted" id="certificates">
        <SectionHeading
          eyebrow="Certificates"
          title="Compliance documents your teams already issue"
          description="These are the certificate workflows most commonly needed by councils, housing associations and property teams managing multiple homes and sites."
        />

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {certificates.map((item, index) => (
            <Reveal key={item.title} delay={Math.min(index * 50, 200)}>
              <InfoCard title={item.title} description={item.description} icon={ShieldCheck} className="h-full" />
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="white" id="reports">
        <SectionHeading
          eyebrow="Operational reports"
          title="Property reports for voids, stock and estates"
          description="The template pack also covers the reporting work that supports compliance and asset management."
        />

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((item, index) => (
            <Reveal key={item.title} delay={Math.min(index * 40, 200)}>
              <InfoCard title={item.title} description={item.description} icon={FileText} className="h-full" />
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="muted">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <Reveal className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-blue-50 p-3 dark:bg-blue-500/10">
                <LayoutGrid className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Why it helps
                </p>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  A focused place for housing documents
                </h2>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {workflow.map((step) => (
                <div
                  key={step.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <ClipboardCheck className="h-5 w-5 text-emerald-500" />
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{step.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={80} className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Access
            </p>
            <h2 className="mt-3 text-xl font-bold">Add the pack to your subscription</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              The housing template pack is an additional subscription add-on and can be enabled after
              checkout. Once active, the relevant certificates and reports appear in your account.
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/subscription"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-100"
              >
                <Building2 className="h-4 w-4" />
                Purchase access
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/25 text-sm font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/10"
              >
                Sign in
              </Link>
            </div>
          </Reveal>
        </div>
      </Section>

      <CallToAction
        tone="white"
        title="Rolling this out across a housing team?"
        description="We can walk through the template pack, the retention model and how mobile capture fits the way your surveyors already work."
        primaryHref="/contact"
        primaryLabel="Book a walkthrough"
        secondaryHref="/security"
        secondaryLabel="Security & data"
      />
    </>
  );
}
