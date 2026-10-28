'use client';

/**
 * Links a survey to a ServiceM8 job from the dashboard.
 *
 * Picking a job is what removes the client-detail typing: the API resolves the
 * job's client, mirrors it into `customers`, and attaches the survey summary to
 * the job in ServiceM8. The panel only has to send the job uuid.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, CalendarDays, ExternalLink, Loader2, MapPin, Unlink } from 'lucide-react';

import ServiceM8JobPickerModal, {
  type ServiceM8JobPickerItem,
} from '@/components/servicem8/ServiceM8JobPickerModal';
import { Button } from '@/components/ui/button';
import { describeServiceM8Job, formatSurveyDate } from '@/lib/fire-alarm/format';
import type { FireAlarmSurveyServiceM8Link } from '@/lib/fire-alarm/types';

interface SurveyServiceM8PanelProps {
  surveyId: number;
  serviceM8: FireAlarmSurveyServiceM8Link | null;
  customerName: string | null;
}

interface LinkResponse {
  error?: string;
  customerName?: string | null;
  diary?: { status: string; message: string };
}

/**
 * ServiceM8's own URL scheme for a job, so the office can jump straight to the
 * diary entry from the survey rather than searching for it.
 */
function buildJobUrl(jobUuid: string): string {
  return `https://go.servicem8.com/job/${jobUuid}`;
}

export default function SurveyServiceM8Panel({
  surveyId,
  serviceM8,
  customerName,
}: SurveyServiceM8PanelProps) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const jobLabel = describeServiceM8Job(serviceM8);

  async function linkJob(job: ServiceM8JobPickerItem) {
    setIsLinking(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/fire-alarm/surveys/${surveyId}/serviceM8`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobUuid: job.uuid }),
      });

      const payload = (await response.json().catch(() => ({}))) as LinkResponse;

      if (!response.ok) {
        setError(payload.error ?? 'Unable to link that job.');
        return;
      }

      setNotice(
        payload.diary?.status === 'synced'
          ? 'Linked, and the survey summary was attached to the job.'
          : `Linked. ${payload.diary?.message ?? ''}`.trim(),
      );

      router.refresh();
    } catch {
      setError('Unable to reach the server. Check your connection and try again.');
    } finally {
      setIsLinking(false);
    }
  }

  async function unlinkJob() {
    setIsUnlinking(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/fire-alarm/surveys/${surveyId}/serviceM8`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as LinkResponse;
        setError(payload.error ?? 'Unable to unlink this job.');
        return;
      }

      setNotice('ServiceM8 job unlinked. The survey itself is unchanged.');
      router.refresh();
    } catch {
      setError('Unable to reach the server. Check your connection and try again.');
    } finally {
      setIsUnlinking(false);
    }
  }

  return (
    <div className="space-y-4">
      {serviceM8?.jobUuid ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50">
              <Briefcase className="h-5 w-5 text-orange-600" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">
                {jobLabel ?? 'Linked to a ServiceM8 job'}
              </p>

              {serviceM8.companyName || customerName ? (
                <p className="mt-0.5 truncate text-sm text-slate-600">
                  {serviceM8.companyName ?? customerName}
                </p>
              ) : null}

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                {serviceM8.jobDate ? (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatSurveyDate(serviceM8.jobDate)}
                  </span>
                ) : null}

                {serviceM8.jobAddress ? (
                  <span className="inline-flex items-start gap-1">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span className="max-w-[26rem]">{serviceM8.jobAddress}</span>
                  </span>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <a
                    href={buildJobUrl(serviceM8.jobUuid)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in ServiceM8
                    <ExternalLink className="ml-1 h-3.5 w-3.5" />
                  </a>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void unlinkJob()}
                  disabled={isUnlinking}
                >
                  {isUnlinking ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Unlink className="mr-1 h-3.5 w-3.5" />
                  )}
                  Unlink
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-900">Not filed against a job yet</p>
          <p className="mt-1 text-sm text-slate-600">
            Link this survey to a ServiceM8 job to add it to the diary for that job. The
            client details come across from ServiceM8, so nothing needs typing here.
          </p>
          <Button
            type="button"
            className="mt-3"
            onClick={() => setPickerOpen(true)}
            disabled={isLinking}
          >
            {isLinking ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Briefcase className="mr-2 h-4 w-4" />
            )}
            Link a ServiceM8 job
          </Button>
        </div>
      )}

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {notice ? (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {notice}
        </p>
      ) : null}

      <ServiceM8JobPickerModal
        open={pickerOpen}
        selectedJobUuid={serviceM8?.jobUuid ?? null}
        onClose={() => setPickerOpen(false)}
        onSelect={(job) => void linkJob(job)}
      />
    </div>
  );
}
