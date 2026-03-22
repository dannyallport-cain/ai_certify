// filepath: app/(dashboard)/admin/page.tsx
import { Suspense } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { requireAdmin } from '@/lib/auth/admin';
import { ADMIN_ROLES } from '@/lib/auth/roles';
import { db } from '@/lib/db/drizzle';
import { users, teams, customers } from '@/lib/db/schema';
import { count, eq, inArray, sql } from 'drizzle-orm';
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
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';

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
      db.select({ count: count() }).from(users).where(inArray(users.role, [...ADMIN_ROLES])),
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

async function AdminDashboardContent() {
  await requireAdmin();
  const stats = await getSystemStats();
  const siteDomain = getSiteDomain();

  const statsCards = [
    {
      title: 'Total Users',
      value: stats.users,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      href: '/admin/users'
    },
    {
      title: 'Active Teams',
      value: `${stats.activeTeams}/${stats.teams}`,
      icon: Building2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      href: '/admin/users'
    },
    {
      title: 'Active Subscriptions',
      value: stats.activeSubscriptions,
      icon: CreditCard,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      href: '/admin/subscriptions'
    },
    {
      title: 'Administrators',
      value: stats.admins,
      icon: Shield,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      href: '/admin/users'
    }
  ];

  const quickActions = [
    {
      title: 'Template Management',
      description: 'Create and manage certificate templates with WYSIWYG editor',
      icon: LayoutTemplate,
      href: '/admin/templates',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'User Management',
      description: 'View, edit, and manage user accounts',
      icon: Users,
      href: '/admin/users',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Subscription Plans',
      description: 'Manage pricing and billing',
      icon: CreditCard,
      href: '/admin/subscriptions',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'System Reports',
      description: 'View analytics and activity logs',
      icon: BarChart3,
      href: '/admin/reports',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Stripe Configuration',
      description: 'Configure payment settings',
      icon: Settings,
      href: '/admin/stripe-config',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome to Admin Dashboard</h1>
            <p className="text-purple-100">Manage your AI-Certificates system efficiently</p>
          </div>
          <Shield className="h-16 w-16 text-purple-200" />
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <span>Site Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Domain</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {siteDomain}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">SSL Certificate</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Active
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">CDN Status</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Enabled
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Server className="h-5 w-5" />
              <span>System Health</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Database</span>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-600">Healthy</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">API Services</span>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-600">Operational</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Storage</span>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-600">Normal</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Template Management Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Template Management</h2>
            <p className="text-gray-600 mt-1">Create and customize certificate templates</p>
          </div>
          <Link href="/admin/templates">
            <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5" />
              Manage Templates
            </button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">WYSIWYG Editor</h3>
                  <p className="text-sm text-gray-600">Visual template editor</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Eye className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Live Preview</h3>
                  <p className="text-sm text-gray-600">Real-time template preview</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <Copy className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Template Duplication</h3>
                  <p className="text-sm text-gray-600">Clone and customize templates</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link key={index} href={stat.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                    <div className={`${stat.bgColor} p-3 rounded-full`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link key={index} href={action.href}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className={`${action.bgColor} p-2 rounded-lg`}>
                        <Icon className={`h-6 w-6 ${action.color}`} />
                      </div>
                      <CardTitle className="text-lg">{action.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">{action.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Recent Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Admin dashboard accessed</span>
              <span className="text-gray-400">Just now</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminHomePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminDashboardContent />
    </Suspense>
  );
}
