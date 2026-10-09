"use client";

// Una jugada de ABP tal como va en la hoja: título (verde si es ofensiva,
// rojo si es defensiva) y el dibujo con la lista numerada de quién hace qué
// dentro del campo, arriba a la derecha.

import type { ReactNode } from "react";
import { diagramaASvg, type Diagrama } from "@/lib/ficha-entrenamiento";
import {
  FASES_ABP,
  leerDiagramaAbp,
  leerJugadoresAbp,
  type JugadorAbp,
} from "@/lib/plan-partido";
import type { LocalJugadaAbp, LocalJugador } from "@/lib/db/local-db";

export function nombreJugadorAbp(
  fila: { jugador_id: string | null; texto: string },
  jugadores: Map<string, LocalJugador>,
): string {
  const j = fila.jugador_id ? jugadores.get(fila.jugador_id) : undefined;
  return (j ? j.alias || j.nombre : fila.texto).toUpperCase();
}

/** El dibujo con la lista numerada superpuesta en la esquina superior derecha. */
export function CampoAbp({
  diagrama,
  filas,
  jugadores,
}: {
  diagrama: Diagrama | null;
  filas: JugadorAbp[];
  jugadores: Map<string, LocalJugador>;
}) {
  const visibles = filas.filter((f) => f.etiqueta || f.jugador_id || f.texto);
  if (!diagrama) {
    return (
      <div className="flex aspect-[520/340] w-full items-center justify-center rounded-sm border border-dashed text-xs text-muted-foreground">
        Sin dibujo
      </div>
    );
  }
  return (
    // El tamaño de la lista va en cqw (relativo al ancho del campo) para que se
    // vea igual en pantalla, impreso y en el PDF.
    <div className="relative w-full [container-type:inline-size]">
      <div
        className="overflow-hidden rounded-sm [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: diagramaASvg(diagrama) }}
      />
      {visibles.length > 0 && (
        <ul className="absolute top-[3%] right-[2%] max-w-[26%] space-y-[0.4cqw] rounded-md bg-black/55 px-[1.6cqw] py-[1.2cqw] text-[2.9cqw] leading-[1.15] font-extrabold text-white">
          {visibles.map((f, i) => (
            <li key={i} className="flex gap-[1.2cqw]">
              <span className="min-w-[2cqw] text-right text-yellow-300">{f.etiqueta}</span>
              <span className="min-w-0 break-words">{nombreJugadorAbp(f, jugadores)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
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
      <div className="w-full print:mx-auto print:w-[176mm]">
        <CampoAbp
          diagrama={leerDiagramaAbp(jugada.diagrama)}
          filas={leerJugadoresAbp(jugada.jugadores)}
          jugadores={jugadores}
        />
      </div>
      {jugada.notas && (
        <p className="text-sm whitespace-pre-wrap text-neutral-700 print:text-[11px] print:leading-tight">
          {jugada.notas}
        </p>
      )}
    </div>
  );
}
