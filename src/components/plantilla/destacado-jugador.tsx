"use client";

import { useState } from "react";
import { toast } from "sonner";
import { actualizarDestacadoJugadorLocal } from "@/app/(app)/plantilla/local-actions";
import type { DestacadoJugador } from "@/lib/types/database.types";
import { cn } from "@/lib/utils";

const OPCIONES: { value: DestacadoJugador | null; label: string }[] = [
  { value: null, label: "Ninguno" },
  { value: "destacado", label: "Destacado" },
  { value: "debil", label: "Débil" },
];

export function DestacadoJugadorSelector({
  jugadorId,
  destacado,
}: {
  jugadorId: string;
  destacado: DestacadoJugador | null;
}) {
  const [guardando, setGuardando] = useState(false);

  async function elegir(valor: DestacadoJugador | null) {
    if (valor === destacado || guardando) return;
    setGuardando(true);
    const result = await actualizarDestacadoJugadorLocal(jugadorId, valor);
    setGuardando(false);
    if ("error" in result) toast.error(result.error);
  }

  return (
    <div className="flex gap-2 print:hidden">
      {OPCIONES.map((o) => (
        <button
          key={o.label}
          type="button"
          disabled={guardando}
          onClick={() => elegir(o.value)}
          className={cn(
            "flex-1 rounded-md border py-1.5 text-xs font-medium",
            destacado === o.value
              ? o.value === "destacado"
                ? "border-green-600 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200"
                : o.value === "debil"
                  ? "border-red-600 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
                  : "border-primary bg-primary/10 text-primary"
              : "text-muted-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
