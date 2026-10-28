'use client';

/**
 * The fire alarm surveys list.
 *
 * Filtering happens in the browser over the surveys the server already resolved,
 * because the list is bounded and the interesting fields (resolved name, job
 * number) are derived rather than columns. That keeps typing instant and avoids
 * a round trip per keystroke.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Flame, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SURVEY_STATUS_LABELS,
  describeSurveyContents,
  formatSurveyDate,
  resolveSurveyAddress,
} from '@/lib/fire-alarm/format';
import type { FireAlarmSurveySummary } from '@/lib/fire-alarm/types';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'draft' | 'completed';

const STATUS_FILTERS: StatusFilter[] = ['all', 'draft', 'completed'];

interface SurveysTableProps {
  surveys: FireAlarmSurveySummary[];
}

function matchesSearch(survey: FireAlarmSurveySummary, needle: string): boolean {
  if (!needle) {
    return true;
  }

  return [
    survey.name,
    survey.customerName,
    survey.serviceM8?.companyName,
    survey.serviceM8?.jobNumber,
    survey.serviceM8?.jobAddress,
    survey.sessionId,
  ]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' ')
    .toLowerCase()
    .includes(needle);
}

export default function SurveysTable({ surveys }: SurveysTableProps) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return surveys.filter((survey) => {
      if (status !== 'all' && survey.status !== status) {
        return false;
      }

      return matchesSearch(survey, needle);
    });
  }, [search, status, surveys]);

  const isFiltering = status !== 'all' || search.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, client, job number or address"
            className="h-10 pl-9"
            aria-label="Search fire alarm surveys"
          />
        </div>

        <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
          <SelectTrigger className="h-10 w-full sm:w-44" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((option) => (
              <SelectItem key={option} value={option}>
                {option === 'all' ? 'All statuses' : SURVEY_STATUS_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">
        {isFiltering
          ? `${filtered.length} of ${surveys.length} survey${surveys.length === 1 ? '' : 's'}`
          : `${surveys.length} survey${surveys.length === 1 ? '' : 's'}`}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
          <Flame className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-sm font-semibold text-slate-900">
            {isFiltering ? 'No surveys match that filter' : 'No fire alarm surveys yet'}
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
            {isFiltering
              ? 'Try a different search term or clear the status filter.'
              : 'Surveys appear here as soon as the mobile app saves a capture. Start one from the app, or open the capture guide.'}
          </p>
          {isFiltering ? (
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSearch('');
                setStatus('all');
              }}
            >
              Clear filters
            </Button>
          ) : (
            <Button asChild variant="outline" className="mt-4">
              <Link href="/mobile-capture">
                <Flame className="mr-2 h-4 w-4" />
                Start mobile capture
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full border-collapse">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Survey</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">ServiceM8 job</th>
                <th className="px-4 py-3">Contents</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Open</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((survey) => {
                const address = resolveSurveyAddress({ serviceM8: survey.serviceM8 });

                return (
                  <tr
                    key={survey.id}
                    className="border-b border-slate-200 text-sm text-slate-700 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/fire-alarm-surveys/${survey.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {survey.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatSurveyDate(survey.startedAt ?? survey.createdAt) ?? 'No date'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {survey.customerName ? (
                        <span className="block max-w-[16rem] truncate">{survey.customerName}</span>
                      ) : (
                        <span className="text-slate-400">Not linked</span>
                      )}
                      {address ? (
                        <p className="mt-0.5 max-w-[16rem] truncate text-xs text-slate-500">
                          {address}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {survey.serviceM8?.jobNumber ? (
                        <span className="font-medium text-slate-900">
                          Job {survey.serviceM8.jobNumber}
                        </span>
                      ) : survey.serviceM8?.jobUuid ? (
                        <span className="text-slate-500">Linked</span>
                      ) : (
                        <span className="text-slate-400">Not linked</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {describeSurveyContents(survey.deviceCount, survey.roomCount)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatSurveyDate(survey.updatedAt) ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={survey.status === 'completed' ? 'secondary' : 'outline'}
                        className={cn(
                          survey.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'text-slate-600',
                        )}
                      >
                        {SURVEY_STATUS_LABELS[survey.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/fire-alarm-surveys/${survey.id}`}>
                          Open
                          <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
