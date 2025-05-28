// filepath: app/(dashboard)/admin/subscriptions/page.tsx
import AdminLayout from '../layout';
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  active: boolean;
  featureLimits: Record<string, number>;
}

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    // TODO: fetch plans via API
    setPlans([
      { id: 'plan_basic', name: 'Basic', price: 1000, currency: 'usd', active: true, featureLimits: { certificates: 50 } },
      { id: 'plan_pro', name: 'Pro', price: 5000, currency: 'usd', active: true, featureLimits: { certificates: 500 } },
    ]);
  }, []);

  const toggleActive = (id: string) => {
    // TODO: call API
    setPlans(plans.map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  return (
    <AdminLayout>
      <h2 className="text-xl font-semibold mb-4">Subscription Plans</h2>
      <div className="space-y-4">
        {plans.map(plan => (
          <Card key={plan.id} className="flex justify-between items-center">
            <CardHeader>
              <CardTitle>{plan.name} ({plan.currency.toUpperCase()} {plan.price / 100})</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center space-x-4">
              <div>
                <strong>Certificates limit:</strong> {plan.featureLimits.certificates}
              </div>
              <Button onClick={() => toggleActive(plan.id)} variant={plan.active ? 'outline' : 'secondary'}>
                {plan.active ? 'Deactivate' : 'Activate'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
}
