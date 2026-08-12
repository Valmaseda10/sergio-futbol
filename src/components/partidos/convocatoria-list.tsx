"use client";

import { useState } from "react";
import { toast } from "sonner";
import { toggleConvocado } from "@/app/(app)/partidos/actions";
import { JugadorAvatar } from "@/components/plantilla/jugador-avatar";
import { Checkbox } from "@/components/ui/checkbox";

interface Jugador {
  id: string;
  nombre: string;
  apellidos: string;
  dorsal: number | null;
  fotoSignedUrl: string | null;
}

export function ConvocatoriaList({
  partidoId,
  jugadores,
  convocadosIniciales,
}: {
  partidoId: string;
  jugadores: Jugador[];
  convocadosIniciales: string[];
}) {
  const [convocados, setConvocados] = useState(new Set(convocadosIniciales));
  const [pendiente, setPendiente] = useState<string | null>(null);

  async function handleToggle(jugadorId: string) {
    const yaConvocado = convocados.has(jugadorId);
    setPendiente(jugadorId);

    setConvocados((prev) => {
      const next = new Set(prev);
      if (yaConvocado) next.delete(jugadorId);
      else next.add(jugadorId);
      return next;
    });

    const result = await toggleConvocado(partidoId, jugadorId, !yaConvocado);
    setPendiente(null);

    if ("error" in result) {
      toast.error(result.error);
      setConvocados((prev) => {
        const next = new Set(prev);
        if (yaConvocado) next.add(jugadorId);
        else next.delete(jugadorId);
        return next;
      });
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {convocados.size} convocado{convocados.size !== 1 ? "s" : ""}
      </p>
      <ul className="divide-y rounded-md border">
        {jugadores.map((j) => {
          const marcado = convocados.has(j.id);
          return (
            <li key={j.id}>
              <label className="flex items-center gap-3 p-3 hover:bg-muted/50">
                <Checkbox
                  checked={marcado}
                  disabled={pendiente === j.id}
                  onCheckedChange={() => handleToggle(j.id)}
                />
                <JugadorAvatar
                  src={j.fotoSignedUrl}
                  nombre={j.nombre}
                  apellidos={j.apellidos}
                  className="size-8"
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {j.dorsal != null ? `${j.dorsal} · ` : ""}
                  {j.nombre} {j.apellidos}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
