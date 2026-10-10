"use client";

// Hojas de ABP listas para imprimir o descargar: se eligen las jugadas que se
// quieren (todas, una categoría o las que se marquen) y salen de dos en dos por
// página A4, por orden de categoría y sin mezclar categorías en una misma hoja
// (dos córners juntos, dos faltas laterales juntas...).

import { useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb, type LocalJugadaAbp } from "@/lib/db/local-db";
import { clubConfig } from "@/lib/club-config";
import { PdfWatermark } from "@/components/branding/pdf-watermark";
import { AccionesPdf } from "@/components/plan-partido/acciones-pdf";
import { JugadaAbpVista } from "@/components/plan-partido/jugada-abp-vista";
import { Button } from "@/components/ui/button";
import { FASES_ABP, TIPOS_ABP, tipoDeJugada, type TipoAbp } from "@/lib/plan-partido";

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
  const jugadores = useLiveQuery(() => localDb.jugadores.toArray(), [], []);
  const porId = useMemo(() => new Map(jugadores.map((j) => [j.id, j])), [jugadores]);

  // Por categoría, en el orden de siempre (córners, faltas directas, laterales, frontales).
  const porTipo = useMemo(
    () =>
      TIPOS_ABP.map((t) => ({
        ...t,
        jugadas: todas.filter((j) => tipoDeJugada(j.tipo) === t.value),
      })).filter((t) => t.jugadas.length > 0),
    [todas],
  );

  // Selección: hasta que se toca algo, la de la categoría de la URL o todas.
  const [elegidas, setElegidas] = useState<Set<string> | null>(null);
  const seleccion = useMemo(
    () =>
      elegidas ??
      new Set(todas.filter((j) => !tipo || tipoDeJugada(j.tipo) === tipo).map((j) => j.id)),
    [elegidas, todas, tipo],
  );

  function cambiar(ids: string[], marcar: boolean) {
    const siguiente = new Set(seleccion);
    for (const id of ids) {
      if (marcar) siguiente.add(id);
      else siguiente.delete(id);
    }
    setElegidas(siguiente);
  }

  // Las páginas: cada categoría por separado, de dos en dos.
  const paginas = useMemo(() => {
    const out: LocalJugadaAbp[][] = [];
    for (const cat of porTipo) {
      const sel = cat.jugadas.filter((j) => seleccion.has(j.id));
      for (let i = 0; i < sel.length; i += POR_PAGINA) out.push(sel.slice(i, i + POR_PAGINA));
    }
    return out;
  }, [porTipo, seleccion]);
  const numJugadas = paginas.reduce((n, p) => n + p.length, 0);

  const categoriasElegidas = porTipo.filter((c) => c.jugadas.some((j) => seleccion.has(j.id)));
  const categoria =
    categoriasElegidas.length === 1 && porTipo.length > 1 ? categoriasElegidas[0].plural : null;
  const nombreArchivo = `ABP ${categoria ? `${categoria} ` : ""}${clubConfig.nombreEquipo}.pdf`;

  return (
    <div className="space-y-3">
      <PdfWatermark />
      <style>{`@media print { @page { size: A4 portrait; margin: 6mm; } }`}</style>

      {todas.length > 0 && (
        <div className="space-y-3 rounded-md border p-3 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              Qué imprimir{" "}
              <span className="font-normal text-muted-foreground">
                · {numJugadas} {numJugadas === 1 ? "jugada" : "jugadas"} en {paginas.length}{" "}
                {paginas.length === 1 ? "hoja" : "hojas"}
              </span>
            </p>
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => cambiar(todas.map((j) => j.id), true)}
              >
                Todas
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => cambiar(todas.map((j) => j.id), false)}
              >
                Ninguna
              </Button>
            </div>
          </div>
          {porTipo.map((cat) => {
            const marcadas = cat.jugadas.filter((j) => seleccion.has(j.id)).length;
            return (
              <div key={cat.value} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {cat.plural} ({marcadas}/{cat.jugadas.length})
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    onClick={() =>
                      cambiar(
                        cat.jugadas.map((j) => j.id),
                        marcadas < cat.jugadas.length,
                      )
                    }
                  >
                    {marcadas < cat.jugadas.length ? "Marcar todas" : "Quitar todas"}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {cat.jugadas.map((j) => {
                    const activa = seleccion.has(j.id);
                    const color = FASES_ABP.find((f) => f.value === j.fase)?.color;
                    return (
                      <button
                        key={j.id}
                        type="button"
                        aria-pressed={activa}
                        onClick={() => cambiar([j.id], !activa)}
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                          activa
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background hover:bg-muted"
                        }`}
                        style={activa ? undefined : { color }}
                      >
                        {j.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AccionesPdf
        contenedorRef={contenedorRef}
        nombreArchivo={nombreArchivo}
        deshabilitado={numJugadas === 0}
        clave={paginas.flat().map((j) => j.id + j.nombre + j.orden).join()}
      />

      {numJugadas === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground print:hidden">
          {todas.length === 0
            ? "Todavía no hay jugadas."
            : "No hay ninguna jugada marcada: elige arriba las que quieras imprimir."}
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
              className="flex flex-col divide-y overflow-hidden rounded-md border bg-white px-3 print:h-[283mm] print:break-after-page print:last:break-after-auto print:rounded-none print:border-none print:px-0"
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
