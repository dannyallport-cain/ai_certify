/**
 * One fire alarm survey.
 *
 * Shows what the engineer captured, which client and ServiceM8 job it belongs
 * to, and the published zone plan link if there is one. Rename, completion and
 * job linking live in the client components so this page stays a read view.
 */

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, ExternalLink, Flame, MapPin } from 'lucide-react';

import SurveyActions from '@/components/fire-alarm/survey-actions';
import SurveyServiceM8Panel from '@/components/fire-alarm/survey-servicem8-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getTeamForUser, getUser } from '@/lib/db/queries';
import {
  SURVEY_STATUS_LABELS,
  describeSurveyContents,
  formatSurveyDateTime,
  resolveSurveyAddress,
} from '@/lib/fire-alarm/format';
import { getFireAlarmSurvey } from '@/lib/fire-alarm/survey-repository';

interface SurveyDetailPageProps {
  params: Promise<{ id: string }>;
}

function formatCoordinate(value: number | null): string {
  return typeof value === 'number' ? value.toFixed(1) : '—';
}

export default async function SurveyDetailPage({ params }: SurveyDetailPageProps) {
  const { id } = await params;
  const surveyId = Number.parseInt(id, 10);

  if (!Number.isFinite(surveyId) || surveyId <= 0) {
    notFound();
  }

  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const team = await getTeamForUser();

  if (!team) {
    redirect('/dashboard');
  }

  const survey = await getFireAlarmSurvey(team.id, surveyId);

  if (!survey) {
    notFound();
  }

  const address = resolveSurveyAddress({ serviceM8: survey.serviceM8 });

  return (
    <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/fire-alarm-surveys">
            <ArrowLeft className="mr-1 h-4 w-4" />
            All surveys
          </Link>
        </Button>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Flame className="h-6 w-6 shrink-0 text-orange-500" />
              <span className="min-w-0 break-words">{survey.name}</span>
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <Badge variant={survey.status === 'completed' ? 'secondary' : 'outline'}>
                {SURVEY_STATUS_LABELS[survey.status]}
              </Badge>
              <span>{describeSurveyContents(survey.deviceCount, survey.roomCount)}</span>
              {address ? (
                <span className="inline-flex items-start gap-1">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="max-w-[32rem]">{address}</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <SurveyActions surveyId={survey.id} name={survey.name} status={survey.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Identified devices</CardTitle>
              <CardDescription>
                {survey.devices.length > 0
                  ? 'Every device saved with this survey, in capture order.'
                  : 'No devices were saved with this survey.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {survey.devices.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
                  Save the survey again from the mobile app after identifying devices to
                  populate this list.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Label</th>
                        <th className="px-3 py-2">Manufacturer</th>
                        <th className="px-3 py-2">Room</th>
                        <th className="px-3 py-2">Position (m)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {survey.devices.map((device) => (
                        <tr
                          key={device.id}
                          className="border-b border-slate-200 text-sm text-slate-700 last:border-0"
                        >
                          <td className="px-3 py-2 font-medium capitalize text-slate-900">
                            {device.deviceType.replaceAll('_', ' ')}
                          </td>
                          <td className="px-3 py-2">{device.label ?? '—'}</td>
                          <td className="px-3 py-2">{device.manufacturerName ?? '—'}</td>
                          <td className="px-3 py-2">{device.roomId ?? '—'}</td>
                          <td className="px-3 py-2 tabular-nums text-slate-600">
                            {`${formatCoordinate(device.locationX)}, ${formatCoordinate(device.locationY)}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Zone plan</CardTitle>
              <CardDescription>
                The drawing published from the plan step, if one was shared.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {survey.zonePlan ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {survey.zonePlan.title ?? 'Published zone plan'}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {survey.zonePlan.emailedTo
                        ? `Emailed to ${survey.zonePlan.emailedTo}`
                        : 'Share link available'}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={survey.zonePlan.viewerPath}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open viewer
                      <ExternalLink className="ml-1 h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-slate-600">
                  No zone plan has been published for this survey yet. Publish one from the
                  plan step in the mobile app to add the drawing here.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>ServiceM8 job</CardTitle>
              <CardDescription>
                File the survey against a job so it appears in the diary for that job.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SurveyServiceM8Panel
                surveyId={survey.id}
                serviceM8={survey.serviceM8}
                customerName={survey.customerName}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Capture detail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Session</span>
                <span className="truncate font-mono text-xs text-slate-700">
                  {survey.sessionId}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Units</span>
                <span className="text-slate-700">{survey.units ?? 'Not specified'}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Started</span>
                <span className="text-slate-700">
                  {formatSurveyDateTime(survey.startedAt) ?? '—'}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Completed</span>
                <span className="text-slate-700">
                  {formatSurveyDateTime(survey.completedAt) ?? '—'}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Last updated</span>
                <span className="text-slate-700">
                  {formatSurveyDateTime(survey.updatedAt) ?? '—'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
