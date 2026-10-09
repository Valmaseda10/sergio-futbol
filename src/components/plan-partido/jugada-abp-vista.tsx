"use client";

// Una jugada de ABP tal como va en la hoja: título (verde si es ofensiva,
// rojo si es defensiva) y el dibujo con la lista numerada de quién hace qué
// dentro del campo, arriba a la derecha.

import type { ReactNode } from "react";
import { diagramaASvg, type Diagrama } from "@/lib/ficha-entrenamiento";
import {
  COLOR_CLASE,
  FASES_ABP,
  clasePieza,
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

function esClaro(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const luz = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return luz > 170;
}

// Cada fila de la lista va del color de la pieza con su mismo número (rojo las
// rojas, azul las azules); si no hay pieza con ese número, rojo.
function colorDeFila(fila: JugadorAbp, diagrama: Diagrama): string {
  const pieza = fila.etiqueta
    ? diagrama.elementos.find((e) => e.tipo === "jugador" && e.etiqueta === fila.etiqueta)
    : null;
  return pieza?.color ?? "#dc2626";
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
  // Leyenda de los papeles: qué hace cada color (solo los que tienen texto y piezas).
  const hay = (clase: string) =>
    diagrama
      ? clase === "lanzador"
        ? diagrama.elementos.some((e) => e.tipo === "icono" && e.icono === "lanzador")
        : diagrama.elementos.some((e) => e.tipo === "jugador" && clasePieza(e.color) === clase)
      : false;
  const leyenda = (["rojo", "azul", "portero", "lanzador"] as const)
    .filter((c) => diagrama?.roles?.[c]?.trim() && hay(c))
    .map((c) => ({ clase: c, color: COLOR_CLASE[c], texto: diagrama!.roles![c]!.trim() }));
  // Debajo de la lista numerada (cada fila mide ~5 cqw sobre un campo de 66 cqw de alto).
  const leyendaTop = 11 + visibles.length * 7.6 + (visibles.length ? 3 : 0);
  // Nombre de cada jugador de la plantilla junto a su camiseta del dibujo.
  const nombres = new Map(
    [...jugadores.values()].map((j) => [j.id, (j.alias || j.nombre).toUpperCase()]),
  );
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
        dangerouslySetInnerHTML={{ __html: diagramaASvg(diagrama, { camisetas: true, nombres }) }}
      />
      {leyenda.length > 0 && (
        <ul
          className="absolute left-[78%] max-w-[21%] space-y-[0.8cqw] text-[2.5cqw] leading-[1.15] font-bold"
          style={{ top: `${leyendaTop}%` }}
        >
          {leyenda.map((l) => (
            <li key={l.clase} className="flex gap-[1cqw]" style={{ color: l.color }}>
              <span aria-hidden="true">●</span>
              <span>{l.texto}</span>
            </li>
          ))}
        </ul>
      )}
      {visibles.length > 0 && (
        <ul className="absolute top-[11%] left-[78%] space-y-[1.4cqw] text-[3.2cqw] leading-[1.1] font-extrabold">
          {visibles.map((f, i) => {
            const color = colorDeFila(f, diagrama);
            // Halo del color contrario para que se lea sobre el césped.
            const halo = esClaro(color) ? "#000000" : "#ffffff";
            return (
              <li
                key={i}
                className="flex gap-[1.6cqw]"
                style={{
                  color,
                  textShadow: `0 0 2px ${halo}, 0 0 2px ${halo}, 0 0 3px ${halo}, 1px 1px 2px ${halo}`,
                }}
              >
                <span className="min-w-[2.4cqw] text-right">{f.etiqueta}</span>
                <span className="min-w-0 break-words">{nombreJugadorAbp(f, jugadores)}</span>
              </li>
            );
          })}
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
