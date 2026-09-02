"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CalendarioPanel({
  calendarioTokenInicial,
}: {
  calendarioTokenInicial: string;
}) {
  const [token, setToken] = useState(calendarioTokenInicial);
  const [regenerando, setRegenerando] = useState(false);

  const host = typeof window !== "undefined" ? window.location.host : "";
  const urlHttps = `https://${host}/api/calendario/${token}`;
  const urlWebcal = `webcal://${host}/api/calendario/${token}`;

  async function handleCopiar() {
    try {
      await navigator.clipboard.writeText(urlHttps);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se ha podido copiar el enlace");
    }
  }

  async function handleRegenerar() {
    if (
      !window.confirm(
        "El enlace actual dejará de funcionar y tendrás que volver a suscribirte en el iPhone. ¿Continuar?",
      )
    ) {
      return;
    }
    setRegenerando(true);
    try {
      const res = await fetch("/api/calendario/regenerar", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setToken(data.calendarioToken);
      toast.success("Enlace regenerado");
    } catch {
      toast.error("No se ha podido regenerar el enlace");
    } finally {
      setRegenerando(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Suscríbete a este enlace desde Ajustes → Calendario → Añadir
        calendario → Añadir calendario suscrito en tu iPhone para ver
        entrenamientos y partidos directamente en la app Calendario, con un
        aviso 1 hora antes de cada uno. El iPhone lo actualiza solo cada
        cierto tiempo (lo controla iOS, no es al instante).
      </p>
      <div className="flex gap-2">
        <Input readOnly value={urlHttps} className="text-xs" />
        <Button type="button" variant="outline" size="icon" onClick={handleCopiar} aria-label="Copiar enlace">
          <Copy className="size-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" nativeButton={false} render={<a href={urlWebcal} />}>
          Añadir al iPhone
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={regenerando}
          onClick={handleRegenerar}
        >
          <RefreshCw className="size-4" />
          Regenerar enlace
        </Button>
      </div>
    </div>
  );
}
