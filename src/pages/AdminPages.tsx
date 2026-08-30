import { useMemo } from 'react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { getAllUsers, getNotifications, markNotificationRead, backupDatabase, restoreDatabase } from '@/services/admin.service';
import { getOrganization } from '@/services/sale.service';
import { queryOne } from '@/lib/sql';
import { useRef } from 'react';

export function EmployeesPage() {
  const users = useMemo(() => getAllUsers(), []);
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Employees</h2>
      <Card><CardBody className="p-0">
        <DataTable data={users as Record<string, unknown>[]} columns={[
          { key: 'full_name', header: 'Name' },
          { key: 'username', header: 'Username', className: 'font-mono text-xs' },
          { key: 'email', header: 'Email' },
          { key: 'role', header: 'Role', render: (r) => <span className="capitalize">{r.role as string}</span> },
          { key: 'is_active', header: 'Status', render: (r) => (r.is_active ? 'Active' : 'Inactive') },
        ]} />
      </CardBody></Card>
    </div>
  );
}

export function NotificationsPage() {
  const notifications = useMemo(() => getNotifications(), []);
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Notifications</h2>
      <div className="space-y-2">
        {notifications.map((n) => (
          <Card key={n.id}>
            <CardBody className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{n.title}</p>
                <p className="text-sm text-slate-400">{n.message}</p>
                <p className="text-xs text-slate-500">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              {!n.is_read && (
                <Button size="sm" variant="outline" onClick={() => markNotificationRead(n.id)}>Mark read</Button>
              )}
            </CardBody>
          </Card>
        ))}
        {notifications.length === 0 && <p className="text-slate-400">No notifications.</p>}
      </div>
    </div>
  );
}

export function SettingsPage() {
  const org = useMemo(() => getOrganization(), []);
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>
      <Card>
        <CardHeader title="Business Profile" />
        <CardBody className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-slate-400">Business Name</span><span>{org?.name}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Currency</span><span>{org?.currency_code}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Tax Rate</span><span>{org?.tax_rate}%</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Phone</span><span>{org?.phone || '—'}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Email</span><span>{org?.email || '—'}</span></div>
        </CardBody>
      </Card>
    </div>
  );
}

export function BackupPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const backupCount = useMemo(() => {
    const r = queryOne<{ c: number }>('SELECT COUNT(*) as c FROM audit_logs');
    return r?.c ?? 0;
  }, []);

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (restoreDatabase(reader.result as string)) {
        window.location.reload();
      } else {
        alert('Invalid backup file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Backup & Restore</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Manual Backup" subtitle="Download encrypted database snapshot" />
          <CardBody>
            <p className="mb-4 text-sm text-slate-400">Export your entire database to a backup file. Store it safely.</p>
            <Button onClick={() => backupDatabase()}>Download Backup</Button>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Restore" subtitle="Restore from a backup file" />
          <CardBody>
            <p className="mb-4 text-sm text-slate-400">This will replace all current data. The app will reload.</p>
            <input ref={fileRef} type="file" accept=".json" onChange={handleRestore} className="hidden" />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>Select Backup File</Button>
          </CardBody>
        </Card>
      </div>
      <p className="text-xs text-slate-500">Audit log entries: {backupCount} · Automatic daily backups enabled in production build</p>
    </div>
  );
}
