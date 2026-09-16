"use client";

// Ficha de sesión al estilo de la plantilla que se usaba en PowerPoint,
// pensada para imprimir/exportar a PDF con window.print() (el mismo
// mecanismo que ya usa el informe de scouting de rivales) — así no hace
// falta ninguna licencia de PowerPoint para seguir generando la hoja de
// cada entrenamiento.

import { Printer } from "lucide-react";
import { clubConfig } from "@/lib/club-config";
import { capitalizarPrimera } from "@/lib/date";
import { CATEGORIA_TAREA_LABEL } from "@/lib/validations/categoria-tarea";
import type { LocalEntrenamiento } from "@/lib/db/local-db";
import { Button } from "@/components/ui/button";
import { PdfWatermark } from "@/components/branding/pdf-watermark";

function formatearFechaCorta(fecha: string) {
  return capitalizarPrimera(
    new Date(`${fecha}T00:00:00`).toLocaleDateString("es-ES", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  if (!valor) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
        {etiqueta}
      </p>
      <p className="text-sm whitespace-pre-wrap">{valor}</p>
    </div>
  );
}

function BloqueTarea({
  numero,
  titulo,
  imagenUrl,
  dimension,
  series,
  tiempo,
  minutos,
  categoria,
  objetivosDef,
  objetivosOfe,
  rotacion,
  reglasProvocacion,
  observaciones,
}: {
  numero: number;
  titulo: string | null;
  imagenUrl: string | null;
  dimension: string | null;
  series: string | null;
  tiempo: string | null;
  minutos: number | null;
  categoria: string | null;
  objetivosDef: string | null;
  objetivosOfe: string | null;
  rotacion: string | null;
  reglasProvocacion: string | null;
  observaciones: string | null;
}) {
  const sinContenido =
    !titulo &&
    !imagenUrl &&
    !dimension &&
    !series &&
    !tiempo &&
    !objetivosDef &&
    !objetivosOfe &&
    !rotacion &&
    !reglasProvocacion &&
    !observaciones;
  if (sinContenido) return null;

  return (
    <div className="break-inside-avoid rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-heading text-sm tracking-wide">
          TAREA {numero}
          {titulo ? ` · ${titulo}` : ""}
        </p>
        {categoria && (
          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
            {CATEGORIA_TAREA_LABEL[categoria as keyof typeof CATEGORIA_TAREA_LABEL] ??
              categoria}
          </span>
        )}
      </div>

      <div className="mt-2 flex gap-3">
        {imagenUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagenUrl}
            alt={`Diagrama de la tarea ${numero}`}
            className="h-28 w-28 shrink-0 rounded-md border object-cover print:h-32 print:w-32"
          />
        )}
        <div className="min-w-0 flex-1 space-y-2">
          {(dimension || series || tiempo || minutos != null) && (
            <div className="flex gap-4 text-xs">
              {dimension && (
                <span>
                  <span className="font-semibold">D</span> {dimension}
                </span>
              )}
              {series && (
                <span>
                  <span className="font-semibold">E</span> {series}
                </span>
              )}
              {tiempo && (
                <span>
                  <span className="font-semibold">T</span> {tiempo}
                </span>
              )}
              {minutos != null && (
                <span className="text-muted-foreground">({minutos}′ en total)</span>
              )}
            </div>
          )}

          {(objetivosDef || objetivosOfe) && (
            <div className="grid grid-cols-2 gap-3">
              {objetivosDef && (
                <div>
                  <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Ítems fase DEF
                  </p>
                  <p className="text-xs whitespace-pre-wrap">{objetivosDef}</p>
                </div>
              )}
              {objetivosOfe && (
                <div>
                  <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Ítems fase OFE
                  </p>
                  <p className="text-xs whitespace-pre-wrap">{objetivosOfe}</p>
                </div>
              )}
            </div>
          )}

          {rotacion && (
            <div>
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                Rotación
              </p>
              <p className="text-xs whitespace-pre-wrap">{rotacion}</p>
            </div>
          )}
          {reglasProvocacion && (
            <div>
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                Reglas de provocación
              </p>
              <p className="text-xs whitespace-pre-wrap">{reglasProvocacion}</p>
            </div>
          )}
          {observaciones && (
            <div>
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                Observaciones
              </p>
              <p className="text-xs whitespace-pre-wrap">{observaciones}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function EntrenamientoFichaImprimible({
  entrenamiento,
  tareaImagenSignedUrls,
}: {
  entrenamiento: LocalEntrenamiento;
  tareaImagenSignedUrls?: (string | null)[];
}) {
  const tareas = [
    {
      numero: 1,
      titulo: entrenamiento.tarea_1,
      imagenUrl: tareaImagenSignedUrls?.[0] ?? null,
      dimension: entrenamiento.tarea_1_dimension,
      series: entrenamiento.tarea_1_series,
      tiempo: entrenamiento.tarea_1_tiempo,
      minutos: entrenamiento.tarea_1_minutos,
      categoria: entrenamiento.tarea_1_categoria,
      objetivosDef: entrenamiento.tarea_1_objetivos_def,
      objetivosOfe: entrenamiento.tarea_1_objetivos_ofe,
      rotacion: entrenamiento.tarea_1_rotacion,
      reglasProvocacion: entrenamiento.tarea_1_reglas_provocacion,
      observaciones: entrenamiento.tarea_1_observaciones,
    },
    {
      numero: 2,
      titulo: entrenamiento.tarea_2,
      imagenUrl: tareaImagenSignedUrls?.[1] ?? null,
      dimension: entrenamiento.tarea_2_dimension,
      series: entrenamiento.tarea_2_series,
      tiempo: entrenamiento.tarea_2_tiempo,
      minutos: entrenamiento.tarea_2_minutos,
      categoria: entrenamiento.tarea_2_categoria,
      objetivosDef: entrenamiento.tarea_2_objetivos_def,
      objetivosOfe: entrenamiento.tarea_2_objetivos_ofe,
      rotacion: entrenamiento.tarea_2_rotacion,
      reglasProvocacion: entrenamiento.tarea_2_reglas_provocacion,
      observaciones: entrenamiento.tarea_2_observaciones,
    },
    {
      numero: 3,
      titulo: entrenamiento.tarea_3,
      imagenUrl: tareaImagenSignedUrls?.[2] ?? null,
      dimension: entrenamiento.tarea_3_dimension,
      series: entrenamiento.tarea_3_series,
      tiempo: entrenamiento.tarea_3_tiempo,
      minutos: entrenamiento.tarea_3_minutos,
      categoria: entrenamiento.tarea_3_categoria,
      objetivosDef: entrenamiento.tarea_3_objetivos_def,
      objetivosOfe: entrenamiento.tarea_3_objetivos_ofe,
      rotacion: entrenamiento.tarea_3_rotacion,
      reglasProvocacion: entrenamiento.tarea_3_reglas_provocacion,
      observaciones: entrenamiento.tarea_3_observaciones,
    },
    {
      numero: 4,
      titulo: entrenamiento.tarea_4,
      imagenUrl: tareaImagenSignedUrls?.[3] ?? null,
      dimension: entrenamiento.tarea_4_dimension,
      series: entrenamiento.tarea_4_series,
      tiempo: entrenamiento.tarea_4_tiempo,
      minutos: entrenamiento.tarea_4_minutos,
      categoria: entrenamiento.tarea_4_categoria,
      objetivosDef: entrenamiento.tarea_4_objetivos_def,
      objetivosOfe: entrenamiento.tarea_4_objetivos_ofe,
      rotacion: entrenamiento.tarea_4_rotacion,
      reglasProvocacion: entrenamiento.tarea_4_reglas_provocacion,
      observaciones: entrenamiento.tarea_4_observaciones,
    },
  ];

  return (
    <div className="space-y-3">
      <PdfWatermark />
      <div className="flex items-center justify-between print:hidden">
        <p className="text-xs text-muted-foreground">
          Ficha de la sesión, lista para descargar en PDF.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => window.print()}
        >
          <Printer className="size-4" />
          Descargar PDF
        </Button>
      </div>

      <div className="relative space-y-3 rounded-md border bg-card p-4 print:rounded-none print:border-none print:p-0">
        <div className="flex items-center justify-between gap-3 border-b pb-2">
          <div>
            <p className="font-heading text-lg tracking-wide">
              {clubConfig.nombreEquipo}
            </p>
            <p className="text-xs text-muted-foreground">
              Sesión de entrenamiento — {formatearFechaCorta(entrenamiento.fecha)}
            </p>
          </div>
          {entrenamiento.hora_inicio && (
            <p className="text-right text-xs text-muted-foreground">
              {entrenamiento.hora_inicio.slice(0, 5)}
              {entrenamiento.hora_fin && ` - ${entrenamiento.hora_fin.slice(0, 5)}`}
              {entrenamiento.lugar && (
                <>
                  <br />
                  {entrenamiento.lugar}
                </>
              )}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Dato etiqueta="Rival / Torneo" valor={entrenamiento.rival_torneo} />
          <Dato etiqueta="Microciclo" valor={entrenamiento.microciclo} />
          <Dato etiqueta="Bajas" valor={entrenamiento.bajas} />
        </div>

        <Dato etiqueta="Obj. semanal" valor={entrenamiento.objetivos} />
        <Dato etiqueta="Charla" valor={entrenamiento.charla} />

        {tareas.some(
          (t) =>
            t.titulo ||
            t.imagenUrl ||
            t.dimension ||
            t.objetivosDef ||
            t.objetivosOfe ||
            t.rotacion ||
            t.reglasProvocacion ||
            t.observaciones,
        ) && (
          <div className="space-y-2 pt-1">
            {tareas.map((t) => (
              <BloqueTarea key={t.numero} {...t} />
            ))}
          </div>
        )}

        <Dato etiqueta="Material" valor={entrenamiento.material} />
        <Dato etiqueta="Notas" valor={entrenamiento.notas} />
      </div>
    </div>
  );
}
