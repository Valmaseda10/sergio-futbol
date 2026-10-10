"use client";

// Una jugada de ABP tal como va en la hoja: título (verde si es ofensiva,
// rojo si es defensiva) y el dibujo con la lista numerada de quién hace qué
// dentro del campo, arriba a la derecha.

import type { ReactNode } from "react";
import { anadirPiernas, diagramaASvg, type Diagrama } from "@/lib/ficha-entrenamiento";
import {
  COLOR_ESTADO_PARTIDO,
  FASES_ABP,
  leerDiagramaAbp,
  nombreAlLadoAbp,
  leerJugadoresAbp,
  type EstadoPartido,
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
  numeros = false,
  tipo,
  fase,
  grande = false,
  estados,
}: {
  diagrama: Diagrama | null;
  filas: JugadorAbp[];
  jugadores: Map<string, LocalJugador>;
  /** Con los números identificadores de las camisetas (solo al editar). */
  numeros?: boolean;
  /** Categoría y fase de la jugada: deciden dónde salen los nombres de las camisetas. */
  tipo?: string | null;
  fase?: string | null;
  /** Lista de la derecha con letra mayor (para dibujos pequeños, como en la ficha de sesión). */
  grande?: boolean;
  /** Titulares (verde) y suplentes (rojo) del partido sincronizado: raya bajo su nombre. */
  estados?: Map<string, EstadoPartido>;
}) {
  const subrayados = estados
    ? new Map([...estados].map(([id, e]) => [id, COLOR_ESTADO_PARTIDO[e]] as const))
    : undefined;
  // En la lista de la derecha solo salen las filas que ya tienen jugador.
  const visibles = filas.filter((f) => f.jugador_id || f.texto);
  // Nombre de cada jugador de la plantilla junto a su camiseta del dibujo.
  const nombres = anadirPiernas(
    new Map([...jugadores.values()].map((j) => [j.id, (j.alias || j.nombre).toUpperCase()])),
    [...jugadores.values()],
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
        dangerouslySetInnerHTML={{ __html: diagramaASvg(diagrama, {
          camisetas: true,
          nombres,
          // Al editar, todas las camisetas llevan número; al ver, solo las rojas
          // (las de la lista de la derecha) para saber qué movimiento hace cada una.
          numeros: numeros ? true : "rojas",
          nombreAlLado: nombreAlLadoAbp(tipo, fase),
          textoK: grande ? 1.15 : 1,
          subrayados,
        }) }}
      />
      {visibles.length > 0 && (
        <ul
          className={`absolute top-[11%] left-[78%] space-y-[1.4cqw] leading-[1.1] font-extrabold ${
            grande ? "text-[3.5cqw]" : "text-[3.2cqw]"
          }`}
        >
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
                <span
                  className="min-w-0 break-words"
                  style={
                    f.jugador_id && estados?.get(f.jugador_id)
                      ? {
                          textDecoration: "underline",
                          textDecorationColor: COLOR_ESTADO_PARTIDO[estados.get(f.jugador_id)!],
                          textDecorationThickness: "0.5cqw",
                          textUnderlineOffset: "0.5cqw",
                        }
                      : undefined
                  }
                >
                  {nombreJugadorAbp(f, jugadores)}
                </span>
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
          tipo={jugada.tipo}
          fase={jugada.fase}
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
