import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initDatabase } from '@/db/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { PosPage } from '@/pages/PosPage';
import { ProductsPage } from '@/pages/ProductsPage';
import { CategoriesPage, BrandsPage } from '@/pages/CatalogPages';
import { InventoryPage, PurchasesPage } from '@/pages/InventoryPages';
import { CustomersPage, SuppliersPage } from '@/pages/PeoplePages';
import { ExpensesPage, FinancePage, ReportsPage } from '@/pages/FinancePages';
import { EmployeesPage, NotificationsPage, SettingsPage, BackupPage } from '@/pages/AdminPages';

const queryClient = new QueryClient();

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    initDatabase()
      .then(() => setReady(true))
      .catch((e) => setError(String(e)));
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mb-4 text-2xl font-bold text-brand-500">UBUMWE RMS</div>
          <p className="text-slate-400">{error || 'Initializing database...'}</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/pos" element={<PosPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/brands" element={<BrandsPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/purchases" element={<PurchasesPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/finance" element={<FinancePage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/backup" element={<BackupPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
