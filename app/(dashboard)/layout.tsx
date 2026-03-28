'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Home, LogOut, Users, Award, Settings, Shield, Plug, ArrowRightLeft } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut } from '@/app/(login)/actions';
import { usePathname, useRouter } from 'next/navigation';
import { User } from '@/lib/db/schema';
import { isAdminRole } from '@/lib/auth/roles';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const ADMIN_VIEW_MODE_KEY = 'admin-dashboard-view-mode';

type AdminViewMode = 'admin' | 'user';

function getInitialAdminViewMode(): AdminViewMode {
  if (typeof window === 'undefined') {
    return 'admin';
  }

  const storedMode = window.localStorage.getItem(ADMIN_VIEW_MODE_KEY);
  return storedMode === 'user' ? 'user' : 'admin';
}

function AdminViewModeToggle({
  mode,
  onToggle,
}: {
  mode: AdminViewMode;
  onToggle: () => void;
}) {
  const isUserView = mode === 'user';

  return (
    <Button
      type="button"
      variant={isUserView ? 'default' : 'secondary'}
      size="sm"
      onClick={onToggle}
      className="fixed bottom-4 right-4 z-50 rounded-full px-4 shadow-lg"
    >
      <ArrowRightLeft className="h-4 w-4" />
      {isUserView ? 'Switch to Admin View' : 'View as User'}
    </Button>
  );
}

function UserMenu({ adminViewMode }: { adminViewMode: AdminViewMode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data, error } = useSWR<User>('/api/user', fetcher);
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.refresh();
    router.push('/');
  }

  if (error) {
    return <div className="text-red-500 text-sm">Error loading user menu.</div>;
  }

  if (!data || !data.email) {
    return (
      <>
        <Link
          href="/pricing"
          className="text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Pricing
        </Link>
        <Button asChild className="rounded-full">
          <Link href="/sign-up">Sign Up</Link>
        </Button>
      </>
    );
  }

  const user = data;
  const showAdminLink = isAdminRole(user.role) && adminViewMode === 'admin';

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger>
        <Avatar className="cursor-pointer size-9">
          <AvatarImage alt={user.name || ''} />
          <AvatarFallback>
            {user.email
              ? user.email.split(' ').map((n) => n[0]).join('')
              : '?'}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="flex flex-col gap-1">
        <DropdownMenuItem className="cursor-pointer">
          <Link href="/dashboard" className="flex w-full items-center">
            <Home className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer">
          <Link href="/certificates" className="flex w-full items-center">
            <Award className="mr-2 h-4 w-4" />
            <span>Certificates</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer">
          <Link href="/customers" className="flex w-full items-center">
            <Users className="mr-2 h-4 w-4" />
            <span>Customers</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer">
          <Link href="/dashboard/general" className="flex w-full items-center">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer">
          <Link href="/dashboard/servicem8" className="flex w-full items-center">
            <Plug className="mr-2 h-4 w-4" />
            <span>ServiceM8</span>
          </Link>
        </DropdownMenuItem>
        {showAdminLink && (
          <DropdownMenuItem className="cursor-pointer">
            <Link href="/admin" className="flex w-full items-center">
              <Shield className="mr-2 h-4 w-4" />
              <span>Admin</span>
            </Link>
          </DropdownMenuItem>
        )}
        <form action={handleSignOut} className="w-full">
          <button type="submit" className="flex w-full">
            <DropdownMenuItem className="w-full flex-1 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Header({ adminViewMode }: { adminViewMode: AdminViewMode }) {
  const router = useRouter();
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const showAdminLink = isAdminRole(user?.role) && adminViewMode === 'admin';

  async function handleLogout() {
    await signOut();
    router.refresh();
    router.push('/');
  }

  return (
    <header className="border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center">
          <Image src="/screenshots/icon-512.png" alt="AI-Certificates" width={32} height={32} className="rounded-lg" />
          <span className="ml-2 text-xl font-semibold text-gray-900">AI-Certificates</span>
        </Link>
        <div className="flex items-center space-x-6">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Dashboard
          </Link>
          <Link
            href="/certificates"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Certificates
          </Link>
          <Link
            href="/customers"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Customers
          </Link>
          {showAdminLink && (
            <Link
              href="/admin"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Admin
            </Link>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {user && (
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          )}
          <Suspense fallback={<div className="h-9" />}>
            <UserMenu adminViewMode={adminViewMode} />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const [adminViewMode, setAdminViewMode] = useState<AdminViewMode>('admin');
  const isAdminRoute = pathname?.startsWith('/admin') || pathname?.startsWith('/dashboard/admin');
  const isSignedInAdmin = isAdminRole(user?.role);

  useEffect(() => {
    setAdminViewMode(getInitialAdminViewMode());
  }, []);

  useEffect(() => {
    if (!isSignedInAdmin && adminViewMode !== 'admin') {
      setAdminViewMode('admin');
      window.localStorage.removeItem(ADMIN_VIEW_MODE_KEY);
    }
  }, [isSignedInAdmin, adminViewMode]);

  useEffect(() => {
    if (isSignedInAdmin && adminViewMode === 'user' && isAdminRoute) {
      router.replace('/dashboard');
    }
  }, [isSignedInAdmin, adminViewMode, isAdminRoute, router]);

  function handleToggleAdminViewMode() {
    if (!isSignedInAdmin) {
      return;
    }

    const nextMode: AdminViewMode = adminViewMode === 'admin' ? 'user' : 'admin';
    setAdminViewMode(nextMode);
    window.localStorage.setItem(ADMIN_VIEW_MODE_KEY, nextMode);

    if (nextMode === 'user' && isAdminRoute) {
      router.push('/dashboard');
      return;
    }

    if (nextMode === 'admin' && !isAdminRoute) {
      router.push('/admin');
    }
  }

  return (
    <section className="flex flex-col min-h-screen">
      {!isAdminRoute && <Header adminViewMode={adminViewMode} />}
      {isSignedInAdmin && (
        <AdminViewModeToggle mode={adminViewMode} onToggle={handleToggleAdminViewMode} />
      )}
      {children}
    </section>
  );
}
