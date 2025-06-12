// filepath: app/(dashboard)/admin/page.tsx
import { Suspense } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { requireAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { users, teams, certificates, customers } from '@/lib/db/schema';
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
  Eye
} from 'lucide-react';

async function getSystemStats() {
  try {
    const [
      userCount,
      teamCount,
      certificateCount,
      customerCount,
      adminCount,
      activeTeams
    ] = await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(teams),
      db.select({ count: count() }).from(certificates),
      db.select({ count: count() }).from(customers),
      db.select({ count: count() }).from(users).where(sql`role IN ('admin', 'owner')`),
      db.select({ count: count() }).from(teams).where(eq(teams.subscriptionStatus, 'active'))
    ]);

    return {
      users: userCount[0]?.count || 0,
      teams: teamCount[0]?.count || 0,
      certificates: certificateCount[0]?.count || 0,
      customers: customerCount[0]?.count || 0,
      admins: adminCount[0]?.count || 0,
      activeTeams: activeTeams[0]?.count || 0,
    };
  } catch (error) {
    console.error('Error fetching system stats:', error);
    return {
      users: 0,
      teams: 0,
      certificates: 0,
      customers: 0,
      admins: 0,
      activeTeams: 0,
    };
  }
}

async function AdminDashboardContent() {
  await requireAdmin();
  const stats = await getSystemStats();

  const statsCards = [
    {
      title: 'Total Users',
      value: stats.users,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      href: '/dashboard/admin/users'
    },
    {
      title: 'Active Teams',
      value: `${stats.activeTeams}/${stats.teams}`,
      icon: Building2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      href: '/dashboard/admin/users'
    },
    {
      title: 'Certificates',
      value: stats.certificates,
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      href: '/dashboard/admin/reports'
    },
    {
      title: 'Customers',
      value: stats.customers,
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      href: '/dashboard/admin/reports'
    },
    {
      title: 'Administrators',
      value: stats.admins,
      icon: Shield,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      href: '/dashboard/admin/users'
    }
  ];

  const quickActions = [
    {
      title: 'User Management',
      description: 'View, edit, and manage user accounts',
      icon: Users,
      href: '/dashboard/admin/users',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Template Management',
      description: 'Configure certificate templates',
      icon: FileText,
      href: '/dashboard/admin/templates',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Subscription Plans',
      description: 'Manage pricing and billing',
      icon: CreditCard,
      href: '/dashboard/admin/subscriptions',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'System Reports',
      description: 'View analytics and activity logs',
      icon: BarChart3,
      href: '/dashboard/admin/reports',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Stripe Configuration',
      description: 'Configure payment settings',
      icon: Settings,
      href: '/dashboard/admin/stripe-config',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome to Admin Dashboard</h1>
            <p className="text-blue-100">Manage your AI Certify system efficiently</p>
          </div>
          <Shield className="h-16 w-16 text-blue-200" />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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

      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>System Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Database</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Connected
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Authentication</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Active
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">PDF Generation</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Available
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>Recent Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm">System initialized</span>
                <span className="text-xs text-gray-500">Just now</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm">Admin dashboard accessed</span>
                <span className="text-xs text-gray-500">1 min ago</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm">Database connected</span>
                <span className="text-xs text-gray-500">2 min ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminHomePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  );
}
