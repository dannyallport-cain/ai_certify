import { notFound, redirect } from 'next/navigation';

import DesignStudio from '@/components/design/DesignStudio';
import { getTeamForUser, getUser } from '@/lib/db/queries';
import { getDesign } from '@/lib/design/store';

export const dynamic = 'force-dynamic';

interface DesignPageProps {
  params: Promise<{ id: string }>;
}

function parseId(value: string): number | null {
  const id = Number.parseInt(value, 10);

  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function generateMetadata({ params }: DesignPageProps) {
  const user = await getUser();

  if (!user) {
    return { title: 'Building design' };
  }

  const team = await getTeamForUser();

  if (!team) {
    return { title: 'Building design' };
  }

  const { id } = await params;
  const designId = parseId(id);

  if (!designId) {
    return { title: 'Building design' };
  }

  const design = await getDesign(designId, team.id).catch(() => null);

  return { title: design ? design.name : 'Building design' };
}

/** The editor: full document load, everything else happens in the browser. */
export default async function DesignPage({ params }: DesignPageProps) {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const team = await getTeamForUser();

  if (!team) {
    redirect('/dashboard');
  }

  const { id } = await params;
  const designId = parseId(id);

  if (!designId) {
    notFound();
  }

  const design = await getDesign(designId, team.id);

  if (!design) {
    notFound();
  }

  return (
    <DesignStudio
      designId={design.id}
      initialDesign={design.design}
      initialShareToken={design.shareToken}
      updatedAt={design.updatedAt}
    />
  );
}
