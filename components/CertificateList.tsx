"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Calendar,
  Download,
  FileText,
  Search,
  Users,
} from "lucide-react";

import IssueCertificateModal from "@/components/IssueCertificateModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ServiceM8DataTable,
  type TableOption,
} from "@/components/servicem8-data-table";

type CertificateRecord = {
  id: number;
  certificateNumber: string | null;
  certificateType: string | null;
  siteName: string | null;
  inspectionDate: string | Date | null;
  createdAt: string | Date | null;
  status: string | null;
};

type CertificateCustomer = {
  name: string | null;
  email: string | null;
};

type CertificateRow = {
  certificate: CertificateRecord;
  customer: CertificateCustomer | null;
};

type IssueCertificateTarget = {
  id: number;
  certificateNumber: string;
  certificateType: string;
  customerEmail?: string | null;
};

type CertificateListProps = {
  certificates: CertificateRow[];
};

function formatText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function formatDate(value: string | Date | null | undefined) {
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

function formatDateTime(value: string | Date | null | undefined) {
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
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getCustomerDisplayName(row: CertificateRow) {
  return formatText(row.customer?.name) || "Unknown customer";
}

function toTableOptions(values: string[]): TableOption[] {
  return values.map((value) => ({ label: value, value }));
}

function getStatusBadgeVariant(status?: string | null) {
  switch (status?.toLowerCase()) {
    case "completed":
    case "issued":
      return "default" as const;
    case "draft":
    case "in_progress":
      return "secondary" as const;
    case "failed":
    case "cancelled":
    case "canceled":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

export default function CertificateList({ certificates }: CertificateListProps) {
  const [issueTarget, setIssueTarget] = useState<IssueCertificateTarget | null>(null);

  const columns = useMemo<ColumnDef<CertificateRow>[]>(() => [
    {
      id: "certificateNumber",
      accessorFn: (row) => row.certificate.certificateNumber || "",
      header: "Certificate",
      cell: ({ row }) => {
        const cert = row.original.certificate;

        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-medium text-slate-900">
              <FileText className="h-4 w-4 text-primary" />
              <span>{cert.certificateNumber || "—"}</span>
            </div>
            <div className="text-xs text-slate-500">
              {cert.siteName || "No site recorded"}
            </div>
          </div>
        );
      },
    },
    {
      id: "certificateType",
      accessorFn: (row) => row.certificate.certificateType || "",
      header: "Type",
      cell: ({ row }) => row.original.certificate.certificateType || "—",
    },
    {
      id: "customer",
      accessorFn: (row) => getCustomerDisplayName(row),
      header: "Customer",
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-medium text-slate-900">
            {getCustomerDisplayName(row.original)}
          </div>
          <div className="text-xs text-slate-500">
            {row.original.customer?.email || "No email recorded"}
          </div>
        </div>
      ),
    },
    {
      id: "inspectionDate",
      accessorFn: (row) => {
        const value = row.certificate.inspectionDate;
        const date = value ? new Date(value) : null;
        return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
      },
      header: "Inspection date",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-slate-600">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(row.original.certificate.inspectionDate)}</span>
        </div>
      ),
    },
    {
      id: "createdAt",
      accessorFn: (row) => {
        const value = row.certificate.createdAt;
        const date = value ? new Date(value) : null;
        return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
      },
      header: "Created",
      cell: ({ row }) => (
        <div className="space-y-0.5 text-slate-600">
          <div>{formatDate(row.original.certificate.createdAt)}</div>
          <div className="text-xs text-slate-500">
            {formatDateTime(row.original.certificate.createdAt)}
          </div>
        </div>
      ),
    },
    {
      id: "status",
      accessorFn: (row) => row.certificate.status || "",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={getStatusBadgeVariant(row.original.certificate.status)} className="capitalize">
          {row.original.certificate.status || "Unknown"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => {
        const cert = row.original.certificate;

        return (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/certificates/${cert.id}`}>View</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setIssueTarget({
                  id: cert.id,
                  certificateNumber: cert.certificateNumber || "—",
                  certificateType: cert.certificateType || "—",
                  customerEmail: row.original.customer?.email || null,
                })
              }
            >
              Issue
            </Button>
            <Button asChild variant="outline" size="sm">
              <a
                href={`/api/certificates/${cert.id}/pdf`}
                aria-label={`Download PDF for ${cert.certificateNumber || "certificate"}`}
              >
                <Download className="h-4 w-4" />
                PDF
              </a>
            </Button>
          </div>
        );
      },
    },
  ], []);

  const typeOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        certificates
          .map((row) => formatText(row.certificate.certificateType))
          .filter((value): value is string => Boolean(value))
      )
    );

    return toTableOptions(values);
  }, [certificates]);

  const statusOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        certificates
          .map((row) => formatText(row.certificate.status))
          .filter((value): value is string => Boolean(value))
      )
    );

    return toTableOptions(values);
  }, [certificates]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <Search className="h-4 w-4" />
        <span>
          Search, sort, filter, group, and page through certificates in one table.
        </span>
      </div>

      <ServiceM8DataTable
        data={certificates}
        columns={columns}
        searchPlaceholder="Search certificate number, site, customer, type, or status..."
        getSearchText={(row) =>
          [
            row.certificate.certificateNumber,
            row.certificate.siteName,
            row.certificate.certificateType,
            row.certificate.status,
            row.customer?.name,
            row.customer?.email,
          ]
            .filter(Boolean)
            .join(" ")
        }
        filters={[
          ...(typeOptions.length > 0
            ? [
                {
                  columnId: "certificateType",
                  label: "Type",
                  options: typeOptions,
                },
              ]
            : []),
          ...(statusOptions.length > 0
            ? [
                {
                  columnId: "status",
                  label: "Status",
                  options: statusOptions,
                },
              ]
            : []),
        ]}
        groupOptions={[
          { label: "Type", value: "certificateType" },
          { label: "Status", value: "status" },
          { label: "Customer", value: "customer" },
        ]}
        getGroupValue={(row, groupBy) => {
          if (groupBy === "certificateType") {
            return row.certificate.certificateType || "Unspecified";
          }

          if (groupBy === "status") {
            return row.certificate.status || "Unknown";
          }

          if (groupBy === "customer") {
            return getCustomerDisplayName(row);
          }

          return "Unspecified";
        }}
        emptyMessage="No certificates found."
        initialPageSize={20}
        pageSizeOptions={[20, 50, 100]}
      />

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
