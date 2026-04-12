import { Footer } from '@/components/landing/Footer';
import { Header } from '@/components/landing/Header';
import {
  BarChart3,
  Bell,
  CheckCircle2,
  Circle,
  Clock,
  Edit3,
  FileText,
  Layers,
  Lock,
  Palette,
  Smartphone,
  Users,
  Zap,
} from 'lucide-react';

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
    badge:
      'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    items: [
      {
        title: 'Secure Platform & Report Storage',
        description:
          'Multi-tenant SaaS platform with secure sign-up, role-based access, protected document handling, and cloud storage for templates, certificates, and customer-linked report records.',
        icon: Lock,
      },
      {
        title: 'ServiceM8 Sync & Data Mapping',
        description:
          'Connect ServiceM8 to pull jobs, clients, staff, and company details into your workflow so report templates can map directly to live business data instead of relying on manual re-entry.',
        icon: Zap,
        tag: 'Integration',
      },
      {
        title: 'PDF Report Template Upload',
        description:
          'Upload the PDF report designs you already use and convert them into editable digital templates without starting from a blank canvas.',
        icon: FileText,
      },
      {
        title: 'AI Blank-Field Detection',
        description:
          'AI helps identify likely blank input areas across uploaded PDFs, speeding up setup by surfacing the places where report data should be captured or merged.',
        icon: Layers,
        tag: 'AI',
      },
      {
        title: 'Manual Field Placement',
        description:
          'Place fields anywhere on the page with click-and-drag controls, then resize and reposition them precisely so every template matches your required layout.',
        icon: Layers,
      },
      {
        title: 'Text & Branding Editor',
        description:
          'White out and replace logos, headers, footers, and static text directly on the PDF with full control over copy, font styling, colour, size, and alignment.',
        icon: Edit3,
        tag: 'New',
      },
      {
        title: 'Dynamic {{handlebars}} Tokens',
        description:
          'Insert reusable tokens such as job, client, company, and engineer data into text overlays so reports can auto-fill from connected data sources at generation time.',
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
    badge:
      'border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    dot: 'bg-blue-500',
    items: [
      {
        title: 'Live Report Generation',
        description:
          'Generate completed PDFs from saved templates by combining mapped fields, branding edits, overlays, and dynamic data merges into production-ready reports in one flow.',
        icon: Zap,
      },
      {
        title: 'Template Persistence',
        description:
          'Save and restore uploaded PDF templates, field mappings, editor changes, and layout decisions so teams can reuse, refine, and manage report formats over time.',
        icon: FileText,
      },
      {
        title: 'Customer Portal',
        description:
          'Give customers a secure place to access, download, and verify the reports and certificates you have issued to them without extra back-and-forth.',
        icon: Users,
      },
    ],
  },
  {
    status: 'coming-soon',
    label: 'Coming Soon',
    color: 'text-slate-500 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-700',
    badge:
      'border border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400',
    dot: 'bg-slate-400',
    items: [
      {
        title: 'Mobile App',
        description:
          'A native iOS and Android app for field engineers to capture inspection data on site, sync instantly with the platform, and trigger report generation faster.',
        icon: Smartphone,
      },
      {
        title: 'Certificate Expiry Notifications',
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
        title: 'Bulk Report Generation',
        description:
          'Generate large batches of personalised reports at once for high-volume jobs, recurring inspections, and portfolio-wide compliance work.',
        icon: FileText,
      },
      {
        title: 'Analytics & Insights Dashboard',
        description:
          'Track issuance volumes, expirations, engineer productivity, and compliance trends with exportable reporting and operational insight tools.',
        icon: BarChart3,
      },
    ],
  },
];

export default function RoadmapPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950">
      <Header />

      <section className="bg-slate-950 py-20 text-center">
        <div className="container mx-auto px-4">
          <h1 className="mb-6 text-4xl font-bold text-white md:text-6xl">
            Product{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Roadmap
            </span>
          </h1>
          <p className="mx-auto max-w-3xl text-xl text-slate-400">
            A transparent view of what's already live in the platform, what we're actively
            building next, and where the product is heading after that.
          </p>
        </div>
      </section>

      <main className="flex-grow bg-white py-20 dark:bg-slate-950">
        <div className="container mx-auto max-w-4xl space-y-20 px-4">
          {sections.map((section) => (
            <div key={section.status}>
              <div className="mb-10 flex items-center gap-3">
                {section.status === 'shipped' && (
                  <CheckCircle2 className={`h-6 w-6 flex-shrink-0 ${section.color}`} />
                )}
                {section.status === 'in-progress' && (
                  <Clock className={`h-6 w-6 flex-shrink-0 ${section.color}`} />
                )}
                {section.status === 'coming-soon' && (
                  <Circle className={`h-6 w-6 flex-shrink-0 ${section.color}`} />
                )}
                <h2 className={`text-2xl font-bold ${section.color}`}>{section.label}</h2>
              </div>

              <div className="relative ml-3 space-y-8 border-l-2 border-slate-200 dark:border-slate-800">
                {section.items.map((item, i) => (
                  <div key={i} className="relative pl-8">
                    <span
                      className={`absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-white dark:border-slate-950 ${section.dot}`}
                    />

                    <div
                      className={`rounded-xl border ${section.border} bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:bg-slate-900`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`flex-shrink-0 rounded-lg p-2 ${
                            section.status === 'shipped'
                              ? 'bg-emerald-50 dark:bg-emerald-900/20'
                              : section.status === 'in-progress'
                                ? 'bg-blue-50 dark:bg-blue-900/20'
                                : 'bg-slate-100 dark:bg-slate-800'
                          }`}
                        >
                          <item.icon className={`h-5 w-5 ${section.color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                              {item.title}
                            </h3>
                            {item.tag && (
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${section.badge}`}>
                                {item.tag}
                              </span>
                            )}
                          </div>
                          <p className="leading-relaxed text-slate-600 dark:text-slate-400">
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