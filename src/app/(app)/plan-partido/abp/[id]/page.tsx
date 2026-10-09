"use client";

import { useMemo, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { PdfWatermark } from "@/components/branding/pdf-watermark";
import { AccionesPdf } from "@/components/plan-partido/acciones-pdf";
import { JugadaAbpVista } from "@/components/plan-partido/jugada-abp-vista";
import { localDb } from "@/lib/db/local-db";
import { TIPOS_ABP, tipoDeJugada } from "@/lib/plan-partido";
import { eliminarJugadaAbpLocal } from "@/app/(app)/plan-partido/local-actions";

export default function JugadaAbpPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const contenedorRef = useRef<HTMLDivElement>(null);
  const jugada = useLiveQuery(
    async () => (await localDb.jugadas_abp.get(id)) ?? null,
    [id],
  );
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

  const tipo = jugada ? tipoDeJugada(jugada.tipo) : null;
  const hermanas = useMemo(
    () => (tipo ? todas.filter((j) => tipoDeJugada(j.tipo) === tipo) : []),
    [todas, tipo],
  );

  if (jugada === undefined) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }
  if (jugada === null) {
    return <p className="text-sm text-muted-foreground">Jugada no encontrada.</p>;
  }

  const i = hermanas.findIndex((j) => j.id === jugada.id);
  const anterior = i > 0 ? hermanas[i - 1] : null;
  const siguiente = i >= 0 && i < hermanas.length - 1 ? hermanas[i + 1] : null;
  const categoria = TIPOS_ABP.find((t) => t.value === tipo)?.plural;

  return (
    <div className="space-y-3">
      <PdfWatermark />
      <style>{`@media print { @page { size: A4 portrait; margin: 6mm; } }`}</style>

      <div className="space-y-2 print:hidden">
        <Link
          href="/plan-partido/abp"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          ABP · {categoria}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1">
            {anterior ? (
              <Link
                href={`/plan-partido/abp/${anterior.id}`}
                className={buttonVariants({ size: "sm", variant: "outline" })}
              >
                <ChevronLeft className="size-4" />
                Anterior
              </Link>
            ) : null}
            {siguiente ? (
              <Link
                href={`/plan-partido/abp/${siguiente.id}`}
                className={buttonVariants({ size: "sm", variant: "outline" })}
              >
                Siguiente
                <ChevronRight className="size-4" />
              </Link>
            ) : null}
          </div>
          <div className="flex gap-1">
            <Link
              href={`/plan-partido/abp/${jugada.id}/editar`}
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              <Pencil className="size-4" />
              Editar
            </Link>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-destructive"
              onClick={async () => {
                if (window.confirm(`¿Eliminar la jugada "${jugada.nombre}"?`)) {
                  await eliminarJugadaAbpLocal(jugada.id);
                  router.push("/plan-partido/abp");
                }
              }}
            >
              <Trash2 className="size-4" />
              Eliminar
            </Button>
          </div>
        </div>
        <AccionesPdf
          contenedorRef={contenedorRef}
          nombreArchivo={`ABP ${jugada.nombre.replace(/[\\/:*?"<>|]/g, "-")}.pdf`}
          clave={JSON.stringify([jugada.nombre, jugada.diagrama, jugada.jugadores, jugada.notas])}
        />
      </div>

      <div
        ref={contenedorRef}
        className="text-neutral-900"
        style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
      >
        <div
          data-hoja-pdf
          className="flex flex-col overflow-hidden rounded-md border bg-white px-3 print:h-[283mm] print:rounded-none print:border-none print:px-0"
        >
          <JugadaAbpVista jugada={jugada} jugadores={porId} />
        </div>
      </div>
    </div>
  );
}
