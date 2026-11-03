import { redirect } from 'next/navigation';

import DesignStudio from '@/components/design/DesignStudio';
import { getTeamForUser, getUser } from '@/lib/db/queries';
import {
  DEMO_BLUEPRINT_SOURCE,
  createDemoDesign,
  summariseDemoDesign,
} from '@/lib/design/demo';

export const metadata = {
  title: 'Demonstration plan',
};

export const dynamic = 'force-dynamic';

/**
 * The demonstration plan.
 *
 * A complete two-storey zone plan, rendered by the real studio against a document that is built
 * in memory on every request: nothing is read from or written to the database until the visitor
 * chooses "save a copy". That means anyone on the team can try the whole editor — drag a
 * detector, redraw a compartment, open the inspectors — without creating junk rows, and the demo
 * can never drift out of step with the code that draws real designs.
 */
export default async function DemoDesignPage() {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const team = await getTeamForUser();

  if (!team) {
    redirect('/dashboard');
  }

  const design = createDemoDesign();

  return (
    <DesignStudio
      designId={0}
      initialDesign={design}
      initialShareToken={null}
      updatedAt={null}
      mode="demo"
      demoSummary={summariseDemoDesign(design)}
      demoSource={DEMO_BLUEPRINT_SOURCE}
    />
  );
}
