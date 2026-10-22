import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Edit3,
  Layers,
  Lock,
  ScanLine,
  Shield,
  Smartphone,
  Zap,
} from 'lucide-react';

import { CallToAction } from '@/components/marketing/CallToAction';
import { InfoCard } from '@/components/marketing/InfoCard';
import { PageHero } from '@/components/marketing/PageHero';
import { Reveal } from '@/components/marketing/Reveal';
import { Section, SectionHeading } from '@/components/marketing/Section';

export const metadata = {
  title: 'Features | AI-Certificates',
  description:
    'AI template detection, a visual PDF field editor, dynamic data tokens, ServiceM8 mapping, mobile capture and secure document storage.',
};

const spotlight = [
  {
    id: 'mobile-capture',
    title: 'Mobile capture that keeps work moving',
    description:
      'Record site notes, capture photos and collect inspection evidence where the work happens, then let that information flow into the same certification and reporting workflow the office uses.',
    icon: Smartphone,
    points: [
      'Capture jobs, notes and photos in the field',
      'Reduce retyping between site and office teams',
      'Keep evidence tied to the right job and report',
    ],
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=1600',
  },
  {
    id: 'ai-detection',
    title: 'AI that accelerates template creation',
    description:
      'Let AI detect document structure, identify likely input areas, and speed up setup from static PDFs to reusable workflow templates for certification and reporting.',
    icon: Zap,
    points: [
      'AI-assisted blank-field and layout detection',
      'Faster setup from the PDFs you already use',
      'Less manual prep and fewer missing fields',
    ],
    image: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?auto=format&fit=crop&q=80&w=1600',
  },
];

type FeatureCard = {
  title: string;
  description: string;
  benefits: string[];
  icon: typeof Zap;
  href?: string;
  linkLabel?: string;
};

const features: FeatureCard[] = [
  {
    title: 'AI-powered template setup',
    description:
      'Bring your existing PDF reports into AI-Certificates and accelerate setup with AI blank-field detection. The platform identifies likely fillable areas automatically, helping your team convert static documents into smart templates without starting from zero.',
    benefits: [
      'Upload existing PDF certificate and report templates',
      'AI detects likely blank input areas automatically',
      'Reduce repetitive setup and manual template preparation',
    ],
    icon: Zap,
    href: '/ai-analysis',
    linkLabel: 'Try the live AI demo',
  },
  {
    title: 'Visual report template builder',
    description:
      'Use a visual builder to place fields exactly where they belong. Click to add, drag to draw, then resize and reposition with precision. Your team keeps full control over every mapped area, whether AI finds it first or you place it manually.',
    benefits: [
      'Manual field placement for total control',
      'Resize and reposition fields directly on the PDF',
      'Fast point-and-click editing with no specialist tools',
    ],
    icon: Layers,
  },
  {
    title: 'Text and branding editor',
    description:
      'Update customer-facing templates without leaving the platform. White-out and replace logos, headers, footers and text blocks so every generated report reflects your own branding, formatting and wording.',
    benefits: [
      'Replace logos, headers, footers and text directly in the PDF',
      'White-out unwanted supplier or legacy branding cleanly',
      'Control typography, placement and presentation',
    ],
    icon: Edit3,
  },
  {
    title: 'Dynamic auto-fill tokens',
    description:
      'Insert dynamic tokens anywhere you need live data to appear. Merge job, customer and company details into your reports automatically so every document is accurate, consistent and ready to send.',
    benefits: [
      'Use tokens such as {{job.address}} and {{client.name}}',
      'Auto-fill company details, contacts and job data',
      'Generate consistent reports without copy-and-paste errors',
    ],
    icon: Shield,
  },
  {
    title: 'ServiceM8 data mapping',
    description:
      'Connect your report templates to live ServiceM8 information so mapped fields pull through the right job, customer and company values at generation time, keeping workflows aligned with the data your team already relies on.',
    benefits: [
      'Map template fields to ServiceM8 job, customer and company data',
      'Keep generated reports aligned with live operational records',
      'Streamline report production across office and field',
    ],
    icon: BarChart3,
  },
  {
    title: 'Secure cloud storage',
    description:
      'Store templates, generated reports and supporting business data securely in the cloud. Your team gets reliable access to the latest files while sensitive customer and compliance information stays protected.',
    benefits: [
      'Secure storage for templates and generated documents',
      'Reliable access from anywhere your team works',
      'Built for safe handling of report and customer data',
    ],
    icon: Lock,
  },
];

export default function FeaturesPage() {
  return (
    <>
      <PageHero
        eyebrow="Features"
        title="Everything between a blank PDF and a finished certificate"
        description="Upload the templates you already use, map them visually, capture real data on site, and generate polished documents with AI assistance at every step."
      >
        <Link
          href="/sign-up"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-slate-950 transition-all hover:-translate-y-0.5 hover:bg-slate-100"
        >
          Start free trial
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/how-it-works"
          className="inline-flex h-12 items-center justify-center rounded-full border border-white/25 px-6 text-sm font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/10"
        >
          See the workflow
        </Link>
      </PageHero>

      <Section tone="white">
        <SectionHeading
          eyebrow="Built for office and field"
          title="One workflow from template to signed-off report"
          description="Most teams lose time at the handover between site and office. These two capabilities remove that handover entirely."
        />

        <div className="mt-12 space-y-12">
          {spotlight.map((item, index) => {
            const Icon = item.icon;

            return (
              <Reveal
                key={item.id}
                id={item.id}
                className="grid scroll-mt-24 gap-8 lg:grid-cols-2 lg:items-center lg:gap-16"
              >
                <div className={index % 2 === 1 ? 'lg:order-2' : undefined}>
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                    {item.description}
                  </p>
                  <ul className="mt-5 space-y-2.5">
                    {item.points.map((point) => (
                      <li key={point} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-500" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={index % 2 === 1 ? 'lg:order-1' : undefined}>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-slate-200 shadow-xl shadow-slate-900/5 dark:border-slate-800">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Section>

      <Section tone="muted" id="capabilities">
        <SectionHeading
          eyebrow="Capabilities"
          title="Six building blocks you can mix to fit your certificates"
          description="Use the whole set as one workflow, or start with template conversion and add capture later."
        />

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Reveal key={feature.title} delay={Math.min(index * 60, 240)}>
              <InfoCard
                title={feature.title}
                icon={feature.icon}
                href={feature.href}
                ctaLabel={feature.linkLabel}
                className="h-full"
              >
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {feature.description}
                </p>
                <ul className="mt-4 space-y-2">
                  {feature.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-500" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </InfoCard>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="white" padding="compact">
        <Reveal className="grid gap-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:grid-cols-3 sm:p-8 dark:border-slate-800 dark:bg-slate-900/60">
          {[
            { icon: ScanLine, label: 'Scan a paper certificate', href: '/how-it-works' },
            { icon: Layers, label: 'Map and brand the template', href: '/features#capabilities' },
            { icon: Smartphone, label: 'Capture on site, generate the PDF', href: '/features#mobile-capture' },
          ].map((step) => {
            const Icon = step.icon;

            return (
              <Link key={step.label} href={step.href} className="group flex items-start gap-3">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm transition-colors group-hover:bg-blue-600 group-hover:text-white dark:bg-slate-950 dark:text-blue-300">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-semibold leading-6 text-slate-900 dark:text-white">
                  {step.label}
                </span>
              </Link>
            );
          })}
        </Reveal>
      </Section>

      <CallToAction
        tone="muted"
        title="See your own certificate inside the platform"
        description="Send us the PDF you issue today and we will show exactly how it converts, maps and generates."
        primaryHref="/contact"
        primaryLabel="Book a demo"
        secondaryHref="/pricing"
        secondaryLabel="View pricing"
      />
    </>
  );
}
