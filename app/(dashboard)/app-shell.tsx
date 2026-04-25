'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowRightLeft, CheckCircle2, Loader2, Plug } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut } from '@/app/(login)/actions';
import { usePathname, useRouter } from 'next/navigation';
import { User } from '@/lib/db/schema';
import { isAdminRole } from '@/lib/auth/roles';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const ADMIN_VIEW_MODE_KEY = 'admin-dashboard-view-mode';

type AdminViewMode = 'admin' | 'user';
type TeamSummary = {
  name: string;
};

type ServiceM8ConnectionPayload = {
  connected: boolean;
  connection?: {
    id: number;
    isActive: boolean | null;
    servicem8CompanyName: string | null;
    syncEnabled: boolean | null;
    syncDirection: string | null;
    lastSyncAt: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  };
  error?: string;
};

const servicem8Fetcher = async (url: string): Promise<ServiceM8ConnectionPayload> => {
  const res = await fetch(url, { credentials: 'include' });
  const body = (await res.json().catch(() => ({}))) as ServiceM8ConnectionPayload;

  if (!res.ok) {
    throw new Error(body.error || 'Failed to load ServiceM8 connection');
  }

  return body;
};

function getInitialAdminViewMode(): AdminViewMode {
  if (typeof window === 'undefined') {
    return 'admin';
  }

  const storedMode = window.localStorage.getItem(ADMIN_VIEW_MODE_KEY);
  return storedMode === 'user' ? 'user' : 'admin';
}

function AdminViewModeToggle({
  mode,
  onToggle
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

function UserMenu() {
  const { data, error } = useSWR<User>('/api/user', fetcher);

  if (error) {
    return <div className="text-sm text-red-500">Error loading user menu.</div>;
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

  return (
    <Avatar className="size-9">
      <AvatarImage src={user.avatarUrl || undefined} alt={user.name || user.email || ''} />
      <AvatarFallback>
        {user.email ? user.email.split(' ').map((n) => n[0]).join('') : '?'}
      </AvatarFallback>
    </Avatar>
  );
}

function Header({ adminViewMode }: { adminViewMode: AdminViewMode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const { data: team } = useSWR<TeamSummary>('/api/team', fetcher);
  const {
    data: serviceM8Connection,
    error: serviceM8Error,
    isLoading: serviceM8Loading,
  } = useSWR<ServiceM8ConnectionPayload>('/api/servicem8/connection', servicem8Fetcher);
  const showAdminLink = isAdminRole(user?.role) && adminViewMode === 'admin';
  const showLogoutButton = Boolean(user) && !(pathname?.startsWith('/dashboard') ?? false);

  async function handleLogout() {
    await signOut();
    router.refresh();
    router.push('/');
  }

  const displayUserName = user?.name?.trim() || user?.email || 'Account';
  const displayTeamName = team?.name?.trim() || 'Team';
  const serviceM8Status = serviceM8Error
    ? 'error'
    : serviceM8Loading
      ? 'loading'
      : serviceM8Connection?.connected
        ? 'connected'
        : 'disconnected';

  const serviceM8Label =
    serviceM8Status === 'connected'
      ? 'ServiceM8 connected'
      : serviceM8Status === 'error'
        ? 'ServiceM8 connection failed'
        : serviceM8Status === 'loading'
          ? 'Checking ServiceM8'
          : 'ServiceM8 not connected';

  return (
    <header className="border-b border-gray-200">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center">
          <Image
            src="/screenshots/icon-512.png"
            alt="AI-Certificates"
            width={32}
            height={32}
            className="rounded-lg"
          />
          <span className="ml-2 text-xl font-semibold text-gray-900">
            AI-Certificates
          </span>
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
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/servicem8"
            aria-label={serviceM8Label}
            title={serviceM8Label}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              serviceM8Status === 'connected'
                ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                : serviceM8Status === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                  : serviceM8Status === 'loading'
                    ? 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {serviceM8Status === 'connected' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : serviceM8Status === 'error' ? (
              <AlertCircle className="h-4 w-4" />
            ) : serviceM8Status === 'loading' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plug className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">ServiceM8</span>
          </Link>
          {showLogoutButton && (
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          )}
          <div className="hidden min-w-0 flex-col items-end leading-tight sm:flex">
            <span className="max-w-40 truncate text-sm font-medium text-gray-900">
              {displayUserName}
            </span>
            <span className="max-w-40 truncate text-xs text-gray-500">
              {displayTeamName}
            </span>
          </div>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const [adminViewMode, setAdminViewMode] = useState<AdminViewMode>('admin');
  const isAdminRoute =
    pathname?.startsWith('/admin') || pathname?.startsWith('/dashboard/admin');
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

    const nextMode: AdminViewMode =
      adminViewMode === 'admin' ? 'user' : 'admin';
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
        <AdminViewModeToggle
          mode={adminViewMode}
          onToggle={handleToggleAdminViewMode}
        />
      )}
      {children}
    </section>
  );
}
