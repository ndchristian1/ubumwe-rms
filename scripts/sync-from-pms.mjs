/**
 * One-time sync: copies remaining files from ubumwe-pms → ubumwe-rms.
 * Run from repo root: node scripts/sync-from-pms.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(__dirname, "../../ubumwe-pms");
const dst = path.resolve(__dirname, "..");

const skipDirs = new Set(["node_modules", "dist", "target", ".git"]);
const skipFiles = new Set(["build_errors.txt"]);
const already = new Set([
  "package.json", "index.html", "README.md",
  "src/App.tsx", "src/components/Logo.tsx", "src/components/ErrorBoundary.tsx",
  "src/components/layout/Sidebar.tsx", "src/pages/Dashboard.tsx",
  "src/lib/errors.ts", "src/lib/downloads.ts",
  "src-tauri/Cargo.toml", "src-tauri/tauri.conf.json", "src-tauri/src/main.rs",
  "src-tauri/src/commands/pharmacy.rs",
  "vite.config.ts", "tsconfig.json", "tsconfig.node.json", "tailwind.config.js", "postcss.config.js",
  "src/main.tsx", "src/index.css", "src/pages/Setup.tsx", "src/lib/api.ts", "src/lib/utils.ts",
  "src/context/AppContext.tsx", "src/hooks/use-toast.ts", "src/db/schema.ts",
  "src/components/LoginGate.tsx", "src/components/ThemeProvider.tsx", "src/components/ToastProvider.tsx",
  "src/components/layout/AppLayout.tsx", "src/components/ui/button.tsx", "src/components/ui/input.tsx",
  "src/components/ui/card.tsx", "src/components/ui/dialog.tsx", "src/components/ui/table.tsx",
  "src/components/ui/toaster.tsx", "src/components/ui/number-input.tsx",
  "src/pages/Reports.tsx", "src/pages/TaxReports.tsx", "src/pages/Inventory.tsx",
  "src-tauri/build.rs", ".gitignore", "scripts/sync-from-pms.mjs",
]);

function patchTranslationsEn(content) {
  const reps = [
    [/app_name: "Ubumwe PMS"/, 'app_name: "Ubumwe RMS"'],
    [/loading: "Loading Ubumwe PMS\.\.\."/, 'loading: "Loading Ubumwe RMS..."'],
    [/medicines: "Medicines"/, 'medicines: "Products",\n  products: "Products"'],
    [/login_subtitle: "Enter your PIN to open Ubumwe PMS"/, 'login_subtitle: "Enter your PIN to open Ubumwe RMS"'],
    [/total_medicines: "Total Medicines"/, 'total_medicines: "Total Products"'],
    [/dashboard_subtitle: "Overview of your pharmacy"/, 'dashboard_subtitle: "Overview of your retail store"'],
    [/add_first_medicine: "Add your first medicine to get started\."/, 'add_first_medicine: "Add your first product to get started."'],
    [/pharmacy_profile: "Pharmacy Profile"/, 'pharmacy_profile: "Store Profile"'],
    [/pharmacy_name: "Pharmacy Name"/, 'pharmacy_name: "Store Name"'],
    [/settings_subtitle: "Manage your pharmacy profile and preferences"/, 'settings_subtitle: "Manage your store profile and preferences"'],
    [/pharmacy_updated: "Pharmacy details updated\."/, 'pharmacy_updated: "Store details updated."'],
    [/add_medicine: "Add Medicine"/, 'add_medicine: "Add Product"'],
    [/edit_medicine: "Edit Medicine"/, 'edit_medicine: "Edit Product"'],
    [/medicines_subtitle: "Manage medicines and stock batches"/, 'medicines_subtitle: "Manage products and stock batches"'],
    [/search_medicines: "Search medicines\.\.\."/, 'search_medicines: "Search products..."'],
    [/medicine_name: "Medicine Name"/, 'medicine_name: "Product Name"'],
    [/save_medicine: "Save Medicine"/, 'save_medicine: "Save Product"'],
    [/no_medicines: "No medicines found"/, 'no_medicines: "No products found"'],
    [/medicine: "Medicine"/, 'medicine: "Product"'],
    [/sort_by_name: "Medicine name"/, 'sort_by_name: "Product name"'],
    [/backup_subtitle: "Keep a safe copy of your pharmacy data"/, 'backup_subtitle: "Keep a safe copy of your store data"'],
    [/setup_welcome: "Welcome to Ubumwe PMS"/, 'setup_welcome: "Welcome to Ubumwe RMS"'],
    [/setup_pharmacy_desc: "Set up your pharmacy details"/, 'setup_pharmacy_desc: "Set up your store details"'],
    [/setup_ready: "Your pharmacy is ready to use\."/, 'setup_ready: "Your store is ready to use."'],
    [/find_medicine: "Find Medicine"/, 'find_medicine: "Find Product"'],
    [/no_medicines_sale: "No medicines available for sale\."/, 'no_medicines_sale: "No products available for sale."'],
    [/tap_to_add_cart: "Tap a medicine to add it here\."/, 'tap_to_add_cart: "Tap a product to add it here."'],
    [/cart_empty_desc: "Add medicines before completing a sale\."/, 'cart_empty_desc: "Add products before completing a sale."'],
    [/low_stock_filter: "Showing low stock medicines only"/, 'low_stock_filter: "Showing low stock products only"'],
    [/expiry_subtitle: "Monitor medicines nearing or past expiry \(optional per medicine\)"/, 'expiry_subtitle: "Monitor products nearing or past expiry (optional per product)"'],
    [/medicine_saved: "Medicine saved"/, 'medicine_saved: "Product saved"'],
    [/could_not_save_medicine: "Could not save medicine"/, 'could_not_save_medicine: "Could not save product"'],
    [/medicine_hidden: "Medicine hidden"/, 'medicine_hidden: "Product hidden"'],
    [/medicine_updated: "Medicine updated"/, 'medicine_updated: "Product updated"'],
    [/medicine_deleted: "Medicine deleted"/, 'medicine_deleted: "Product deleted"'],
  ];
  let out = content;
  for (const [from, to] of reps) out = out.replace(from, to);
  return out;
}

function walk(dir, base = dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (skipDirs.has(name)) continue;
    const full = path.join(dir, name);
    const rel = path.relative(base, full).replace(/\\/g, "/");
    const st = fs.statSync(full);
    if (st.isDirectory()) out.push(...walk(full, base));
    else if (!skipFiles.has(name) && !already.has(rel)) out.push(rel);
  }
  return out;
}

let count = 0;
for (const rel of walk(src)) {
  const from = path.join(src, rel);
  const to = path.join(dst, rel);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  let content = fs.readFileSync(from, "utf8");
  if (rel === "src/pages/Reports.tsx" || rel === "src/pages/TaxReports.tsx") {
    content = content.replaceAll("Ubumwe PMS", "Ubumwe RMS");
  }
  if (rel === "package-lock.json") {
    content = content.replaceAll("ubumwe-pms", "ubumwe-rms");
  }
  if (rel === "src-tauri/capabilities/default.json" || rel === "src-tauri/gen/schemas/capabilities.json") {
    content = content.replaceAll("Ubumwe PMS", "Ubumwe RMS");
  }
  if (rel === "src/i18n/translations.ts") {
    content = patchTranslationsEn(content);
  }
  fs.writeFileSync(to, content, "utf8");
  count++;
}
console.log(`Synced ${count} files from pms to rms`);
