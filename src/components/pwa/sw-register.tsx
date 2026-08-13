"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    // En desarrollo, Turbopack reutiliza URLs de chunk entre recompilaciones;
    // cachear con el SW serviría JS obsoleto tras cada cambio. Solo se
    // registra en producción.
    if (process.env.NODE_ENV !== "production") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
