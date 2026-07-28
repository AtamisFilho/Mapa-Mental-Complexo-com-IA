"use client";

import { useEffect } from "react";

/**
 * Regista o Service Worker quando o app carrega em produção.
 * Em desenvolvimento (next dev) o SW é desativado para evitar conflitos com HMR.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        // Verificar updates a cada hora
        setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
      } catch (err) {
        console.warn("[PWA] Falha ao registar Service Worker:", err);
      }
    };

    // Registar só depois da página estar totalmente carregada
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
