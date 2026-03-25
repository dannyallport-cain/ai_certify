import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { CheckCircle2, Circle, Clock, Layers, Edit3, Zap, Lock, FileText, Smartphone, Bell, Palette, Users, BarChart3 } from 'lucide-react';

type RoadmapItem = {
  title: string;
  description: string;
  icon: React.ElementType;
  tag?: string;
};

type RoadmapSection = {
  status: 'shipped' | 'in-progress' | 'coming-soon';
  label: string;
  color: string;
  border: string;
  badge: string;
  dot: string;
  items: RoadmapItem[];
};

const sections: RoadmapSection[] = [
  {
    status: 'shipped',
    label: 'Shipped',
    color: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
    badge: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500',
    items: [
      {
        title: 'Core Platform & Certificate Management',
        description:
          'Multi-tenant SaaS platform with secure sign-up, role-based access, and a full certificate storage dashboard. Certificates are indexed, searchable, and linked to customers.',
        icon: Lock,
      },
      {
        title: 'ServiceM8 Integration',
        description:
          'Two-way sync with ServiceM8 — pull jobs, clients, staff, and company details directly into your report workflow without any manual re-entry.',
        icon: Zap,
        tag: 'Integration',
      },
      {
        title: 'PDF Report Template Upload',
        description:
          'Upload any existing PDF report template. The system renders it faithfully at full resolution, page by page, ready for editing.',
        icon: FileText,
      },
      {
        title: 'AI Field Detection (Joe\'s Theory)',
        description:
          'Our two-phase BFS algorithm automatically detects blank input boxes in any PDF. In Step 1 you confirm or adjust detected regions; in Step 2 you map each blank to a data field in a guided wizard.',
        icon: Layers,
        tag: 'AI',
      },
      {
        title: 'Manual Field Placement',
        description:
          'Draw field boxes by hand anywhere on the page using click-and-drag. Every box gets resizable handles and can be repositioned with precision before confirming.',
        icon: Layers,
      },
      {
        title: 'Text & Branding Editor',
        description:
          'Click any piece of text on the PDF — a header, footer, logo area, or body copy — to white it out completely or replace it with custom text. Full control over font, size, weight, style, colour, and alignment.',
        icon: Edit3,
        tag: 'New',
      },
      {
        title: 'Handlebars Auto-fill Tokens',
        description:
          'Insert dynamic {{handlebars}} tokens into any text overlay. At generation time, tokens like {{job.job_address}}, {{client.company_name}}, {{engineer.first}} {{engineer.last}}, and {{company.phone}} are automatically substituted with live data from ServiceM8.',
        icon: Edit3,
        tag: 'New',
      },
    ],
  },
  {
    status: 'in-progress',
    label: 'In Progress',
    color: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    badge: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500',
    items: [
      {
        title: 'Live Report Generation',
        description:
          'Render a complete, personalised PDF for any job by merging the template with real ServiceM8 data — replacing handlebars tokens, filling mapped fields, and applying all text overlays in a single step.',
        icon: Zap,
      },
      {
        title: 'Template Persistence',
        description:
          'Save, version, and restore field mappings and text overlays so your template editor work is never lost between sessions.',
        icon: FileText,
      },
      {
        title: 'Customer Portal',
        description:
          'Give your clients a self-service portal to view, download, and verify their issued certificates without needing to contact you.',
        icon: Users,
      },
    ],
  },
  {
    status: 'coming-soon',
    label: 'Coming Soon',
    color: 'text-slate-500 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-700',
    badge: 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400',
    items: [
      {
        title: 'Mobile App',
        description:
          'A native iOS & Android app for field engineers — capture inspection data on site, sync instantly with the platform, and trigger report generation on the way home.',
        icon: Smartphone,
      },
      {
        title: 'Certificate Expiry Notifications',
        description:
          'Automated reminders sent to you and your clients before certificates expire — keeping you ahead of compliance deadlines without manual chasing.',
        icon: Bell,
      },
      {
        title: 'White-labelling',
        description:
          'Apply your own logo, colour scheme, and domain to the entire platform and customer portal — fully branded for your business.',
        icon: Palette,
      },
      {
        title: 'Bulk Report Generation',
        description:
          'Generate dozens of personalised reports in a single batch operation — ideal for large sites, annual re-inspections, or portfolio landlords.',
        icon: FileText,
      },
      {
        title: 'Analytics & Insights Dashboard',
        description:
          'Track certificate issuance rates, upcoming expirations, engineer productivity, and compliance trends with customisable charts and exportable reports.',
        icon: BarChart3,
      },
    ],
  },
];

export default function RoadmapPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-950">
      <Header />

      {/* Hero */}
      <section className="py-20 bg-slate-950 text-center">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Product{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              Roadmap
            </span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            A transparent view of what we&apos;ve built, what we&apos;re building now, and where we&apos;re headed next.
          </p>
        </div>
      </section>

      {/* Roadmap timeline */}
      <main className="flex-grow py-20 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4 max-w-4xl space-y-20">
          {sections.map((section) => (
            <div key={section.status}>
              {/* Section header */}
              <div className="flex items-center gap-3 mb-10">
                {section.status === 'shipped' && (
                  <CheckCircle2 className={`h-6 w-6 ${section.color} flex-shrink-0`} />
                )}
                {section.status === 'in-progress' && (
                  <Clock className={`h-6 w-6 ${section.color} flex-shrink-0`} />
                )}
                {section.status === 'coming-soon' && (
                  <Circle className={`h-6 w-6 ${section.color} flex-shrink-0`} />
                )}
                <h2 className={`text-2xl font-bold ${section.color}`}>{section.label}</h2>
              </div>

              {/* Items */}
              <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-3 space-y-8">
                {section.items.map((item, i) => (
                  <div key={i} className="relative pl-8">
                    {/* Timeline dot */}
                    <span
                      className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-950 ${section.dot}`}
                    />

                    <div className={`rounded-xl border ${section.border} bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-md transition-shadow`}>
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg flex-shrink-0 ${
                          section.status === 'shipped'
                            ? 'bg-emerald-50 dark:bg-emerald-900/20'
                            : section.status === 'in-progress'
                            ? 'bg-blue-50 dark:bg-blue-900/20'
                            : 'bg-slate-100 dark:bg-slate-800'
                        }`}>
                          <item.icon className={`h-5 w-5 ${section.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                              {item.title}
                            </h3>
                            {item.tag && (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${section.badge}`}>
                                {item.tag}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
