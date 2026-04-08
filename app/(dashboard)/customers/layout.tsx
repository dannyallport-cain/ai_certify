import { requireSubscriptionAccess } from '@/lib/payments/subscription';

export default async function CustomersLayout({
  children
}: {
  children: React.ReactNode;
}) {
  await requireSubscriptionAccess();

  return children;
}
