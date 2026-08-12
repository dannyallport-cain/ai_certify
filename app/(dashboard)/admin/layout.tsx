'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { isAdminRole } from '@/lib/auth/roles';
import {
  Shield,
  Users,
  FileText,
  Wand2,
  CreditCard,
  Settings,
  BarChart3,
  Home,
  LogOut,
  Database,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/admin', label: 'Overview', icon: Home, tone: 'blue' },
  { href: '/admin/users', label: 'Users', icon: Users, tone: 'blue' },
  { href: '/admin/templates', label: 'Templates', icon: FileText, tone: 'purple' },
  { href: '/admin/approval-schemes', label: 'Approval Schemes', icon: Shield, tone: 'purple' },
  { href: '/admin/llm-test', label: 'LLM Test', icon: Sparkles, tone: 'purple' },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard, tone: 'green' },
  { href: '/admin/database', label: 'Database', icon: Database, tone: 'slate' },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3, tone: 'amber' },
  { href: '/admin/reports/disseminator', label: 'Disseminator', icon: Wand2, tone: 'purple' },
  { href: '/admin/stripe-config', label: 'Settings', icon: Settings, tone: 'slate' },
] as const;

const toneClasses = {
  blue: {
    active: 'border-blue-200 bg-blue-50 text-blue-700',
    icon: 'bg-blue-100 text-blue-700',
  },
  purple: {
    active: 'border-purple-200 bg-purple-50 text-purple-700',
    icon: 'bg-purple-100 text-purple-700',
  },
  green: {
    active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: 'bg-emerald-100 text-emerald-700',
  },
  amber: {
    active: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: 'bg-amber-100 text-amber-700',
  },
  slate: {
    active: 'border-slate-200 bg-slate-100 text-slate-700',
    icon: 'bg-slate-200 text-slate-700',
  },
} as const;

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const isUserAccessibleRoute = pathname.startsWith('/admin/reports/disseminator');

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const activeNav = useMemo(() => {
    return navItems.find((item) => {
      if (item.href === '/admin') {
        return pathname === '/admin';
      }

      return pathname === item.href || pathname.startsWith(`${item.href}/`);
    });
  }, [pathname]);

  const checkAdminAccess = async () => {
    try {
      const response = await fetch('/api/auth/user');
      if (response.ok) {
        const userData = await response.json();
        if (isAdminRole(userData.role) || isUserAccessibleRoute) {
          setUser(userData);
        } else {
          router.push('/dashboard');
        }
      } else {
        router.push('/sign-in');
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      router.push('/sign-in');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/sign-out', { method: 'POST' });
      router.push('/sign-in');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-20 w-20 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
      </div>
    );
  }

  return (
    <section className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f8fafc_32%,#ffffff_100%)]">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-purple-100 p-3 text-purple-700 shadow-sm">
                <Shield className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700">
                    Admin dashboard
                  </Badge>
                  {activeNav ? (
                    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
                      {activeNav.label}
                    </Badge>
                  ) : null}
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
                    System administration
                  </h1>
                  <p className="text-sm text-slate-600 md:text-base">
                    Manage users, templates, subscriptions, reporting, and recovery tooling from one organised workspace.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              {user ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 text-right">
                      <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {user.role}
                    </Badge>
                  </div>
                </div>
              ) : null}

              <Button
                variant="outline"
                onClick={handleSignOut}
                className="h-11 rounded-xl border-slate-200 bg-white px-4"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>

          <nav className="rounded-3xl border border-slate-200 bg-slate-50/80 p-2">
            <div className="flex gap-2 overflow-x-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === '/admin'
                    ? pathname === '/admin'
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const tone = toneClasses[item.tone];

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group inline-flex min-w-fit items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors',
                      isActive
                        ? tone.active
                        : 'border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900'
                    )}
                  >
                    <span
                      className={cn(
                        'rounded-xl p-2 transition-colors',
                        isActive ? tone.icon : 'bg-white text-slate-500 group-hover:bg-slate-100 group-hover:text-slate-700'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </section>
  );
}