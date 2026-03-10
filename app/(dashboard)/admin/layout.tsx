'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Users, 
  FileText, 
  CreditCard, 
  Settings, 
  BarChart3,
  Home,
  LogOut 
} from 'lucide-react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const response = await fetch('/api/auth/user');
      if (response.ok) {
        const userData = await response.json();
        if (userData.role === 'supersystemAdmin' || userData.role === 'systemAdmin' || userData.role === 'owner') {
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <section className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">System Administration</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {user && (
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {user.role}
                  </Badge>
                </div>
              )}
              <Button 
                variant="outline" 
                onClick={handleSignOut}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto py-3">
            <Link href="/admin" className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-blue-600 whitespace-nowrap">
              <Home className="h-4 w-4" />
              <span>Overview</span>
            </Link>
            <Link href="/admin/users" className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-blue-600 whitespace-nowrap">
              <Users className="h-4 w-4" />
              <span>Users</span>
            </Link>
            <Link href="/admin/templates" className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-blue-600 whitespace-nowrap">
              <FileText className="h-4 w-4" />
              <span>Templates</span>
            </Link>
            <Link href="/admin/subscriptions" className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-blue-600 whitespace-nowrap">
              <CreditCard className="h-4 w-4" />
              <span>Subscriptions</span>
            </Link>
            <Link href="/admin/reports" className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-blue-600 whitespace-nowrap">
              <BarChart3 className="h-4 w-4" />
              <span>Reports</span>
            </Link>
            <Link href="/admin/stripe-config" className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-blue-600 whitespace-nowrap">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </section>
  );
}
