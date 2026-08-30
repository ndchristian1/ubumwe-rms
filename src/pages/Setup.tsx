import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, Input, Select } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/context/AppContext";
import { setSessionUnlocked } from "@/components/LoginGate";
import { api } from "@/lib/api";
import { friendlyError } from "@/lib/errors";
import { CURRENCIES } from "@/lib/utils";

interface SetupProps {
  onComplete: () => void;
}

export function SetupPage({ onComplete }: SetupProps) {
  const { toast } = useToast();
  const { t, refreshPharmacy, refreshSettings, refreshAlerts } = useApp();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [location, setLocation] = useState("");
  const [currency, setCurrency] = useState("RWF");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePharmacySubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.completeSetup({ name, owner_name: ownerName, location: location || undefined, currency });
      setStep(2);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length < 4) {
      setError(t("pin_min_digits"));
      return;
    }
    if (pin !== confirmPin) {
      setError(t("pins_dont_match"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.setPin(pin);
      await refreshPharmacy();
      await refreshSettings();
      await refreshAlerts();
      setSessionUnlocked();
      toast({ type: "success", title: t("setup_complete"), description: t("setup_ready") });
      onComplete();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <Logo size={64} className="mx-auto mb-4" />
          <CardTitle className="text-2xl">{step === 1 ? t("setup_welcome") : t("setup_pin_title")}</CardTitle>
          <CardDescription>
            {step === 1 ? t("setup_pharmacy_desc") : t("setup_pin_desc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <form onSubmit={handlePharmacySubmit} className="space-y-4">
              <FormField label={`${t("pharmacy_name")} *`}><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ubumwe Retail Store" /></FormField>
              <FormField label={`${t("owner_name")} *`}><Input required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} /></FormField>
              <FormField label={t("location")}><Input value={location} onChange={(e) => setLocation(e.target.value)} /></FormField>
              <FormField label={`${t("currency")} *`}>
                <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </FormField>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="pt-2"><Button type="submit" className="w-full" disabled={loading}>{loading ? t("saving") : t("continue")}</Button></div>
            </form>
          ) : (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <FormField label={`${t("new_pin")} *`}><Input type="password" inputMode="numeric" required value={pin} onChange={(e) => setPin(e.target.value)} autoFocus /></FormField>
              <FormField label={`${t("confirm_pin")} *`}><Input type="password" inputMode="numeric" required value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} /></FormField>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="pt-2"><Button type="submit" className="w-full" disabled={loading}>{loading ? t("finishing") : t("finish_setup")}</Button></div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
