import { redirect } from 'next/navigation';
import { getTeamForUser, getUser } from '@/lib/db/queries';
import { isAdminRole } from '@/lib/auth/roles';
import { Team } from '@/lib/db/schema';

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'trial']);

export function hasSubscriptionAccess(team: Team | null | undefined) {
  if (!team) {
    return false;
  }

  if (team.subscriptionBypass) {
    return true;
  }

  if (
    team.subscriptionStatus &&
    ACTIVE_SUBSCRIPTION_STATUSES.has(team.subscriptionStatus)
  ) {
    return true;
  }

  if (team.trialEndDate && new Date(team.trialEndDate) > new Date()) {
    return true;
  }

  return false;
}

export async function requireSubscriptionAccess() {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (isAdminRole(user.role)) {
    return { user, team: null };
  }

  const team = await getTeamForUser();

  if (!hasSubscriptionAccess(team)) {
    redirect('/subscription');
  }

  return { user, team };
}
