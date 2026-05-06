'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Search, X } from 'lucide-react';
import useSWR from 'swr';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ServiceM8Job } from '@/lib/servicem8/client';

export type ServiceM8JobPickerItem = Pick<
  ServiceM8Job,
  | 'uuid'
  | 'generated_job_id'
  | 'job_address'
  | 'job_description'
  | 'work_done_description'
  | 'date'
  | 'status'
  | 'first_name'
  | 'last_name'
  | 'company_uuid'
  | 'company_name'
  | 'address'
  | 'billing_address'
  | 'billing_city'
  | 'billing_postcode'
  | 'billing_state'
  | 'billing_country'
  | 'address_street'
  | 'address_city'
  | 'address_postcode'
  | 'address_state'
  | 'address_country'
  | 'billing_address2'
  | 'billing_attention'
> & {
  firstName?: string | null;
  lastName?: string | null;
  workAddress?: string | null;
  billingAddress?: string | null;
  billingContactName?: string | null;
  companyName?: string | null;
  customerName?: string | null;
  postcode?: string | null;
  billingPostcode?: string | null;
};

type ServiceM8JobPickerModalProps = {
  open: boolean;
  selectedJobUuid?: string | null;
  onClose: () => void;
  onSelect: (job: ServiceM8JobPickerItem) => void;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
const STATUS_OPTIONS = ['all', 'Work Order', 'Quote', 'Completed'] as const;
const SORT_OPTIONS = [
  { label: 'Inspection date', value: 'date' },
  { label: 'Job number', value: 'generated_job_id' },
  { label: 'Description', value: 'job_description' },
  { label: 'Status', value: 'status' },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]['value'];
type StatusFilter = (typeof STATUS_OPTIONS)[number];

type ServiceM8JobsResponse = {
  jobs?: ServiceM8JobPickerItem[];
  error?: string;
};

const fetcher = async (url: string): Promise<ServiceM8JobsResponse> => {
  const response = await fetch(url);
  const payload = (await response.json().catch(() => null)) as ServiceM8JobsResponse | null;

  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to fetch jobs');
  }

  return payload ?? {};
};

function formatDate(value: string | null) {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
}

function formatCustomerName(job: ServiceM8JobPickerItem) {
  return (
    job.billingContactName?.trim() ||
    job.customerName?.trim() ||
    job.companyName?.trim() ||
    [job.firstName, job.lastName, job.first_name, job.last_name]
      .map((part) => (typeof part === 'string' ? part.trim() : ''))
      .filter(Boolean)
      .join(' ') ||
    '-'
  );
}

function getStatusTone(status: string | null) {
  switch (status?.toLowerCase()) {
    case 'completed':
      return 'secondary';
    case 'work order':
      return 'default';
    case 'quote':
      return 'outline';
    default:
      return 'outline';
  }
}

function compareValues(left: string | null | undefined, right: string | null | undefined, order: 'asc' | 'desc') {
  const leftValue = (left ?? '').trim().toLowerCase();
  const rightValue = (right ?? '').trim().toLowerCase();

  if (leftValue === rightValue) {
    return 0;
  }

  const result = leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: 'base' });
  return order === 'asc' ? result : -result;
}

function compareDates(left: string | null | undefined, right: string | null | undefined, order: 'asc' | 'desc') {
  const leftTime = left ? new Date(left).getTime() : Number.NaN;
  const rightTime = right ? new Date(right).getTime() : Number.NaN;

  if (leftTime === rightTime) {
    return 0;
  }

  if (!Number.isFinite(leftTime)) {
    return order === 'asc' ? -1 : 1;
  }

  if (!Number.isFinite(rightTime)) {
    return order === 'asc' ? 1 : -1;
  }

  return order === 'asc' ? leftTime - rightTime : rightTime - leftTime;
}

function sortJobs(jobs: ServiceM8JobPickerItem[], sort: SortKey, order: 'asc' | 'desc') {
  const sorted = [...jobs];

  sorted.sort((left, right) => {
    switch (sort) {
      case 'date':
        return compareDates(left.date, right.date, order);
      case 'generated_job_id':
        return compareValues(left.generated_job_id, right.generated_job_id, order);
      case 'job_description':
        return compareValues(left.job_description, right.job_description, order);
      case 'status':
        return compareValues(left.status, right.status, order);
      default:
        return 0;
    }
  });

  return sorted;
}

export default function ServiceM8JobPickerModal({
  open,
  selectedJobUuid,
  onClose,
  onSelect,
}: ServiceM8JobPickerModalProps) {
  const { data, error: fetchError, isLoading } = useSWR<ServiceM8JobsResponse>('/api/servicem8/jobs', fetcher);
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('date');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(25);
  const [pageIndex, setPageIndex] = useState(0);

  const jobs = Array.isArray(data?.jobs) ? data.jobs : [];

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setPageIndex(0);
  }, [open, searchTerm, status, sort, order, pageSize]);

  const filteredJobs = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();

    const matchesSearch = (job: ServiceM8JobPickerItem) => {
      if (!needle) {
        return true;
      }

      const haystack = [
        job.uuid,
        job.generated_job_id,
        job.job_address,
        job.workAddress,
        job.billingAddress,
        job.job_description,
        job.work_done_description,
        job.firstName,
        job.lastName,
        job.first_name,
        job.last_name,
        job.billingContactName,
        job.customerName,
        job.companyName,
        job.status,
        job.date,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(needle);
    };

    const matchesStatus = (job: ServiceM8JobPickerItem) => {
      if (status === 'all') {
        return true;
      }

      return (job.status ?? '').trim().toLowerCase() === status.toLowerCase();
    };

    return sortJobs(
      jobs.filter((job) => matchesSearch(job) && matchesStatus(job)),
      sort,
      order,
    );
  }, [jobs, order, searchTerm, sort, status]);

  const pageCount = filteredJobs.length > 0 ? Math.ceil(filteredJobs.length / pageSize) : 0;
  const safePageIndex = pageCount > 0 ? Math.min(pageIndex, pageCount - 1) : 0;
  const currentPageJobs = filteredJobs.slice(safePageIndex * pageSize, safePageIndex * pageSize + pageSize);
  const hasPreviousPage = safePageIndex > 0;
  const hasNextPage = pageCount > 0 && safePageIndex < pageCount - 1;
  const hasLoadedJobs = jobs.length > 0;
  const loadingState = isLoading && !fetchError && !hasLoadedJobs;

  const handleSelect = (job: ServiceM8JobPickerItem) => {
    onSelect(job);
    onClose();
  };

  const handlePreviousPage = () => {
    if (!hasPreviousPage) {
      return;
    }

    setPageIndex((current) => Math.max(0, current - 1));
  };

  const handleNextPage = () => {
    if (!hasNextPage) {
      return;
    }

    setPageIndex((current) => current + 1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatus('all');
    setSort('date');
    setOrder('desc');
    setPageSize(25);
    setPageIndex(0);
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="ServiceM8 job picker"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Choose a ServiceM8 job</h2>
            <p className="mt-1 text-sm text-slate-600">
              Search, sort, and page through your ServiceM8 jobs directly in the picker.
            </p>
          </div>

          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close job picker">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search job ID, description, address, customer..."
              className="h-10 pl-9"
            />
          </div>

          <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option === 'all' ? 'All statuses' : option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={order} onValueChange={(value) => setOrder(value as 'asc' | 'desc')}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="Order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Newest first</SelectItem>
              <SelectItem value="asc">Oldest first</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={String(pageSize)}
            onValueChange={(value) => setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number])}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="Page size" />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option} rows
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button type="button" variant="outline" size="sm" onClick={handleResetFilters}>
            Reset
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {fetchError ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {fetchError instanceof Error ? fetchError.message : 'Failed to load ServiceM8 jobs'}
            </div>
          ) : null}

          <Card className="border-slate-200 shadow-none">
            <CardHeader className="border-b border-slate-200 bg-white py-4">
              <CardTitle className="text-base">Jobs</CardTitle>
              <CardDescription>
                {loadingState ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading jobs...
                  </span>
                ) : (
                  <>
                    Showing {currentPageJobs.length} of {filteredJobs.length} jobs
                    {pageCount > 0 ? ` · page ${safePageIndex + 1} of ${pageCount}` : ''}
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3">Job ID</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Address</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingState ? (
                      <tr>
                        <td className="px-4 py-10 text-center text-sm text-muted-foreground" colSpan={7}>
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading jobs...
                          </div>
                        </td>
                      </tr>
                    ) : currentPageJobs.length ? (
                      currentPageJobs.map((job) => {
                        const isSelected = job.uuid === selectedJobUuid;

                        return (
                          <tr
                            key={job.uuid}
                            className={cn(
                              'border-b border-slate-200 text-sm text-slate-700 hover:bg-slate-50',
                              isSelected && 'bg-primary/5',
                            )}
                          >
                            <td className="px-4 py-3 font-medium text-slate-900">
                              {job.generated_job_id || job.uuid}
                            </td>
                            <td className="px-4 py-3">{formatDate(job.date)}</td>
                            <td className="px-4 py-3">{formatCustomerName(job)}</td>
                            <td className="px-4 py-3">
                              <Badge variant={getStatusTone(job.status)}>{job.status || 'Unknown'}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="max-w-[24rem] break-words">
                                {job.job_description || job.work_done_description || '-'}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="max-w-[26rem] break-words text-muted-foreground">
                                {job.workAddress || job.address || job.job_address || '-'}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                type="button"
                                variant={isSelected ? 'secondary' : 'outline'}
                                size="sm"
                                onClick={() => handleSelect(job)}
                              >
                                {isSelected ? 'Selected' : 'Select'}
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="px-4 py-10 text-center text-sm text-muted-foreground" colSpan={7}>
                          No jobs found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {pageCount > 0 ? (
              <>
                Showing {currentPageJobs.length} jobs on this page
                {hasNextPage ? ' · more results available' : ' · end of results'}
              </>
            ) : (
              'No results to display'
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handlePreviousPage} disabled={!hasPreviousPage}>
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="min-w-[90px] text-center text-sm text-muted-foreground">
              Page {pageCount === 0 ? 0 : safePageIndex + 1} of {pageCount}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleNextPage} disabled={!hasNextPage}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
