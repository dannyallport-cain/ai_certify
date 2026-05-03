"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import IssueCertificateModal from '@/components/IssueCertificateModal';
import {
  Search,
  Download,
  FileText,
  Calendar,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

type CertRow = any;

type CertificateListProps = {
  initialCertificates: CertRow[];
  initialTotal: number;
  initialPage?: number;
  initialPageSize?: number;
};

type PaginatedCertificateResponse = {
  items: CertRow[];
  total: number;
  page: number;
  pageSize: number;
};

type IssueCertificateTarget = {
  id: number;
  certificateNumber: string;
  certificateType: string;
  customerEmail?: string | null;
};

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [20, 50, 100];

export default function CertificateList({
  initialCertificates,
  initialTotal,
  initialPage = 1,
  initialPageSize = DEFAULT_PAGE_SIZE,
}: CertificateListProps) {
  const [items, setItems] = useState(initialCertificates);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState<'inspectionDate' | 'certificateNumber' | 'certificateType' | 'createdAt'>('inspectionDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [groupBy, setGroupBy] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [issueTarget, setIssueTarget] = useState<IssueCertificateTarget | null>(null);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, typeFilter, statusFilter, sortKey, sortDir, dateFrom, dateTo]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchPage() {
      setIsLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm.trim());
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      params.set('sortKey', sortKey);
      params.set('sortDir', sortDir);
      params.set('page', String(page));
      params.set('limit', String(pageSize));

      try {
        const response = await fetch(`/api/certificates?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error || 'Failed to load certificates');
        }

        const data = (await response.json()) as PaginatedCertificateResponse;
        setItems(data.items);
        setTotal(data.total);
        setPage(data.page);
        setPageSize(data.pageSize);
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to load certificates');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchPage();
    return () => controller.abort();
  }, [searchTerm, typeFilter, statusFilter, sortKey, sortDir, dateFrom, dateTo, page, pageSize]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const groups = useMemo(() => {
    if (!groupBy) {
      return { '': items };
    }

    return items.reduce((acc: Record<string, CertRow[]>, row: CertRow) => {
      const cert = row.certificate || row;
      const key = cert[groupBy] || 'Unspecified';
      if (!acc[key]) acc[key] = [];
      acc[key].push(row);
      return acc;
    }, {});
  }, [groupBy, items]);

  const resetFilters = () => {
    setSearchTerm('');
    setTypeFilter('');
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setSortKey('inspectionDate');
    setSortDir('desc');
    setGroupBy('');
  };

  const handleOpenIssue = (row: CertRow) => {
    const cert = row.certificate || row;

    setIssueTarget({
      id: cert.id,
      certificateNumber: cert.certificateNumber || '—',
      certificateType: cert.certificateType || '—',
      customerEmail: row.customer?.email || null,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <label htmlFor="certificate-search" className="sr-only">
            Search certificates
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="certificate-search"
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search address, cert no, customer..."
            className="w-full border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label="Filter by certificate type"
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
        >
          <option value="">All types</option>
          {Array.from(new Set(initialCertificates.map((row: any) => (row.certificate || row).certificateType))).map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
        >
          <option value="">All statuses</option>
          {Array.from(new Set(initialCertificates.map((row: any) => (row.certificate || row).status))).map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced((current) => !current)}
          aria-expanded={showAdvanced}
          aria-controls="advanced-certificate-filters"
        >
          <ArrowUpDown className="h-4 w-4" />
          Advanced
        </Button>
      </div>

      {showAdvanced && (
        <div id="advanced-certificate-filters" className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Inspection date from</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Inspection date to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Sort field</span>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as any)}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              >
                <option value="inspectionDate">Date</option>
                <option value="certificateNumber">Certificate No</option>
                <option value="certificateType">Type</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Sort direction</span>
              <select
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              >
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <span className="font-medium">Group by</span>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              >
                <option value="">No grouping</option>
                <option value="certificateType">Type</option>
                <option value="status">Status</option>
              </select>
            </div>
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Clear filters
            </Button>
          </div>
        </div>
      )}

      {error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-6 text-sm text-slate-500">Loading certificates…</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">No certificates match your search and filters.</div>
        ) : (
          Object.entries(groups).map(([groupName, rows]) => (
            <div key={groupName} className="border-b last:border-b-0">
              {groupBy && (
                <div className="rounded-t-3xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
                  {groupName} ({rows.length})
                </div>
              )}
              <table className="min-w-full border-collapse">
                <caption className="sr-only">Certificate list</caption>
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Certificate</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row: any) => {
                    const cert = row.certificate || row;
                    return (
                      <tr key={cert.id} className="border-b last:border-b-0 hover:bg-slate-50">
                        <td className="px-4 py-4 align-top text-sm">
                          <div className="flex items-center gap-2 font-medium text-slate-900">
                            <FileText className="h-4 w-4 text-primary" />
                            <span>{cert.certificateNumber || '—'}</span>
                          </div>
                          <div className="mt-1 text-xs text-slate-500">{cert.siteName || 'No site'}</div>
                        </td>
                        <td className="px-4 py-4 align-top text-sm">{cert.certificateType || '—'}</td>
                        <td className="px-4 py-4 align-top text-sm">{(row.customer && row.customer.name) || '—'}</td>
                        <td className="px-4 py-4 align-top text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{cert.inspectionDate ? new Date(cert.inspectionDate).toLocaleDateString() : '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top text-sm text-slate-600">
                          {cert.createdAt ? (
                            <div className="space-y-0.5">
                              <div>{new Date(cert.createdAt).toLocaleDateString()}</div>
                              <div className="text-xs text-slate-500">
                                {new Date(cert.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-4 align-top text-sm">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            {cert.status || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-4 align-top text-sm">
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/certificates/${cert.id}`}>
                              <Button variant="ghost" size="sm">
                                View
                              </Button>
                            </Link>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenIssue(row)}
                            >
                              New issue
                            </Button>
                            <Button asChild variant="outline" size="sm">
                              <a
                                href={`/api/certificates/${cert.id}/pdf`}
                                aria-label={`Download PDF for ${cert.certificateNumber || 'certificate'}`}
                              >
                                <Download className="h-4 w-4" />
                                PDF
                              </a>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-600">Showing {items.length} of {total} certificates</div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Page size
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-2 text-sm">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-slate-600">Page {page} of {pageCount}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pageCount}
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {issueTarget ? (
        <IssueCertificateModal
          open={Boolean(issueTarget)}
          certificateId={issueTarget.id}
          certificateNumber={issueTarget.certificateNumber}
          certificateType={issueTarget.certificateType}
          defaultRecipientEmail={issueTarget.customerEmail}
          onClose={() => setIssueTarget(null)}
        />
      ) : null}
    </div>
  );
}
