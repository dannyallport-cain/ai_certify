"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Mail, MapPin, Phone, User } from "lucide-react";

import { ServiceM8DataTable, type TableOption } from "@/components/servicem8-data-table";

export type CustomerTableRow = {
  id: number;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  postcode: string | null;
};

type CustomersTableProps = {
  customers: CustomerTableRow[];
};

function formatText(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function getCustomerDisplayName(customer: CustomerTableRow) {
  return formatText(customer.name) || "Unnamed Customer";
}

function toTableOptions(values: string[]): TableOption[] {
  return values.map((value) => ({ label: value, value }));
}

export function CustomersTable({ customers }: CustomersTableProps) {
  const columns = useMemo<ColumnDef<CustomerTableRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Customer",
        cell: ({ row }) => (
          <div className="font-medium text-gray-900">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{getCustomerDisplayName(row.original)}</span>
            </div>
            {formatText(row.original.contactPerson) ? (
              <div className="mt-1 text-xs text-muted-foreground">
                Primary contact: {formatText(row.original.contactPerson)}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "contactPerson",
        header: "Contact",
        cell: ({ row }) => (
          <div className="text-gray-700">
            {formatText(row.original.contactPerson) || "-"}
          </div>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <div className="flex items-start gap-2 text-gray-700">
            <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <span className="max-w-[20rem] break-words">
              {formatText(row.original.email) || "-"}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => (
          <div className="flex items-start gap-2 text-gray-700">
            <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <span>{formatText(row.original.phone) || "-"}</span>
          </div>
        ),
      },
      {
        accessorKey: "postcode",
        header: "Postcode",
        cell: ({ row }) => (
          <div className="text-gray-700">
            {formatText(row.original.postcode) || "-"}
          </div>
        ),
      },
      {
        accessorKey: "address",
        header: "Address",
        cell: ({ row }) => (
          <div className="flex items-start gap-2 text-gray-700">
            <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <span className="max-w-[24rem] break-words">
              {formatText(row.original.address) || "-"}
            </span>
          </div>
        ),
      },
    ],
    []
  );

  const postcodeOptions = useMemo(() => {
    const uniquePostcodes = Array.from(
      new Set(
        customers
          .map((customer) => formatText(customer.postcode))
          .filter((postcode): postcode is string => Boolean(postcode))
      )
    );

    if (uniquePostcodes.length === 0 || uniquePostcodes.length > 20) {
      return [];
    }

    return toTableOptions(uniquePostcodes);
  }, [customers]);

  return (
    <ServiceM8DataTable
      data={customers}
      columns={columns}
      searchPlaceholder="Search customer, contact, email, phone, postcode, or address..."
      getSearchText={(customer) =>
        [
          customer.name,
          customer.contactPerson,
          customer.email,
          customer.phone,
          customer.postcode,
          customer.address,
        ]
          .filter(Boolean)
          .join(" ")
      }
      filters={
        postcodeOptions.length > 0
          ? [
              {
                columnId: "postcode",
                label: "Postcode",
                options: postcodeOptions,
              },
            ]
          : []
      }
      groupOptions={[
        { label: "Postcode", value: "postcode" },
        { label: "Email status", value: "emailStatus" },
        { label: "Contact status", value: "contactStatus" },
      ]}
      getGroupValue={(customer, groupBy) => {
        if (groupBy === "postcode") {
          return formatText(customer.postcode) || "Unspecified";
        }

        if (groupBy === "emailStatus") {
          return formatText(customer.email) ? "With email" : "No email";
        }

        if (groupBy === "contactStatus") {
          return formatText(customer.contactPerson) ? "With contact" : "No contact";
        }

        return "Unspecified";
      }}
      emptyMessage="No customers found."
    />
  );
}
