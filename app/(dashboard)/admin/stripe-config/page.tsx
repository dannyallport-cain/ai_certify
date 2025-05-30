'use client';
// filepath: app/(dashboard)/admin/stripe-config/page.tsx
import AdminLayout from '../layout';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function StripeConfigPage() {
  const [secretKey, setSecretKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');

  useEffect(() => {
    // TODO: fetch existing Stripe keys from API
  }, []);

  const handleSave = async () => {
    // TODO: call API to save Stripe configuration
    alert('Stripe configuration saved');
  };

  return (
    <AdminLayout>
      <Card>
        <CardHeader>
          <CardTitle>Stripe Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">Secret Key</label>
            <Input
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="sk_live_..."
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Webhook Secret</label>
            <Input
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="whsec_..."
            />
          </div>
          <Button onClick={handleSave}>Save Configuration</Button>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
