"use client";

import { useToastNotifyStore, useToastNotify, type ToastNotifyItem } from "@/hooks/use-toast-notify";
import { Check, AlertCircle, Info, X } from "lucide-react";

const VARIANT_STYLES: Record<
  ToastNotifyItem["variant"],
  { accentBorder: string; accentBg: string; iconColor: string }
> = {
  default: {
    accentBorder: "border-l-[3px] border-l-primary",
    accentBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  success: {
    accentBorder: "border-l-[3px] border-l-emerald-500",
    accentBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
  },
  error: {
    accentBorder: "border-l-[3px] border-l-red-500",
    accentBg: "bg-red-500/10",
    iconColor: "text-red-500",
  },
};

const VARIANT_ICONS: Record<ToastNotifyItem["variant"], React.ReactNode> = {
  default: <Info className="h-4 w-4" />,
  success: <Check className="h-4 w-4" />,
  error: <AlertCircle className="h-4 w-4" />,
};

export function ToastContainer() {
  const toasts = useToastNotifyStore((s) => s.toasts);
  const { dismiss } = useToastNotify();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 max-w-[320px]">
      {toasts.map((toast) => {
        const styles = VARIANT_STYLES[toast.variant];
        const icon = VARIANT_ICONS[toast.variant];
        const animClass = toast.exiting ? "toast-slide-out" : "toast-slide-in";

        return (
          <div
            key={toast.id}
            className={`glass-panel ${styles.accentBorder} ${animClass} flex items-start gap-3 p-3`}
          >
            {/* Icon */}
            <div
              className={`flex items-center justify-center rounded-md ${styles.accentBg} ${styles.iconColor} p-1 shrink-0`}
            >
              {icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-snug">{toast.title}</p>
              {toast.description && (
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                  {toast.description}
                </p>
              )}
            </div>

            {/* Close button */}
            <button
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              onClick={() => dismiss(toast.id)}
              aria-label="Fechar notificação"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
