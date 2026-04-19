import { getTeamForUser } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export async function GET() {
  const team = await getTeamForUser();

  if (!team) {
    return Response.json({ error: 'Team not found' }, { status: 404 });
  }

  return Response.json({
    id: team.id,
    name: team.name,
    logoDataUri: team.logoDataUri || null,
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
