import Link from "next/link";
import { ArrowRight, Plus, Users } from "lucide-react";

import { CustomersTable, type CustomerTableRow } from "@/components/customers/customers-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCustomersForTeam } from "@/lib/db/queries";

type CustomerRecord = Awaited<ReturnType<typeof getCustomersForTeam>>[number];

function normalizeLegacyText(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const lower = trimmed.toLowerCase();
  if (["undefined", "null", "nan"].includes(lower)) {
    return null;
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (
    tokens.length > 0 &&
    tokens.every((token) => ["undefined", "null", "nan"].includes(token.toLowerCase()))
  ) {
    return null;
  }

  return trimmed;
}

function mapCustomer(customer: CustomerRecord): CustomerTableRow {
  return {
    id: customer.id,
    name: normalizeLegacyText(customer.name) || "Unnamed Customer",
    contactPerson: normalizeLegacyText(customer.contactPerson),
    email: normalizeLegacyText(customer.email),
    phone: normalizeLegacyText(customer.phone),
    address: normalizeLegacyText(customer.address),
    postcode: normalizeLegacyText(customer.postcode),
  };
}

export default async function CustomersPage() {
  const customers = (await getCustomersForTeam()).map(mapCustomer);

  const customersWithEmail = customers.filter((customer) => Boolean(customer.email)).length;
  const customersWithPhone = customers.filter((customer) => Boolean(customer.phone)).length;

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
          <p className="max-w-2xl text-muted-foreground">
            Search, filter, and manage your customer records in a ServiceM8-style table view.
          </p>
        </div>

        <Button asChild className="w-full md:w-auto">
          <Link href="/customers/new">
            <Plus className="mr-2 h-4 w-4" />
            New Customer
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
            <p className="text-xs text-muted-foreground">Stored in your team database</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With email</CardTitle>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customersWithEmail}</div>
            <p className="text-xs text-muted-foreground">Ready for reminders and follow-up</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With phone</CardTitle>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customersWithPhone}</div>
            <p className="text-xs text-muted-foreground">Useful for on-site contact</p>
          </CardContent>
        </Card>
      </div>

      {customers.length > 0 ? (
        <CustomersTable customers={customers} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No customers yet</CardTitle>
            <CardDescription>
              Add your first customer to start creating certificates and syncing data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/customers/new">
                <Plus className="mr-2 h-4 w-4" />
                Add your first customer
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
