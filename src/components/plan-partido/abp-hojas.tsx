"use client";

// Hojas de ABP listas para imprimir o descargar: las jugadas (todas o las de
// una categoría), de dos en dos por página A4, como en el PowerPoint.

import { useMemo, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/local-db";
import { clubConfig } from "@/lib/club-config";
import { PdfWatermark } from "@/components/branding/pdf-watermark";
import { AccionesPdf } from "@/components/plan-partido/acciones-pdf";
import { JugadaAbpVista } from "@/components/plan-partido/jugada-abp-vista";
import { TIPOS_ABP, tipoDeJugada, type TipoAbp } from "@/lib/plan-partido";

const POR_PAGINA = 2;

export function AbpHojas({ tipo }: { tipo?: TipoAbp }) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const todas = useLiveQuery(
    () =>
      localDb.jugadas_abp
        .toArray()
        .then((rows) =>
          rows.sort(
            (a, b) => a.orden - b.orden || a.created_at.localeCompare(b.created_at),
          ),
        ),
    [],
    [],
  );
  const jugadas = useMemo(
    () => (tipo ? todas.filter((j) => tipoDeJugada(j.tipo) === tipo) : todas),
    [todas, tipo],
  );
  const jugadores = useLiveQuery(() => localDb.jugadores.toArray(), [], []);
  const porId = useMemo(() => new Map(jugadores.map((j) => [j.id, j])), [jugadores]);

  const paginas = useMemo(() => {
    const out: (typeof jugadas)[] = [];
    for (let i = 0; i < jugadas.length; i += POR_PAGINA) {
      out.push(jugadas.slice(i, i + POR_PAGINA));
    }
    return out;
  }, [jugadas]);

  const categoria = tipo ? TIPOS_ABP.find((t) => t.value === tipo)?.plural : null;
  const nombreArchivo = `ABP ${categoria ? `${categoria} ` : ""}${clubConfig.nombreEquipo}.pdf`;

  return (
    <div className="space-y-3">
      <PdfWatermark />
      <style>{`@media print { @page { size: A4 portrait; margin: 6mm; } }`}</style>

      <AccionesPdf
        contenedorRef={contenedorRef}
        nombreArchivo={nombreArchivo}
        deshabilitado={jugadas.length === 0}
        clave={jugadas.map((j) => j.id + j.nombre + j.orden).join()}
      />

      {jugadas.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground print:hidden">
          No hay jugadas en esta categoría.
        </p>
      ) : (
        <div
          ref={contenedorRef}
          className="space-y-3 text-neutral-900 print:space-y-0"
          style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
        >
          {paginas.map((pagina, p) => (
            <div
              key={p}
              data-hoja-pdf
              className="flex flex-col divide-y overflow-hidden rounded-md border bg-white px-3 print:h-[283mm] print:break-after-page print:rounded-none print:border-none print:px-0"
            >
              {pagina.map((jugada) => (
                <JugadaAbpVista key={jugada.id} jugada={jugada} jugadores={porId} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
