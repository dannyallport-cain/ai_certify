// filepath: app/(dashboard)/admin/reports/page.tsx
import { getAllActivityLogs } from '@/lib/db/queries';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function ReportsPage() {
  const logs = await getAllActivityLogs();

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">System Activity Logs</h2>
        <Link href="/admin/reports/disseminator">
          <Button variant="outline">Open Report Disseminator</Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Activity Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border p-2">Timestamp</th>
                  <th className="border p-2">Team</th>
                  <th className="border p-2">User</th>
                  <th className="border p-2">Action</th>
                  <th className="border p-2">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td className="border p-2">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="border p-2">{log.teamName}</td>
                    <td className="border p-2">{log.userName || 'System'}</td>
                    <td className="border p-2 capitalize">{log.action.toLowerCase().replace(/_/g, ' ')}</td>
                    <td className="border p-2">{log.ipAddress || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
