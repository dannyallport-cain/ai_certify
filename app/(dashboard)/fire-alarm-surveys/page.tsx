/**
 * Fire alarm surveys.
 *
 * The list the dashboard was missing: every survey the mobile app has saved for
 * this team, with the client and ServiceM8 job it was filed against so the
 * office can find a visit without opening the app.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Briefcase, CheckCircle2, Flame, MapPin } from 'lucide-react';

import SurveysTable from '@/components/fire-alarm/surveys-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTeamForUser, getUser } from '@/lib/db/queries';
import { listFireAlarmSurveys } from '@/lib/fire-alarm/survey-repository';

export const metadata = {
  title: 'Fire alarm surveys',
};

export default async function FireAlarmSurveysPage() {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const team = await getTeamForUser();

  if (!team) {
    redirect('/dashboard');
  }

  const surveys = await listFireAlarmSurveys(team.id);

  const completedCount = surveys.filter((survey) => survey.status === 'completed').length;
  const linkedCount = surveys.filter((survey) => Boolean(survey.serviceM8?.jobUuid)).length;
  const deviceTotal = surveys.reduce((total, survey) => total + survey.deviceCount, 0);

  return (
    <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Flame className="h-7 w-7 text-orange-500" />
            Fire alarm surveys
          </h2>
          <p className="text-muted-foreground">
            Captures from the mobile app, filed against the client and job they belong to.
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href="/mobile-capture">
            <MapPin className="mr-2 h-4 w-4" />
            Mobile capture
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Surveys</CardTitle>
            <Flame className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{surveys.length}</div>
            <p className="text-xs text-muted-foreground">Saved captures for this team</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCount}</div>
            <p className="text-xs text-muted-foreground">
              {surveys.length - completedCount} still in draft
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Linked to ServiceM8</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{linkedCount}</div>
            <p className="text-xs text-muted-foreground">Filed against a job in the diary</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Devices</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deviceTotal}</div>
            <p className="text-xs text-muted-foreground">Identified across all surveys</p>
          </CardContent>
        </Card>
      </div>

      <SurveysTable surveys={surveys} />
    </main>
  );
}
