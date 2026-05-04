import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCustomersForTeam } from '@/lib/db/queries';
import { Plus, User, Phone, Mail, MapPin } from 'lucide-react';
import Link from 'next/link';

type CustomerRecord = Awaited<ReturnType<typeof getCustomersForTeam>>[number];

function normalizeLegacyText(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const lower = trimmed.toLowerCase();
  if (['undefined', 'null', 'nan'].includes(lower)) {
    return null;
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (
    tokens.length > 0 &&
    tokens.every((token) => ['undefined', 'null', 'nan'].includes(token.toLowerCase()))
  ) {
    return null;
  }

  return trimmed;
}

function getCustomerDisplayName(customer: CustomerRecord) {
  return (
    normalizeLegacyText(customer.name) ||
    normalizeLegacyText(customer.contactPerson) ||
    'Unnamed Customer'
  );
}

function getCustomerContactPerson(customer: CustomerRecord) {
  return normalizeLegacyText(customer.contactPerson);
}

function getCustomerEmail(customer: CustomerRecord) {
  return normalizeLegacyText(customer.email);
}

function getCustomerPhone(customer: CustomerRecord) {
  return normalizeLegacyText(customer.phone);
}

function getCustomerAddress(customer: CustomerRecord) {
  return normalizeLegacyText(customer.address);
}

export default async function CustomersPage() {
  const customers = await getCustomersForTeam();

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
          <p className="text-muted-foreground">
            Manage your customer database for certifications
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button asChild>
            <Link href="/customers/new">
              <Plus className="mr-2 h-4 w-4" />
              New Customer
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed border-2 border-muted-foreground/25">
          <Link href="/customers/new">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Add New Customer</CardTitle>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+</div>
              <p className="text-xs text-muted-foreground">
                Add a new customer to your database
              </p>
            </CardContent>
          </Link>
        </Card>

        {customers.map((customer) => {
          const displayName = getCustomerDisplayName(customer);
          const contactPerson = getCustomerContactPerson(customer);
          const email = getCustomerEmail(customer);
          const phone = getCustomerPhone(customer);
          const address = getCustomerAddress(customer);

          return (
            <Card
              key={customer.id}
              className="bg-card-mid hover:shadow-md transition-shadow cursor-pointer"
            >
              <Link href={`/customers/${customer.id}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    <span className="mr-2">🏢</span>
                    {displayName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    {contactPerson ? (
                      <div className="flex items-center">
                        <User className="mr-1 h-3 w-3" />
                        {contactPerson}
                      </div>
                    ) : null}
                    {email ? (
                      <div className="flex items-center">
                        <Mail className="mr-1 h-3 w-3" />
                        {email}
                      </div>
                    ) : null}
                    {phone ? (
                      <div className="flex items-center">
                        <Phone className="mr-1 h-3 w-3" />
                        {phone}
                      </div>
                    ) : null}
                    {address ? (
                      <div className="flex items-center">
                        <MapPin className="mr-1 h-3 w-3" />
                        <span className="truncate">{address}</span>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Link>
            </Card>
          );
        })}
      </div>

      {customers.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              No Customers Yet
            </CardTitle>
            <CardDescription>
              Get started by adding your first customer to the database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/customers/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Customer
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
