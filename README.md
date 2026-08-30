# UBUMWE RMS

Production-ready Retail Management System for supermarkets, grocery stores, hardware shops, and general retail.

## Quick Start

```bash
cd C:\Users\HP\Projects\ubumwe-rms
npm install
npm run dev
```

Open http://localhost:5173

## Login

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Manager | manager | manager123 |
| Cashier | cashier | cashier123 |

## Modules

- Dashboard — live analytics
- Point of Sale — barcode scan, payments, receipts
- Products — full inventory CRUD
- Categories & Brands
- Inventory — stock levels, movements
- Purchases, Customers, Suppliers
- Expenses, Finance, Reports
- Employees, Notifications, Settings
- Backup & Restore

## Stack

- React 18 + TypeScript + Vite
- SQLite (sql.js, offline-first, persisted to localStorage)
- Tailwind CSS + Zustand + TanStack Query
- Ready for Tauri 2 desktop wrapper

## Data

All data persists in browser localStorage. Use Backup & Restore to export/import.
