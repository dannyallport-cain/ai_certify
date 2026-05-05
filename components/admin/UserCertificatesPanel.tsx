"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, ExternalLink, FileText, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type CertificateCustomer = {
  name: string | null;
  email: string | null;
};

type CertificateRecord = {
  id: number;
  certificateNumber: string;
  certificateType: string;
  status: string;
  inspectionDate: string | null;
  createdAt: string | null;
  siteName: string | null;
};

type CertificateRow = {
  certificate: CertificateRecord;
  customer: CertificateCustomer | null;
};

type UserCertificatesPanelProps = {
  userId: number;
};

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatTime(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function UserCertificatesPanel({ userId }: UserCertificatesPanelProps) {
  const [certificates, setCertificates] = useState<CertificateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCertificates() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/users/${userId}/certificates`, {
          cache: "no-store",
          signal: controller.signal,
        });

        const data = (await response.json().catch(() => null)) as
          | { certificates?: CertificateRow[]; error?: string }
          | null;

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load certificates");
        }

        setCertificates(data?.certificates ?? []);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load certificates");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadCertificates();

    return () => controller.abort();
  }, [userId]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Certificates</p>
          <p className="text-xs text-slate-500">
            Team certificates visible from this user's account context.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          {certificates.length} total
        </span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading certificates...
        </div>
      ) : error ? (
        <div className="py-6 text-sm text-rose-600">{error}</div>
      ) : certificates.length === 0 ? (
        <div className="py-6 text-sm text-slate-500">No certificates found for this team.</div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Certificate</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Inspection</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {certificates.map(({ certificate, customer }) => (
                <tr key={certificate.id} className="border-b border-slate-100 align-top hover:bg-slate-50/70">
                  <td className="px-3 py-3">
                    <div className="flex items-start gap-2 font-medium text-slate-900">
                      <FileText className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <div>{certificate.certificateNumber}</div>
                        <div className="text-xs font-normal text-slate-500">
                          {certificate.siteName || "No site recorded"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{certificate.certificateType}</td>
                  <td className="px-3 py-3 text-slate-700">
                    <div className="font-medium text-slate-900">{customer?.name || "—"}</div>
                    <div className="text-xs text-slate-500">{customer?.email || "No email"}</div>
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span>{formatDate(certificate.inspectionDate)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    <div>{formatDate(certificate.createdAt)}</div>
                    <div className="text-xs text-slate-500">{formatTime(certificate.createdAt)}</div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700">
                      {certificate.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/certificates/${certificate.id}`}>
                          <ExternalLink className="h-4 w-4" />
                          View
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm">
                        <a href={`/api/certificates/${certificate.id}/pdf`} aria-label={`Download PDF for ${certificate.certificateNumber}`}>
                          PDF
                        </a>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
