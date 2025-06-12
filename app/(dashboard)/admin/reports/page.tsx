// filepath: app/(dashboard)/admin/reports/page.tsx
import AdminLayout from '../layout';
import { getAllActivityLogs } from '@/lib/db/queries';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default async function ReportsPage() {
  const logs = await getAllActivityLogs();

  return (
    <AdminLayout>
      <h2 className="text-2xl font-bold mb-4">System Activity Logs</h2>
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
    </AdminLayout>
  );
}
