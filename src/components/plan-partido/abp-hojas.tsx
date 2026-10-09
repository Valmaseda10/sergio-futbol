"use client";

// Hojas de ABP: las jugadas guardadas, de dos en dos por página A4 (como el
// PowerPoint), con su botón de editar/mover/eliminar en pantalla.

import { useMemo, useRef } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { localDb } from "@/lib/db/local-db";
import { clubConfig } from "@/lib/club-config";
import { PdfWatermark } from "@/components/branding/pdf-watermark";
import { AccionesPdf } from "@/components/plan-partido/acciones-pdf";
import { JugadaAbpVista } from "@/components/plan-partido/jugada-abp-vista";
import {
  eliminarJugadaAbpLocal,
  moverJugadaAbpLocal,
} from "@/app/(app)/plan-partido/local-actions";

const POR_PAGINA = 2;

export function AbpHojas() {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const jugadas = useLiveQuery(
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

  const paginas = useMemo(() => {
    const out: (typeof jugadas)[] = [];
    for (let i = 0; i < jugadas.length; i += POR_PAGINA) {
      out.push(jugadas.slice(i, i + POR_PAGINA));
    }
    return out;
  }, [jugadas]);

  const hoy = new Date();
  const nombreArchivo = `ABP ${clubConfig.nombreEquipo} ${String(hoy.getDate()).padStart(2, "0")}-${String(
    hoy.getMonth() + 1,
  ).padStart(2, "0")}-${hoy.getFullYear()}.pdf`;

  return (
    <div className="space-y-3">
      <PdfWatermark />
      <style>{`@media print { @page { size: A4 portrait; margin: 6mm; } }`}</style>

      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href="/plan-partido/abp/nueva" className={buttonVariants({ size: "sm" })}>
          <Plus className="size-4" />
          Nueva jugada
        </Link>
        <AccionesPdf
          contenedorRef={contenedorRef}
          nombreArchivo={nombreArchivo}
          deshabilitado={jugadas.length === 0}
          clave={`${jugadas.length}-${jugadas.map((j) => j.id + j.nombre).join()}`}
        />
      </div>

      {jugadas.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground print:hidden">
          Todavía no hay ninguna jugada. Pulsa &quot;Nueva jugada&quot;, dibuja la jugada
          y elige quién hace cada cosa.
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
              {pagina.map((jugada) => {
                const indice = jugadas.findIndex((j) => j.id === jugada.id);
                return (
                  <JugadaAbpVista
                    key={jugada.id}
                    jugada={jugada}
                    jugadores={porId}
                    acciones={
                      <div className="flex shrink-0 gap-0.5 print:hidden">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          aria-label="Subir"
                          disabled={indice === 0}
                          onClick={() => void moverJugadaAbpLocal(jugada.id, -1)}
                        >
                          <ArrowUp className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          aria-label="Bajar"
                          disabled={indice === jugadas.length - 1}
                          onClick={() => void moverJugadaAbpLocal(jugada.id, 1)}
                        >
                          <ArrowDown className="size-4" />
                        </Button>
                        <Link
                          href={`/plan-partido/abp/${jugada.id}`}
                          className={buttonVariants({ size: "icon", variant: "ghost" })}
                          aria-label="Editar jugada"
                        >
                          <Pencil className="size-4" />
                        </Link>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-8 text-destructive"
                          aria-label="Eliminar jugada"
                          onClick={() => {
                            if (window.confirm(`¿Eliminar la jugada "${jugada.nombre}"?`)) {
                              void eliminarJugadaAbpLocal(jugada.id);
                            }
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    }
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
