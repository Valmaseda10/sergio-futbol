"use client";

// Las jugadas de ABP que se trabajan en una tarea, dibujadas en su hueco de la
// ficha (hasta 3, en fila). No añade hojas: ocupa el sitio de la imagen de la tarea.

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/local-db";
import { CampoAbp } from "@/components/plan-partido/jugada-abp-vista";
import { FASES_ABP, leerDiagramaAbp, leerJugadoresAbp } from "@/lib/plan-partido";

export const MAX_JUGADAS_ABP_TAREA = 3;

export function AbpDeLaTarea({
  ids,
  barra,
}: {
  ids: string[];
  /** Cabecera azul de la sección, igual que las otras de la ficha. */
  barra: React.ReactNode;
}) {
  const jugadas = useLiveQuery(() => localDb.jugadas_abp.toArray(), [], []);
  const jugadores = useLiveQuery(() => localDb.jugadores.toArray(), [], []);
  const jugadoresPorId = useMemo(() => new Map(jugadores.map((j) => [j.id, j])), [jugadores]);
  const elegidas = ids
    .slice(0, MAX_JUGADAS_ABP_TAREA)
    .map((id) => jugadas.find((j) => j.id === id))
    .filter((j): j is NonNullable<typeof j> => !!j);
  if (elegidas.length === 0) return null;

  return (
    <div className="border-t border-neutral-300 print:shrink-0">
      {barra}
      <div
        className={`grid grid-cols-1 gap-x-1 gap-y-1 p-1 print:p-0.5 ${
          elegidas.length >= 3
            ? "sm:grid-cols-3 print:grid-cols-3"
            : "sm:grid-cols-2 print:grid-cols-2"
        }`}
      >
        {elegidas.map((j) => {
          const color = FASES_ABP.find((f) => f.value === j.fase)?.color ?? "#111111";
          return (
            <div key={j.id} className="min-w-0 space-y-0.5">
              <p
                className="truncate text-xs leading-tight font-extrabold uppercase print:text-[9px]"
                style={{ color }}
              >
                {j.nombre}
              </p>
              <CampoAbp
                grande
                diagrama={leerDiagramaAbp(j.diagrama)}
                filas={leerJugadoresAbp(j.jugadores)}
                jugadores={jugadoresPorId}
                tipo={j.tipo}
                fase={j.fase}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
