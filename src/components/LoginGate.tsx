import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField, Input } from "@/components/ui/input";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { friendlyError } from "@/lib/errors";

const SESSION_KEY = "ubumwe-unlocked";

export function isSessionUnlocked() {
  return sessionStorage.getItem(SESSION_KEY) === "true";
}

export function setSessionUnlocked() {
  sessionStorage.setItem(SESSION_KEY, "true");
}

export function LoginGate({ children }: { children: React.ReactNode }) {
  const { t, settings } = useApp();
  const needsPin = settings?.has_pin ?? false;
  const [unlocked, setUnlocked] = useState(isSessionUnlocked);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!needsPin || unlocked) return <>{children}</>;

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length < 4) {
      setError(t("enter_pin"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const ok = await api.verifyPin(pin);
      if (!ok) {
        setError(t("wrong_pin"));
        return;
      }
      setSessionUnlocked();
      setUnlocked(true);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Dialog open>
        <DialogContent className="max-w-sm gap-6" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader className="text-center sm:text-center">
            <Logo size={56} className="mx-auto mb-2" />
            <DialogTitle>{t("login_title")}</DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">{t("login_subtitle")}</p>
          </DialogHeader>
          <form onSubmit={handleUnlock} className="space-y-4">
            <FormField label="PIN" error={error}>
              <Input
                type="password"
                inputMode="numeric"
                autoFocus
                value={pin}
                onChange={(e) => { setPin(e.target.value); setError(""); }}
                placeholder="••••"
              />
            </FormField>
            <div className="pt-2">
              <Button type="submit" className="w-full" disabled={loading || pin.length < 4}>
                {loading ? t("checking") : t("unlock")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
