'use client';

import dynamic from 'next/dynamic';

const TeamMembers = dynamic(() => import('./TeamMembers').then(mod => mod.TeamMembers), { ssr: false });
const ManageSubscription = dynamic(() => import('./ManageSubscription').then(mod => mod.ManageSubscription), { ssr: false });

export function DashboardClient() {
  return (
    <>
      <TeamMembers />
      <ManageSubscription />
    </>
  );
} 