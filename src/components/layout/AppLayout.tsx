import { Outlet, NavLink, Navigate, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, FolderTree, Tag, Warehouse,
  Truck, Users, Building2, Receipt, BarChart3, FileText, UserCog,
  Bell, Settings, Database, LogOut, Search,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { canAccess } from '@/services/auth.service';
import { getDashboardStats } from '@/services/sale.service';
import { getNotifications } from '@/services/admin.service';
import { useMemo } from 'react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', module: 'dashboard' },
  { to: '/pos', icon: ShoppingCart, label: 'Point of Sale', module: 'pos' },
  { to: '/products', icon: Package, label: 'Products', module: 'products' },
  { to: '/categories', icon: FolderTree, label: 'Categories', module: 'categories' },
  { to: '/brands', icon: Tag, label: 'Brands', module: 'brands' },
  { to: '/inventory', icon: Warehouse, label: 'Inventory', module: 'inventory' },
  { to: '/purchases', icon: Truck, label: 'Purchases', module: 'purchases' },
  { to: '/customers', icon: Users, label: 'Customers', module: 'customers' },
  { to: '/suppliers', icon: Building2, label: 'Suppliers', module: 'suppliers' },
  { to: '/expenses', icon: Receipt, label: 'Expenses', module: 'expenses' },
  { to: '/finance', icon: BarChart3, label: 'Finance', module: 'finance' },
  { to: '/reports', icon: FileText, label: 'Reports', module: 'reports' },
  { to: '/employees', icon: UserCog, label: 'Employees', module: 'employees' },
  { to: '/notifications', icon: Bell, label: 'Notifications', module: 'notifications' },
  { to: '/settings', icon: Settings, label: 'Settings', module: 'settings' },
  { to: '/backup', icon: Database, label: 'Backup', module: 'settings' },
];

export function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  if (!user) return <Navigate to="/login" replace />;

  const stats = useMemo(() => getDashboardStats(), []);
  const notifications = useMemo(() => getNotifications().filter((n) => !n.is_read), []);
  const filteredNav = navItems.filter((item) => canAccess(user.role, item.module));

  return (
    <div className="flex h-screen bg-slate-950 text-white">
      <aside className="flex w-56 flex-col border-r border-slate-800 bg-brand-900">
        <div className="border-b border-slate-700 px-4 py-5">
          <h1 className="text-lg font-bold text-brand-500">UBUMWE RMS</h1>
          <p className="text-xs text-slate-400">Retail Management</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {filteredNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'mx-2 mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive ? 'bg-brand-500/20 text-brand-500' : 'text-slate-300 hover:bg-slate-800'
                )
              }
            >
              <Icon size={18} />
              {label}
              {label === 'Notifications' && notifications.length > 0 && (
                <span className="ml-auto rounded-full bg-red-500 px-1.5 text-xs">{notifications.length}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-700 p-3">
          <p className="truncate text-sm font-medium">{user.full_name}</p>
          <p className="text-xs capitalize text-slate-400">{user.role}</p>
          <button onClick={() => { logout(); navigate('/login'); }} className="mt-2 flex items-center gap-2 text-xs text-slate-400 hover:text-red-400">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-3">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Search size={16} />
            <span>Today: {formatCurrency(stats.todaySales)} · {stats.todayTransactions} transactions</span>
          </div>
          <div className="text-sm text-slate-400">v1.0.0</div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
