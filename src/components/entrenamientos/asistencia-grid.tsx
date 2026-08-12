"use client";

import { useState } from "react";
import { toast } from "sonner";
import { actualizarAsistencia } from "@/app/(app)/entrenamientos/actions";
import { JugadorAvatar } from "@/components/plantilla/jugador-avatar";
import { cn } from "@/lib/utils";

interface Jugador {
  id: string;
  nombre: string;
  apellidos: string;
  dorsal: number | null;
  fotoSignedUrl: string | null;
}

interface Estado {
  id: string;
  nombre: string;
  color: string;
}

export function AsistenciaGrid({
  entrenamientoId,
  jugadores,
  estados,
  asistenciasIniciales,
}: {
  entrenamientoId: string;
  jugadores: Jugador[];
  estados: Estado[];
  asistenciasIniciales: Record<string, string>;
}) {
  const [asistencias, setAsistencias] =
    useState<Record<string, string>>(asistenciasIniciales);
  const [pendiente, setPendiente] = useState<string | null>(null);

  async function handleChip(jugadorId: string, estadoId: string) {
    const actual = asistencias[jugadorId];
    const nuevoEstadoId = actual === estadoId ? null : estadoId;

    setPendiente(jugadorId);
    const previo = asistencias[jugadorId];
    setAsistencias((prev) => {
      const next = { ...prev };
      if (nuevoEstadoId) {
        next[jugadorId] = nuevoEstadoId;
      } else {
        delete next[jugadorId];
      }
      return next;
    });

    const result = await actualizarAsistencia(
      entrenamientoId,
      jugadorId,
      nuevoEstadoId,
    );
    setPendiente(null);

    if ("error" in result) {
      toast.error(result.error);
      setAsistencias((prev) => ({ ...prev, [jugadorId]: previo }));
    }
  }

  return (
    <ul className="divide-y rounded-md border">
      {jugadores.map((j) => {
        const estadoActualId = asistencias[j.id];
        const estadoActual = estados.find((e) => e.id === estadoActualId);

        return (
          <li key={j.id} className="space-y-2 p-3">
            <div className="flex items-center gap-3">
              <JugadorAvatar
                src={j.fotoSignedUrl}
                nombre={j.nombre}
                apellidos={j.apellidos}
                className="size-8"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {j.dorsal != null ? `${j.dorsal} · ` : ""}
                  {j.nombre} {j.apellidos}
                </p>
              </div>
              {!estadoActual && (
                <span className="text-xs text-muted-foreground">Asiste</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {estados.map((estado) => {
                const seleccionado = estadoActualId === estado.id;
                return (
                  <button
                    key={estado.id}
                    type="button"
                    disabled={pendiente === j.id}
                    onClick={() => handleChip(j.id, estado.id)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50",
                      seleccionado
                        ? "text-white"
                        : "bg-background text-muted-foreground hover:text-foreground",
                    )}
                    style={
                      seleccionado
                        ? { backgroundColor: estado.color, borderColor: estado.color }
                        : { borderColor: estado.color }
                    }
                  >
                    {estado.nombre}
                  </button>
                );
              })}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
