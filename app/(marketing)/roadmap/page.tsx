import { BarChart3, Bell, CheckCircle2, Circle, Clock, Edit3, FileText, Layers, Lock, Palette, Smartphone, Users, Zap } from 'lucide-react';

import { CallToAction } from '@/components/marketing/CallToAction';
import { PageHero } from '@/components/marketing/PageHero';
import { Reveal } from '@/components/marketing/Reveal';
import { Section } from '@/components/marketing/Section';
import { cn } from '@/lib/utils';

export const metadata = {
  title: 'Roadmap | AI-Certificates',
  description:
    "What has shipped in AI-Certificates, what is in progress, and what is planned next for certification and reporting workflows.",
};

type RoadmapItem = {
  title: string;
  description: string;
  icon: React.ElementType;
  tag?: string;
};

type RoadmapSection = {
  status: 'shipped' | 'in-progress' | 'coming-soon';
  label: string;
  summary: string;
  accent: string;
  badge: string;
  dot: string;
  items: RoadmapItem[];
};

const sections: RoadmapSection[] = [
  {
    status: 'shipped',
    label: 'Shipped',
    summary: 'Live in the platform today.',
    accent: 'text-emerald-600 dark:text-emerald-400',
    badge: 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    items: [
      {
        title: 'Secure platform & report storage',
        description:
          'Multi-tenant SaaS platform with secure sign-up, role-based access, protected document handling, and cloud storage for templates, certificates, and customer-linked report records.',
        icon: Lock,
      },
      {
        title: 'ServiceM8 sync & data mapping',
        description:
          'Connect ServiceM8 to pull jobs, customers, staff, and company details into your workflow so report templates can map directly to live business data instead of relying on manual re-entry.',
        icon: Zap,
        tag: 'Integration',
      },
      {
        title: 'PDF report template upload',
        description:
          'Upload the PDF report designs you already use and convert them into editable digital templates without starting from a blank canvas.',
        icon: FileText,
      },
      {
        title: 'AI blank-field detection',
        description:
          'AI helps identify likely blank input areas across uploaded PDFs, speeding up setup by surfacing the places where report data should be captured or merged.',
        icon: Layers,
        tag: 'AI',
      },
      {
        title: 'Manual field placement',
        description:
          'Place fields anywhere on the page with click-and-drag controls, then resize and reposition them precisely so every template matches your required layout.',
        icon: Layers,
      },
      {
        title: 'Text & branding editor',
        description:
          'White out and replace logos, headers, footers, and static text directly on the PDF with full control over copy, font styling, colour, size, and alignment.',
        icon: Edit3,
        tag: 'New',
      },
      {
        title: 'Dynamic {{handlebars}} tokens',
        description:
          'Insert reusable tokens such as job, customer, company, and engineer data into text overlays so reports can auto-fill from connected data sources at generation time.',
        icon: Edit3,
        tag: 'New',
      },
    ],
  },
  {
    status: 'in-progress',
    label: 'In progress',
    summary: 'Being built and refined right now.',
    accent: 'text-blue-600 dark:text-blue-400',
    badge: 'border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    dot: 'bg-blue-500',
    items: [
      {
        title: 'Live report generation',
        description:
          'Generate completed PDFs from saved templates by combining mapped fields, branding edits, overlays, and dynamic data merges into production-ready reports in one flow.',
        icon: Zap,
      },
      {
        title: 'Template persistence',
        description:
          'Save and restore uploaded PDF templates, field mappings, editor changes, and layout decisions so teams can reuse, refine, and manage report formats over time.',
        icon: FileText,
      },
      {
        title: 'Customer portal',
        description:
          'Give customers a secure place to access, download, and verify the reports and certificates you have issued to them without extra back-and-forth.',
        icon: Users,
      },
    ],
  },
  {
    status: 'coming-soon',
    label: 'Coming soon',
    summary: 'Designed, not yet released.',
    accent: 'text-slate-500 dark:text-slate-400',
    badge: 'border border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400',
    dot: 'bg-slate-400',
    items: [
      {
        title: 'Mobile app',
        description:
          'A native iOS and Android app for field engineers to capture inspection data on site, sync instantly with the platform, and trigger report generation faster.',
        icon: Smartphone,
      },
      {
        title: 'Void property inspection reports',
        description:
          'A mobile-first workflow for councils and housing associations to capture end-of-tenancy and void checks room by room, including photos, defect notes, meter readings, key handover details, and repair actions, then generate a clean PDF report from the inspection.',
        icon: FileText,
        tag: 'Planned',
      },
      {
        title: 'Certificate expiry notifications',
        description:
          'Automated reminders for you and your customers before certificates expire, helping you stay ahead of compliance deadlines without manual chasing.',
        icon: Bell,
      },
      {
        title: 'White-labelling',
        description:
          'Apply your own logo, colour scheme, and domain to the platform and customer portal for a more fully branded client experience.',
        icon: Palette,
      },
      {
        title: 'Bulk report generation',
        description:
          'Generate large batches of personalised reports at once for high-volume jobs, recurring inspections, and portfolio-wide compliance work.',
        icon: FileText,
      },
      {
        title: 'Analytics & insights dashboard',
        description:
          'Track issuance volumes, expirations, engineer productivity, and compliance trends with exportable reporting and operational insight tools.',
        icon: BarChart3,
      },
    ],
  },
];

const statusIcons = {
  shipped: CheckCircle2,
  'in-progress': Clock,
  'coming-soon': Circle,
} as const;

export default function RoadmapPage() {
  return (
    <>
      <PageHero
        eyebrow="Product roadmap"
        title="What is live, what we are building, and what comes next"
        description="A transparent view of the platform. Shipped means it is in production today, in progress means it is actively being built, and coming soon means it is designed but not released."
      />

      <Section tone="white">
        <div className="mx-auto max-w-4xl space-y-16">
          {sections.map((section) => {
            const StatusIcon = statusIcons[section.status];

            return (
              <div key={section.status}>
                <div className="mb-8 flex items-center gap-3">
                  <StatusIcon className={cn('h-5 w-5 flex-none', section.accent)} />
                  <h2 className={cn('text-xl font-bold sm:text-2xl', section.accent)}>{section.label}</h2>
                  <span className="hidden text-sm text-slate-500 sm:inline dark:text-slate-400">
                    {section.summary}
                  </span>
                </div>

                <div className="relative space-y-4 border-l border-slate-200 pl-6 dark:border-slate-800">
                  {section.items.map((item, index) => {
                    const ItemIcon = item.icon;

                    return (
                      <Reveal
                        key={item.title}
                        delay={Math.min(index * 40, 200)}
                        className="relative"
                      >
                        <span
                          aria-hidden
                          className={cn(
                            'absolute -left-[1.9rem] top-6 h-3 w-3 rounded-full ring-4 ring-white dark:ring-slate-950',
                            section.dot,
                          )}
                        />
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                          <div className="flex items-start gap-4">
                            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                              <ItemIcon className={cn('h-5 w-5', section.accent)} />
                            </span>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                                  {item.title}
                                </h3>
                                {item.tag ? (
                                  <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', section.badge)}>
                                    {item.tag}
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                {item.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Reveal>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <CallToAction
        tone="muted"
        title="Need something that is not on the list?"
        description="Tell us the workflow you are missing. Customer requests are the main reason items move up this roadmap."
        primaryHref="/contact"
        primaryLabel="Request a feature"
        secondaryHref="/features"
        secondaryLabel="See current features"
      />
    </>
  );
}
