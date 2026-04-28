import { getTeamForUser } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export async function GET() {
  const team = await getTeamForUser();

  if (!team) {
    return Response.json({ error: 'Team not found' }, { status: 404 });
  }

  return Response.json({
    ...team,
    logoDataUri: team.logoDataUri ?? null,
  });
}
