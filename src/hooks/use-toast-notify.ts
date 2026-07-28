"use client";

import { create } from "zustand";
import { useCallback, useMemo } from "react";

export type ToastVariant = "default" | "success" | "error";

export interface ToastNotifyItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  createdAt: number;
  exiting?: boolean;
}

interface ToastNotifyState {
  toasts: ToastNotifyItem[];
  addToast: (item: Omit<ToastNotifyItem, "id" | "createdAt" | "exiting">) => string;
  removeToast: (id: string) => void;
  markExiting: (id: string) => void;
}

let toastIdCounter = 0;

const AUTO_DISMISS_MS = 3000;
const EXIT_ANIM_MS = 250;

export const useToastNotifyStore = create<ToastNotifyState>((set, get) => ({
  toasts: [],

  addToast: (item) => {
    const id = `toast-${Date.now().toString(36)}-${(toastIdCounter++).toString(36)}`;
    const createdAt = Date.now();

    set((s) => ({
      // Max 3 visible toasts — remove oldest if over limit
      toasts: [...s.toasts, { ...item, id, createdAt }].slice(-3),
    }));

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      // Mark as exiting first (triggers exit animation)
      get().markExiting(id);
      // Then remove after animation completes
      setTimeout(() => {
        get().removeToast(id);
      }, EXIT_ANIM_MS);
    }, AUTO_DISMISS_MS);

    return id;
  },

  markExiting: (id) =>
    set((s) => ({
      toasts: s.toasts.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
    })),

  removeToast: (id) =>
    set((s) => ({
      toasts: s.toasts.filter((t) => t.id !== id),
    })),
}));

/**
 * Hook that returns a `toast` function for showing notifications.
 *
 * Usage:
 * ```tsx
 * const { toast } = useToastNotify();
 * toast({ title: "Saved!", variant: "success" });
 * ```
 */
export function useToastNotify() {
  const addToast = useToastNotifyStore((s) => s.addToast);
  const removeToast = useToastNotifyStore((s) => s.removeToast);
  const markExiting = useToastNotifyStore((s) => s.markExiting);

  // Memoize the returned functions so they have stable identities across
  // renders. Without this, every render creates new arrow functions, which
  // destabilizes any `useCallback`/`useEffect` that depends on `toast` —
  // a common source of infinite refetch loops.
  const toast = useCallback(
    (params: {
      title: string;
      description?: string;
      variant?: ToastVariant;
    }) => addToast(params),
    [addToast]
  );

  const dismiss = useCallback(
    (id: string) => {
      markExiting(id);
      setTimeout(() => removeToast(id), EXIT_ANIM_MS);
    },
    [markExiting, removeToast]
  );

  return useMemo(() => ({ toast, dismiss }), [toast, dismiss]);
}
