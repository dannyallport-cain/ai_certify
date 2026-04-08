import { redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';
import { AppShell } from './app-shell';

export default async function Layout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  return <AppShell>{children}</AppShell>;
}
