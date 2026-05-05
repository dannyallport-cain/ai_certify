import Image from 'next/image';
import Link from 'next/link';
import { Footer } from '@/components/landing/Footer';
import { Header } from '@/components/landing/Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ElementType, ReactNode } from 'react';
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

const certificates = [
  {
    title: 'CP12 Gas Safety',
    description: 'Landlord gas safety records for tenanted homes and managed properties.',
  },
  {
    title: 'EICR / Electrical Inspection',
    description: 'Electrical installation reporting for rented homes and housing stock.',
  },
  {
    title: 'Fire Alarm / BS5839',
    description: 'Fire detection and alarm inspection workflows for communal and managed sites.',
  },
  {
    title: 'Emergency Lighting / BS5266',
    description: 'Inspection and testing for escape lighting in blocks and common areas.',
  },
  {
    title: 'Fire Extinguisher Checks',
    description: 'Portable fire extinguishers across shared spaces, offices, and schemes.',
  },
  {
    title: 'Dry Riser Checks',
    description: 'Dry riser inspection records for multi-storey blocks and larger developments.',
  },
];

const reports = [
  {
    title: 'Void Property Inspection Report',
    description:
      'Room-by-room end-of-tenancy inspections with photos, defects, meter readings, and key handover notes.',
  },
  {
    title: 'Pre-Termination Survey',
    description:
      'Capture issues before a tenant leaves so void works and scheduling can start earlier.',
  },
  {
    title: 'Stock Condition Survey',
    description:
      'Track component condition, remaining life, and replacement planning across your housing stock.',
  },
  {
    title: 'Damp, Mould and Condensation Survey',
    description:
      'Evidence-led survey notes for resolving the root causes of damp and mould issues.',
  },
  {
    title: 'Communal Area Inspection',
    description:
      'Inspect shared hallways, lifts, lighting, bins, landscaping, and security across estates.',
  },
  {
    title: 'Plant Room / M&E Inspection',
    description:
      'Capture boiler rooms, pumps, plant assets, and maintenance readings in one place.',
  },
  {
    title: 'Legionella / Water Hygiene Log',
    description:
      'Track outlet temperatures, flushing, and routine hygiene checks for compliance logs.',
  },
  {
    title: 'Contractor Access / Permit-to-Work',
    description:
      'Record site access, RAMS checks, and permit conditions for works inside housing assets.',
  },
];

const benefits = [
  'Keep housing void and compliance evidence in one secure workflow.',
  'Make reports easier to capture on mobile and easier to review in the office.',
  'Generate polished PDFs from the same data used on site.',
  'Link the template pack to the right team members and billing entitlement.',
];

function SectionHeading({
  eyebrow,
  title,
  description,
  eyebrowClassName,
  titleClassName,
  descriptionClassName,
}: {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  eyebrowClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <Badge
        variant="secondary"
        className={`mb-4 rounded-full px-4 py-1 text-xs uppercase tracking-[0.25em] ${eyebrowClassName ?? ''}`}
      >
        {eyebrow}
      </Badge>
      <h1
        className={`text-4xl font-bold tracking-tight md:text-6xl ${titleClassName ?? 'text-slate-900 dark:text-white'}`}
      >
        {title}
      </h1>
      <p
        className={`mt-6 text-lg leading-relaxed md:text-xl ${descriptionClassName ?? 'text-slate-600 dark:text-slate-400'}`}
      >
        {description}
      </p>
    </div>
  );
}

function TemplateCard({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: ElementType;
}) {
  return (
    <Card className="h-full border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <CardHeader className="space-y-3">
        <div className="inline-flex w-fit rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
          <Icon className="h-6 w-6 text-slate-900 dark:text-white" />
        </div>
        <CardTitle className="text-xl text-slate-900 dark:text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function HousingAssociationsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950">
      <Header />

      <main className="flex-1">
        <section className="relative overflow-hidden bg-slate-950 py-20 md:py-28">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.35),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(34,211,238,0.22),_transparent_28%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/75 to-slate-950" />
          <div className="container relative mx-auto px-4">
            <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-cyan-100">
                  <LayoutGrid className="h-4 w-4" />
                  Housing associations & local authorities
                </div>

                <SectionHeading
                  eyebrow="Certificates and reports"
                  title={
                    <>
                      Certificates and reports for <span className="text-gradient">housing teams</span>
                    </>
                  }
                  description={
                    <>
                      A dedicated workspace for voids, stock condition surveys, compliance inspections,
                      and property reporting across housing stock and managed estates.
                    </>
                  }
                  eyebrowClassName="bg-white/10 text-white"
                  titleClassName="text-white"
                  descriptionClassName="text-slate-300"
                />

                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
                  <Link href="/subscription">
                    <Button className="h-12 rounded-full bg-white px-6 text-blue-600 hover:bg-blue-50">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Get the template pack
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button
                      variant="outline"
                      className="h-12 rounded-full border-slate-700 px-6 text-slate-200 hover:bg-slate-800 hover:text-white"
                    >
                      View pricing
                    </Button>
                  </Link>
                </div>

                <div className="mt-16 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {benefits.map((benefit) => (
                    <div
                      key={benefit}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left backdrop-blur"
                    >
                      <CheckCircle2 className="h-5 w-5 text-cyan-300" />
                      <p className="mt-3 text-sm leading-relaxed text-slate-200">{benefit}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900 sm:col-span-2">
                      <Image
                        src="/housing-associations/hero.svg"
                        alt="Housing certificate and report dashboard illustration"
                        width={1200}
                        height={800}
                        priority
                        className="h-64 w-full object-cover"
                      />
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
                      <Image
                        src="/housing-associations/inspection.svg"
                        alt="Housing inspection workflow illustration"
                        width={1200}
                        height={800}
                        className="h-40 w-full object-cover"
                      />
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-cyan-400/15 p-3">
                          <House className="h-5 w-5 text-cyan-300" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">Ready for housing operations</p>
                          <p className="mt-1 text-sm text-slate-300">
                            Polished PDFs, mobile capture, and consistent reporting for every property visit.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50 py-20 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                <Building2 className="h-4 w-4" />
                Related certificate and report types
              </div>
              <h2 className="mt-6 text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">
                Everything your team needs to manage <span className="text-gradient">voids, compliance,</span> and stock condition work
              </h2>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
                These certificate and reporting workflows are the ones most commonly needed by
                councils, housing associations, and property teams managing multiple homes and sites.
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {certificates.map((item) => (
                <TemplateCard
                  key={item.title}
                  title={item.title}
                  description={item.description}
                  icon={ShieldCheck}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl text-center">
              <Badge variant="secondary" className="mb-4 rounded-full px-4 py-1 uppercase tracking-[0.25em]">
                Operational reports
              </Badge>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">
                Specific reports listed for <span className="text-gradient">housing workflows</span>
              </h2>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
                Use this page to review the template pack content that matters most for housing
                operations and estate management.
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {reports.map((item) => (
                <TemplateCard
                  key={item.title}
                  title={item.title}
                  description={item.description}
                  icon={FileText}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-slate-50 py-20 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="container mx-auto px-4">
            <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-blue-50 p-3 dark:bg-blue-500/10">
                    <House className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
                      Why it helps
                    </p>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                      A focused place for <span className="text-gradient">housing-related documents</span>
                    </h3>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {[
                    'Void properties and handovers',
                    'Stock condition and planned works',
                    'Communal and estate inspections',
                    'Compliance logs and site records',
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <ClipboardCheck className="h-5 w-5 text-emerald-500" />
                      <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-slate-950 p-8 text-white shadow-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Access
                </p>
                <h3 className="mt-3 text-2xl font-bold">Buy the add-on to unlock the pack</h3>
                <p className="mt-4 text-sm leading-relaxed text-slate-300">
                  The housing template pack is available as an additional subscription add-on and
                  can be enabled after checkout. Once active, the relevant certificates and reports
                  can be listed and used from your account.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href="/subscription" className="w-full sm:w-auto">
                    <Button className="w-full bg-white text-slate-950 hover:bg-slate-100">
                      Purchase access
                    </Button>
                  </Link>
                  <Link href="/sign-in" className="w-full sm:w-auto">
                    <Button variant="outline" className="w-full border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white">
                      Sign in
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
