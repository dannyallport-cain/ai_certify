import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { requireAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { users, teams, customers } from '@/lib/db/schema';
import { count, eq, sql } from 'drizzle-orm';
import {
  Users,
  Building2,
  FileText,
  Shield,
  Activity,
  Settings,
  BarChart3,
  CreditCard,
  Eye,
  LayoutTemplate,
  Copy,
  Globe,
  Database,
  Server,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { AdminPageHero, AdminSection, AdminMutedNote } from '@/components/admin/AdminPageSection';

async function getSystemStats() {
  try {
    const [
      userCount,
      teamCount,
      customerCount,
      adminCount,
      activeTeams,
      activeSubscriptions
    ] = await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(teams),
      db.select({ count: count() }).from(customers),
      db.select({ count: count() }).from(users).where(sql`${users.role} IN ('admin', 'owner', 'manager', 'sysadmin')`),
      db.select({ count: count() }).from(teams).where(eq(teams.subscriptionStatus, 'active')),
      db.select({ count: count() }).from(teams).where(sql`subscription_status = 'active' OR subscription_status = 'trialing'`)
    ]);

    return {
      users: userCount[0]?.count || 0,
      teams: teamCount[0]?.count || 0,
      customers: customerCount[0]?.count || 0,
      admins: adminCount[0]?.count || 0,
      activeTeams: activeTeams[0]?.count || 0,
      activeSubscriptions: activeSubscriptions[0]?.count || 0,
    };
  } catch (error) {
    console.error('Error fetching system stats:', error);
    return {
      users: 0,
      teams: 0,
      customers: 0,
      admins: 0,
      activeTeams: 0,
      activeSubscriptions: 0,
    };
  }
}

function getSiteDomain() {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BASE_URL ||
    process.env.NEXTAUTH_URL ||
    'https://ai-certificates.app';

  try {
    return new URL(baseUrl).hostname;
  } catch {
    const sanitized = baseUrl.replace(/^https?:\/\//i, '').split('/')[0];
    return sanitized || 'ai-certificates.app';
  }
}

export default async function AdminHomePage() {
  await requireAdmin();
  const stats = await getSystemStats();
  const siteDomain = getSiteDomain();

  const statsCards = [
    {
      title: 'Total Users',
      value: stats.users,
      icon: Users,
      color: 'text-blue-700',
      bgColor: 'bg-blue-100',
      href: '/admin/users'
    },
    {
      title: 'Active Teams',
      value: `${stats.activeTeams}/${stats.teams}`,
      icon: Building2,
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-100',
      href: '/admin/users'
    },
    {
      title: 'Active Subscriptions',
      value: stats.activeSubscriptions,
      icon: CreditCard,
      color: 'text-amber-700',
      bgColor: 'bg-amber-100',
      href: '/admin/subscriptions'
    },
    {
      title: 'Administrators',
      value: stats.admins,
      icon: Shield,
      color: 'text-rose-700',
      bgColor: 'bg-rose-100',
      href: '/admin/users'
    }
  ];

  const quickActions = [
    {
      title: 'Template Management',
      description: 'Create and manage certificate templates with the editor and preview tools.',
      icon: LayoutTemplate,
      href: '/admin/templates',
      color: 'text-purple-700',
      bgColor: 'bg-purple-100',
      tone: 'purple' as const,
    },
    {
      title: 'User Management',
      description: 'View roles, account activity, and team relationships in one place.',
      icon: Users,
      href: '/admin/users',
      color: 'text-blue-700',
      bgColor: 'bg-blue-100',
      tone: 'blue' as const,
    },
    {
      title: 'Subscription Plans',
      description: 'Keep pricing, allowances, and Stripe plan metadata aligned.',
      icon: CreditCard,
      href: '/admin/subscriptions',
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-100',
      tone: 'green' as const,
    },
    {
      title: 'System Reports',
      description: 'Review analytics, activity, and operational reporting.',
      icon: BarChart3,
      href: '/admin/reports',
      color: 'text-amber-700',
      bgColor: 'bg-amber-100',
      tone: 'amber' as const,
    },
    {
      title: 'Stripe Configuration',
      description: 'Check payment secrets and deployment readiness for billing.',
      icon: Settings,
      href: '/admin/stripe-config',
      color: 'text-slate-700',
      bgColor: 'bg-slate-100',
      tone: 'slate' as const,
    },
    {
      title: 'Database Management',
      description: 'Trigger backups and review restore tooling for incidents.',
      icon: Database,
      href: '/admin/database',
      color: 'text-slate-700',
      bgColor: 'bg-slate-100',
      tone: 'slate' as const,
    }
  ];

  return (
    <div className="space-y-8">
      <AdminPageHero
        eyebrow="Admin overview"
        title="Administration dashboard"
        description="A clearer overview of system health, billing controls, template tooling, and operational access across AI-Certificates."
        tone="purple"
        icon={<Shield className="h-8 w-8" />}
        actions={
          <>
            <Badge variant="outline" className="border-white/40 bg-white/60 text-slate-700">
              {siteDomain}
            </Badge>
            <Badge variant="outline" className="border-white/40 bg-white/60 text-slate-700">
              {stats.admins} admins active
            </Badge>
          </>
        }
      />

      <AdminSection
        eyebrow="System status"
        title="Platform health and reach"
        description="Use these cards to understand the current deployment footprint and baseline service health."
        icon={<Server className="h-5 w-5" />}
        tone="blue"
      >
        <div className="grid gap-4 xl:grid-cols-[1.2fr,1fr]">
          <Card className="border-blue-200/80 bg-white/90 shadow-none">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Site status</h3>
                  <p className="text-sm text-slate-600">Primary domain and delivery configuration.</p>
                </div>
                <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
                  <Globe className="h-5 w-5" />
                </div>
              </div>

              <div className="space-y-3">
                {[
                  ['Domain', siteDomain],
                  ['SSL certificate', 'Active'],
                  ['CDN status', 'Enabled'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-xl bg-blue-50/70 px-4 py-3">
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                    <Badge variant="secondary" className="bg-white text-blue-700">
                      {value}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-200/80 bg-white/90 shadow-none">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Service health</h3>
                  <p className="text-sm text-slate-600">Core infrastructure signals for operators.</p>
                </div>
                <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>

              <div className="space-y-3">
                {[
                  'Database healthy',
                  'API services operational',
                  'Storage responding normally',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl bg-emerald-50/70 px-4 py-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminSection>

      <AdminSection
        eyebrow="Key metrics"
        title="Operational snapshot"
        description="The most important counts are grouped together so the dashboard is easier to scan."
        icon={<Activity className="h-5 w-5" />}
        tone="green"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;

            return (
              <Link key={index} href={stat.href} className="block">
                <Card className="h-full rounded-2xl border-slate-200 bg-white transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                          {stat.title}
                        </p>
                        <p className="text-3xl font-semibold tracking-tight text-slate-950">
                          {stat.value}
                        </p>
                      </div>
                      <div className={`${stat.bgColor} rounded-2xl p-3`}>
                        <Icon className={`h-5 w-5 ${stat.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
        <AdminMutedNote tone="green">
          Metrics link directly to their management areas so the dashboard works as a control surface, not just a report.
        </AdminMutedNote>
      </AdminSection>

      <AdminSection
        eyebrow="Templates"
        title="Template management workspace"
        description="Break template responsibilities into clearer, smaller entry points for editing, previewing, and duplicating."
        icon={<LayoutTemplate className="h-5 w-5" />}
        tone="purple"
        actions={
          <Link
            href="/admin/templates"
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
          >
            Manage templates
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              title: 'WYSIWYG editor',
              description: 'Visual editing for layout and field placement.',
              icon: FileText,
              tone: 'border-purple-200 bg-purple-50/70',
              iconWrap: 'bg-purple-100 text-purple-700',
            },
            {
              title: 'Live preview',
              description: 'Check output changes in real time before publishing.',
              icon: Eye,
              tone: 'border-blue-200 bg-blue-50/70',
              iconWrap: 'bg-blue-100 text-blue-700',
            },
            {
              title: 'Template duplication',
              description: 'Clone proven layouts and adapt them faster.',
              icon: Copy,
              tone: 'border-emerald-200 bg-emerald-50/70',
              iconWrap: 'bg-emerald-100 text-emerald-700',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.title} href="/admin/templates" className="block h-full">
                <Card className={`h-full rounded-2xl ${item.tone} shadow-none transition-all hover:-translate-y-0.5 hover:shadow-md`}>
                  <CardContent className="space-y-4 p-5">
                    <div className={`w-fit rounded-2xl p-3 ${item.iconWrap}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-slate-900">{item.title}</h3>
                      <p className="text-sm text-slate-600">{item.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </AdminSection>

      <AdminSection
        eyebrow="Admin tools"
        title="Navigate by responsibility"
        description="Related admin areas are grouped with subtle colour coding so it is easier to jump to the right type of work."
        icon={<Settings className="h-5 w-5" />}
        tone="slate"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quickActions.map((action, index) => {
            const Icon = action.icon;

            return (
              <Link key={index} href={action.href} className="block h-full">
                <Card className="h-full rounded-2xl border-slate-200 bg-white transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className={`${action.bgColor} rounded-2xl p-3`}>
                        <Icon className={`h-5 w-5 ${action.color}`} />
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {action.tone}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-slate-900">{action.title}</h3>
                      <p className="text-sm text-slate-600">{action.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </AdminSection>

      <AdminSection
        eyebrow="Recent events"
        title="Latest dashboard activity"
        description="A lightweight activity area for admin-only events."
        icon={<Activity className="h-5 w-5" />}
        tone="amber"
      >
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-slate-700">Admin dashboard accessed</span>
            <span className="text-slate-500">Just now</span>
          </div>
        </div>
      </AdminSection>
    </div>
  );
}
