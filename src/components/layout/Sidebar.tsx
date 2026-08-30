import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Package, CalendarClock, BarChart3, Settings, HardDrive, ShoppingCart, Moon, Sun, Landmark,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { useTheme } from "@/components/ThemeProvider";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { LANGUAGES, type Lang } from "@/i18n/translations";

const links = [
  { to: "/", key: "dashboard", icon: LayoutDashboard },
  { to: "/pos", key: "pos", icon: ShoppingCart },
  { to: "/products", key: "products", icon: Package },
  { to: "/inventory", key: "inventory", icon: Package },
  { to: "/expiry", key: "expiry", icon: CalendarClock, badge: true },
  { to: "/reports", key: "reports", icon: BarChart3 },
  { to: "/tax", key: "tax_reports", icon: Landmark },
  { to: "/settings", key: "settings", icon: Settings },
  { to: "/backup", key: "backup", icon: HardDrive },
];

export function Sidebar({ pharmacyName }: { pharmacyName?: string }) {
  const { theme, toggle } = useTheme();
  const { t, expiryBadgeVisible, expiryAlertCount, language, setLanguage } = useApp();

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r bg-card self-start">
      <div className="shrink-0 border-b px-6 py-5">
        <div className="flex items-center gap-3">
          <Logo size={40} />
          <div className="min-w-0">
            <p className="font-semibold text-sm">{t("app_name")}</p>
            <p className="text-xs text-muted-foreground truncate max-w-[140px]">{pharmacyName || "Retail Store"}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto space-y-1 p-4 scrollbar-thin">
        {links.map(({ to, key, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors relative",
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{t(key)}</span>
            {badge && expiryAlertCount > 0 && expiryBadgeVisible && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {expiryAlertCount > 99 ? "99+" : expiryAlertCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="shrink-0 border-t p-4 space-y-3">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Lang)}
          className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
          aria-label={t("language")}
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
        <button type="button" onClick={toggle} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === "dark" ? t("light_mode") : t("dark_mode")}
        </button>
      </div>
    </aside>
  );
}
