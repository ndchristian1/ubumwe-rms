import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { useToast, type ToastType } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const icons: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const styles: Record<ToastType, string> = {
  success: "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100",
  error: "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
  info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100",
};

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => {
        const Icon = icons[t.type];
        return (
          <div
            key={t.id}
            className={cn("flex items-start gap-3 rounded-lg border p-4 shadow-lg animate-in slide-in-from-right", styles[t.type])}
            role="alert"
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{t.title}</p>
              {t.description && <p className="text-sm opacity-90 mt-0.5">{t.description}</p>}
            </div>
            <button type="button" onClick={() => dismiss(t.id)} className="opacity-60 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
