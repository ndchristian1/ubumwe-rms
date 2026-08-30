import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { type Lang, t as translate } from "@/i18n/translations";
import { api, type AppSettings, type Pharmacy } from "@/lib/api";

interface AppContextValue {
  pharmacy: Pharmacy | null;
  settings: AppSettings | null;
  language: Lang;
  expiryAlertCount: number;
  expiryBadgeVisible: boolean;
  refreshPharmacy: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  refreshAlerts: () => Promise<void>;
  markExpirySeen: () => Promise<void>;
  setLanguage: (lang: Lang) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
  children,
  initialPharmacy,
}: {
  children: ReactNode;
  initialPharmacy: Pharmacy | null;
}) {
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(initialPharmacy);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [language, setLanguageState] = useState<Lang>(
    () => (localStorage.getItem("ubumwe-lang") as Lang) || "en"
  );
  const [expiryAlertCount, setExpiryAlertCount] = useState(0);
  const [expiryBadgeVisible, setExpiryBadgeVisible] = useState(false);

  useEffect(() => {
    if (initialPharmacy) setPharmacy(initialPharmacy);
  }, [initialPharmacy]);

  const refreshPharmacy = useCallback(async () => {
    const p = await api.getPharmacy();
    setPharmacy(p);
  }, []);

  const refreshSettings = useCallback(async () => {
    const s = await api.getSettings();
    setSettings(s);
    if (s.language && s.language !== language) {
      setLanguageState(s.language as Lang);
      localStorage.setItem("ubumwe-lang", s.language);
    }
  }, [language]);

const EXPIRY_DISMISSED_KEY = "expiry-alerts-dismissed-at-count";

  const refreshAlerts = useCallback(async () => {
    try {
      sessionStorage.removeItem("expiry-alerts-seen");
      sessionStorage.removeItem("expiry-alerts-seen-count");
      const stats = await api.getDashboardStats();
      const count = stats.expired_count + stats.expiring_soon_count;
      setExpiryAlertCount(count);
      const dismissedAt = Number(sessionStorage.getItem(EXPIRY_DISMISSED_KEY) ?? "-1");
      if (count === 0) {
        sessionStorage.setItem(EXPIRY_DISMISSED_KEY, "0");
        setExpiryBadgeVisible(false);
      } else {
        // Show badge whenever the live count differs from what the user last dismissed.
        setExpiryBadgeVisible(count !== dismissedAt);
      }
    } catch {
      setExpiryAlertCount(0);
      setExpiryBadgeVisible(false);
    }
  }, []);

  const markExpirySeen = useCallback(async () => {
    try {
      const stats = await api.getDashboardStats();
      const count = stats.expired_count + stats.expiring_soon_count;
      sessionStorage.setItem(EXPIRY_DISMISSED_KEY, String(count));
      setExpiryAlertCount(count);
      setExpiryBadgeVisible(false);
    } catch {
      setExpiryBadgeVisible(false);
    }
  }, []);

  const setLanguage = useCallback(async (lang: Lang) => {
    setLanguageState(lang);
    localStorage.setItem("ubumwe-lang", lang);
    await api.updateLanguage(lang);
    await refreshSettings();
  }, [refreshSettings]);

  useEffect(() => {
    refreshSettings().catch(() => {});
    refreshAlerts().catch(() => {});
    const intervalId = window.setInterval(() => refreshAlerts().catch(() => {}), 30000);
    const onFocus = () => refreshAlerts().catch(() => {});
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshSettings, refreshAlerts]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(language, key, params),
    [language],
  );

  return (
    <AppContext.Provider
      value={{
        pharmacy,
        settings,
        language,
        expiryAlertCount,
        expiryBadgeVisible,
        refreshPharmacy,
        refreshSettings,
        refreshAlerts,
        markExpirySeen,
        setLanguage,
        t,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
