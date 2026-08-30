import { cn } from '@/lib/utils';

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('rounded-xl border border-slate-700 bg-slate-900', className)}>{children}</div>;
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
      <div>
        <h3 className="font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('p-5', className)}>{children}</div>;
}

export function StatCard({ label, value, change, tone = 'default' }: { label: string; value: string; change?: string; tone?: 'default' | 'success' | 'warning' | 'danger' }) {
  const tones = { default: 'text-white', success: 'text-brand-500', warning: 'text-amber-400', danger: 'text-red-400' };
  return (
    <Card>
      <CardBody>
        <p className="text-sm text-slate-400">{label}</p>
        <p className={cn('mt-1 text-2xl font-bold', tones[tone])}>{value}</p>
        {change && <p className="mt-1 text-xs text-slate-500">{change}</p>}
      </CardBody>
    </Card>
  );
}
