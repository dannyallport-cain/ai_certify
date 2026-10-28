import { getTeamForUser } from '@/lib/db/queries';
import { resolveTeamLogoUrl } from '@/lib/storage/team-logo';

export const dynamic = 'force-dynamic';

export async function GET() {
  const team = await getTeamForUser();

  if (!team) {
    return Response.json({ error: 'Team not found' }, { status: 404 });
  }

  // The logo bytes live in R2, so the payload carries a URL to the team-scoped
  // logo endpoint instead of embedding the image in every team response.
  return Response.json({
    ...team,
    logoR2Key: undefined,
    logoUrl: resolveTeamLogoUrl(team),
    logoDataUri: team.logoR2Key ? null : team.logoDataUri ?? null,
  });
}
