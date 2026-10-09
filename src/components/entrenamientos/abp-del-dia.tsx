"use client";

// Hojas extra de la ficha de sesión (después de las dos de siempre) con las
// jugadas de ABP y las imágenes que se trabajan ese día: 6 por página (2 x 3).
// Si la sesión no tiene ninguna, no se pinta nada y la ficha sigue en 2 hojas.

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/local-db";
import { leerFicha } from "@/lib/ficha-entrenamiento";
import { CampoAbp } from "@/components/plan-partido/jugada-abp-vista";
import { FASES_ABP, leerDiagramaAbp, leerJugadoresAbp } from "@/lib/plan-partido";
import type { LocalEntrenamiento } from "@/lib/db/local-db";

const POR_HOJA = 6;

type Item =
  | { tipo: "jugada"; id: string; tarea: number }
  | { tipo: "imagen"; ruta: string; tarea: number };

export function rutasExtraDe(ficha: ReturnType<typeof leerFicha>): string[] {
  return (ficha.imagenes_extra ?? []).flatMap((rutas) => rutas ?? []);
}

export function AbpDelDia({
  entrenamiento,
  urls,
}: {
  entrenamiento: LocalEntrenamiento;
  /** URLs firmadas de las imágenes extra, por ruta. */
  urls: Record<string, string>;
}) {
  const ficha = leerFicha(entrenamiento.ficha);
  const jugadas = useLiveQuery(() => localDb.jugadas_abp.toArray(), [], []);
  const jugadores = useLiveQuery(() => localDb.jugadores.toArray(), [], []);
  const jugadoresPorId = useMemo(() => new Map(jugadores.map((j) => [j.id, j])), [jugadores]);
  const jugadaPorId = useMemo(() => new Map(jugadas.map((j) => [j.id, j])), [jugadas]);

  const items: Item[] = [];
  for (let t = 0; t < 4; t++) {
    for (const id of ficha.abp_jugadas?.[t] ?? []) items.push({ tipo: "jugada", id, tarea: t + 1 });
    for (const ruta of ficha.imagenes_extra?.[t] ?? []) items.push({ tipo: "imagen", ruta, tarea: t + 1 });
  }
  const visibles = items.filter((i) => (i.tipo === "jugada" ? jugadaPorId.has(i.id) : true));
  if (visibles.length === 0) return null;

  const hojas: Item[][] = [];
  for (let i = 0; i < visibles.length; i += POR_HOJA) hojas.push(visibles.slice(i, i + POR_HOJA));

  return (
    <>
      {hojas.map((hoja, h) => (
        <div
          key={h}
          data-hoja-pdf
          className="flex flex-col overflow-hidden rounded-md border border-neutral-300 bg-white print:h-[283mm] print:break-before-page print:rounded-none print:border-none"
        >
          <p
            className="px-2 py-1 text-center text-sm font-bold tracking-wide uppercase print:py-0.5 print:text-[12px]"
            style={{ backgroundColor: "#c00000", color: "#ffffff" }}
          >
            ABP de la sesión{hojas.length > 1 ? ` (${h + 1}/${hojas.length})` : ""}
          </p>
          <div className="grid flex-1 grid-cols-2 content-start gap-x-2 gap-y-1 p-2 print:gap-y-0 print:p-1">
            {hoja.map((item) => {
              if (item.tipo === "jugada") {
                const j = jugadaPorId.get(item.id)!;
                const color = FASES_ABP.find((f) => f.value === j.fase)?.color ?? "#111111";
                return (
                  <div key={`j-${item.id}-${item.tarea}`} className="space-y-0.5 pb-1">
                    <p
                      className="truncate text-xs leading-tight font-extrabold uppercase print:text-[10px]"
                      style={{ color }}
                    >
                      {j.nombre}
                    </p>
                    <CampoAbp
                      diagrama={leerDiagramaAbp(j.diagrama)}
                      filas={leerJugadoresAbp(j.jugadores)}
                      jugadores={jugadoresPorId}
                    />
                  </div>
                );
              }
              const url = urls[item.ruta];
              return (
                <div key={`i-${item.ruta}`} className="space-y-0.5 pb-1">
                  <p className="truncate text-xs leading-tight font-bold text-neutral-600 uppercase print:text-[10px]">
                    Imagen · Tarea {item.tarea}
                  </p>
                  <div className="flex aspect-[1056/723] w-full items-center justify-center overflow-hidden rounded-sm border bg-white">
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt="" className="size-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Sin conexión</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
