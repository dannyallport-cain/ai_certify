import { requireSubscriptionAccess } from '@/lib/payments/subscription';

export default async function CertificatesLayout({
  children
}: {
  children: React.ReactNode;
}) {
  await requireSubscriptionAccess();

  return children;
}
