"use client";

// Una jugada de ABP tal como va en la hoja: título (verde si es ofensiva,
// rojo si es defensiva), el dibujo y, a la derecha, la lista numerada de quién
// hace qué.

import type { ReactNode } from "react";
import { diagramaASvg } from "@/lib/ficha-entrenamiento";
import {
  FASES_ABP,
  leerDiagramaAbp,
  leerJugadoresAbp,
} from "@/lib/plan-partido";
import type { LocalJugadaAbp, LocalJugador } from "@/lib/db/local-db";

export function nombreJugadorAbp(
  fila: { jugador_id: string | null; texto: string },
  jugadores: Map<string, LocalJugador>,
): string {
  const j = fila.jugador_id ? jugadores.get(fila.jugador_id) : undefined;
  return (j ? j.alias || j.nombre : fila.texto).toUpperCase();
}

export function JugadaAbpVista({
  jugada,
  jugadores,
  acciones,
}: {
  jugada: LocalJugadaAbp;
  jugadores: Map<string, LocalJugador>;
  /** Botones propios de la pantalla (no salen al imprimir ni en el PDF). */
  acciones?: ReactNode;
}) {
  const diagrama = leerDiagramaAbp(jugada.diagrama);
  const filas = leerJugadoresAbp(jugada.jugadores).filter(
    (f) => f.etiqueta || f.jugador_id || f.texto,
  );
  const color = FASES_ABP.find((f) => f.value === jugada.fase)?.color ?? "#111111";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1 py-2 print:py-1">
      <div className="flex items-center justify-between gap-2">
        <h3
          className="text-lg leading-tight font-extrabold uppercase print:text-[16px]"
          style={{ color }}
        >
          {jugada.nombre}
        </h3>
        {acciones}
      </div>
      <div className="grid grid-cols-[1fr_9rem] gap-2 print:grid-cols-[1fr_44mm]">
        {diagrama ? (
          <div
            className="overflow-hidden rounded-sm [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: diagramaASvg(diagrama) }}
          />
        ) : (
          <div className="flex aspect-[520/340] items-center justify-center rounded-sm border border-dashed text-xs text-muted-foreground">
            Sin dibujo
          </div>
        )}
        <ul className="space-y-0.5 text-base font-bold print:text-[13px]">
          {filas.map((f, i) => (
            <li key={i} className="flex gap-1.5 leading-snug" style={{ color: "#dc2626" }}>
              <span className="w-5 shrink-0 text-right">{f.etiqueta}</span>
              <span className="min-w-0 break-words">
                {nombreJugadorAbp(f, jugadores)}
              </span>
            </li>
          ))}
        </ul>
      </div>
      {jugada.notas && (
        <p className="text-sm whitespace-pre-wrap text-neutral-700 print:text-[11px] print:leading-tight">
          {jugada.notas}
        </p>
      )}
    </div>
  );
}
