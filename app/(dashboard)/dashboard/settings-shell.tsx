'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Users, Settings, Shield, Activity, Menu, Home, Award, Plug, LogOut } from 'lucide-react';
import { signOut } from '@/app/(login)/actions';
import { User } from '@/lib/db/schema';
import { isAdminRole } from '@/lib/auth/roles';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function SettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { data: user } = useSWR<User>('/api/user', fetcher);

  const workspaceNavItems = [
    { href: '/dashboard', icon: Home, label: 'Dashboard' },
    { href: '/certificates', icon: Award, label: 'Certificates' },
    { href: '/customers', icon: Users, label: 'Customers' },
    { href: '/dashboard/servicem8', icon: Plug, label: 'ServiceM8' },
    ...(isAdminRole(user?.role)
      ? [{ href: '/admin', icon: Shield, label: 'Admin' }]
      : [])
  ];

  const settingsNavItems = [
    { href: '/dashboard', icon: Users, label: 'Team' },
    { href: '/dashboard/general', icon: Settings, label: 'General' },
    { href: '/dashboard/activity', icon: Activity, label: 'Activity' },
    { href: '/dashboard/security', icon: Shield, label: 'Security' }
  ];

  async function handleSignOut() {
    await signOut();
    router.refresh();
    router.push('/');
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-68px)] w-full max-w-7xl flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white p-4 lg:hidden">
        <div className="flex items-center">
          <span className="font-medium">Settings</span>
        </div>
        <Button
          className="-mr-3"
          variant="ghost"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
      </div>

      <div className="flex h-full flex-1 overflow-hidden">
        <aside
          className={`absolute inset-y-0 left-0 z-40 w-56 transform border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out lg:relative lg:block lg:translate-x-0 lg:bg-gray-50 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <nav className="flex h-full flex-col overflow-y-auto p-4">
            <div>
              <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Workspace
              </p>
              {workspaceNavItems.map((item) => (
                <Link key={item.href} href={item.href} passHref>
                  <Button
                    variant={isActive(item.href) ? 'secondary' : 'ghost'}
                    className={`my-1 w-full justify-start shadow-none ${
                      isActive(item.href) ? 'bg-gray-100' : ''
                    }`}
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>

            <div className="mt-6">
              <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Settings
              </p>
              {settingsNavItems.map((item) => (
                <Link key={item.href} href={item.href} passHref>
                  <Button
                    variant={isActive(item.href) ? 'secondary' : 'ghost'}
                    className={`my-1 w-full justify-start shadow-none ${
                      isActive(item.href) ? 'bg-gray-100' : ''
                    }`}
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>

            <div className="mt-auto border-t border-gray-200 pt-4">
              <Button
                variant="ghost"
                className="w-full justify-start shadow-none"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto p-0 lg:p-4">{children}</main>
      </div>
    </div>
  );
}
