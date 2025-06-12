import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { requireAdmin } from '@/lib/auth/admin';
import { STRIPE_PRODUCTS, STRIPE_FEATURES, stripe } from '@/lib/stripe/config';
import { Edit, Plus, Save, Trash2, DollarSign, Users, Settings } from 'lucide-react';

async function StripeAdminContent() {
  await requireAdmin();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Stripe Configuration</h1>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          New Product
        </Button>
      </div>

      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">Products & Pricing</TabsTrigger>
          <TabsTrigger value="features">Feature Management</TabsTrigger>
          <TabsTrigger value="customers">Customer Subscriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          {Object.entries(STRIPE_PRODUCTS).map(([key, product]) => (
            <Card key={key}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{product.name}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label>Description</Label>
                      <p className="text-gray-600">{product.description}</p>
                    </div>
                    <div>
                      <Label>Monthly Price</Label>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <Input
                          type="number"
                          value={product.prices.monthly.amount / 100}
                          onChange={() => {}}
                          className="w-32"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Yearly Price</Label>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <Input
                          type="number"
                          value={product.prices.yearly.amount / 100}
                          onChange={() => {}}
                          className="w-32"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label>Features</Label>
                    <ul className="mt-2 space-y-2">
                      {product.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-gray-600">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(STRIPE_FEATURES).map(([key, feature]) => (
                  <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">{key.replace(/_/g, ' ')}</h3>
                      <p className="text-sm text-gray-600">
                        {typeof feature.STARTER === 'number' 
                          ? 'Certificate Limit' 
                          : typeof feature.STARTER === 'boolean'
                            ? 'Feature Toggle'
                            : 'Feature Level'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      {typeof feature.STARTER === 'number' ? (
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            value={feature.STARTER}
                            onChange={() => {}}
                            className="w-24"
                          />
                          <Input
                            type="number"
                            value={feature.PROFESSIONAL}
                            onChange={() => {}}
                            className="w-24"
                          />
                          <Input
                            type="number"
                            value={feature.ENTERPRISE}
                            onChange={() => {}}
                            className="w-24"
                          />
                        </div>
                      ) : typeof feature.STARTER === 'boolean' ? (
                        <div className="flex items-center space-x-4">
                          <Switch checked={feature.STARTER} />
                          <Switch checked={feature.PROFESSIONAL} />
                          <Switch checked={feature.ENTERPRISE} />
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <select
                            value={feature.STARTER}
                            onChange={() => {}}
                            className="w-32 rounded-md border-gray-300"
                            aria-label="Starter plan feature level"
                          >
                            <option value="basic">Basic</option>
                            <option value="custom">Custom</option>
                            <option value="advanced">Advanced</option>
                          </select>
                          <select
                            value={feature.PROFESSIONAL}
                            onChange={() => {}}
                            className="w-32 rounded-md border-gray-300"
                            aria-label="Professional plan feature level"
                          >
                            <option value="basic">Basic</option>
                            <option value="custom">Custom</option>
                            <option value="advanced">Advanced</option>
                          </select>
                          <select
                            value={feature.ENTERPRISE}
                            onChange={() => {}}
                            className="w-32 rounded-md border-gray-300"
                            aria-label="Enterprise plan feature level"
                          >
                            <option value="basic">Basic</option>
                            <option value="custom">Custom</option>
                            <option value="advanced">Advanced</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Input
                      type="search"
                      placeholder="Search customers..."
                      className="w-64"
                    />
                    <select 
                      className="rounded-md border-gray-300"
                      aria-label="Filter by subscription plan"
                    >
                      <option value="all">All Plans</option>
                      <option value="starter">Starter</option>
                      <option value="professional">Professional</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>

                <div className="border rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Plan
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Next Billing
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {/* Sample customer data - replace with actual data */}
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gray-200" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                John Doe
                              </div>
                              <div className="text-sm text-gray-500">
                                john@example.com
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Professional
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          Jan 1, 2024
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button variant="outline" size="sm">
                            Manage
                          </Button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function StripeAdminPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StripeAdminContent />
    </Suspense>
  );
} 