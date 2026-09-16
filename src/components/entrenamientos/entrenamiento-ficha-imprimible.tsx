"use client";

// Ficha de sesión al estilo de la plantilla que se usaba en PowerPoint
// (cabecera con celdas, tareas en tabla con D/E/T, imagen + rotación a un
// lado, reglas de provocación y observaciones abajo), pensada para
// imprimir/exportar a PDF con window.print() (el mismo mecanismo que ya usa
// el informe de scouting de rivales) — así no hace falta ninguna licencia de
// PowerPoint para seguir generando la hoja de cada entrenamiento.

import { Printer } from "lucide-react";
import { clubConfig } from "@/lib/club-config";
import { capitalizarPrimera } from "@/lib/date";
import { CATEGORIA_TAREA_LABEL } from "@/lib/validations/categoria-tarea";
import type { LocalEntrenamiento } from "@/lib/db/local-db";
import { Button } from "@/components/ui/button";
import { PdfWatermark } from "@/components/branding/pdf-watermark";

function formatearFechaCorta(fecha: string) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function nombreDia(fecha: string) {
  return capitalizarPrimera(
    new Date(`${fecha}T00:00:00`).toLocaleDateString("es-ES", {
      weekday: "long",
    }),
  );
}

// Celda de cabecera al estilo de la tabla FECHA SESIÓN / RIVAL / MICROCICLO
// de la plantilla: etiqueta sombreada arriba, valor debajo.
function CampoCelda({
  etiqueta,
  valor,
  className = "",
}: {
  etiqueta: string;
  valor: string | null;
  className?: string;
}) {
  return (
    <div className={`border-border p-2 ${className}`}>
      <p className="text-[9px] font-semibold tracking-wide text-muted-foreground uppercase">
        {etiqueta}
      </p>
      <p className="text-xs whitespace-pre-wrap">{valor}</p>
    </div>
  );
}

// Cabecera de sección con fondo, igual que "OBJETIVOS" / "ROTACIÓN" /
// "REGLAS DE PROVOCACIÓN" en la plantilla.
function TituloSeccion({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-b border-border bg-muted/70 px-2 py-0.5 text-center text-[9px] font-semibold tracking-wide text-muted-foreground uppercase">
      {children}
    </p>
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
    <div className="break-inside-avoid border-t border-border first:border-t-0">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-primary px-2 py-1 text-primary-foreground">
        <p className="text-xs font-semibold tracking-wide uppercase">
          Tarea {numero}
          {titulo ? ` · ${titulo}` : ""}
        </p>
        <div className="flex items-center gap-2 text-[10px]">
          {categoria && (
            <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 font-medium">
              {CATEGORIA_TAREA_LABEL[
                categoria as keyof typeof CATEGORIA_TAREA_LABEL
              ] ?? categoria}
            </span>
          )}
          {minutos != null && <span>{minutos}&prime; en total</span>}
        </div>
      </div>

      {(dimension || series || tiempo) && (
        <div className="grid grid-cols-3 divide-x divide-border border-b border-border text-xs">
          <div className="flex items-baseline gap-1 p-1.5">
            <span className="font-semibold">D</span>
            <span className="whitespace-pre-wrap">{dimension}</span>
          </div>
          <div className="flex items-baseline gap-1 p-1.5">
            <span className="font-semibold">E</span>
            <span className="whitespace-pre-wrap">{series}</span>
          </div>
          <div className="flex items-baseline gap-1 p-1.5">
            <span className="font-semibold">T</span>
            <span className="whitespace-pre-wrap">{tiempo}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 divide-border border-b border-border sm:grid-cols-[1fr_180px] sm:divide-x print:grid-cols-[1fr_180px] print:divide-x">
        <div>
          {(objetivosDef || objetivosOfe) && (
            <>
              <TituloSeccion>Objetivos</TituloSeccion>
              <div className="grid grid-cols-2 divide-x divide-border">
                <div className="p-2">
                  <p className="text-[9px] font-semibold text-muted-foreground uppercase underline underline-offset-2">
                    Ítems fase DEF
                  </p>
                  <p className="text-xs whitespace-pre-wrap">{objetivosDef}</p>
                </div>
                <div className="p-2">
                  <p className="text-[9px] font-semibold text-muted-foreground uppercase underline underline-offset-2">
                    Ítems fase OFE
                  </p>
                  <p className="text-xs whitespace-pre-wrap">{objetivosOfe}</p>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="flex flex-col border-t border-border sm:border-t-0 print:border-t-0">
          {imagenUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imagenUrl}
              alt={`Diagrama de la tarea ${numero}`}
              className="aspect-[4/3] w-full border-b border-border object-cover"
            />
          )}
          {rotacion && (
            <div className="flex-1">
              <TituloSeccion>Rotación</TituloSeccion>
              <p className="p-2 text-[11px] whitespace-pre-wrap">{rotacion}</p>
            </div>
          )}
        </div>
      </div>

      {(reglasProvocacion || observaciones) && (
        <div className="grid grid-cols-1 divide-border sm:grid-cols-2 sm:divide-x print:grid-cols-2 print:divide-x">
          <div className="border-t border-border sm:border-t-0 print:border-t-0">
            <TituloSeccion>Reglas de provocación</TituloSeccion>
            <p className="p-2 text-xs whitespace-pre-wrap">{reglasProvocacion}</p>
          </div>
          <div className="border-t border-border">
            <TituloSeccion>Observaciones</TituloSeccion>
            <p className="p-2 text-xs whitespace-pre-wrap">{observaciones}</p>
          </div>
        </div>
      )}
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

      <div className="relative overflow-hidden rounded-md border border-border bg-card print:rounded-none print:border-none">
        <div className="flex items-center justify-between gap-3 bg-primary px-3 py-1.5 text-primary-foreground">
          <p className="font-heading text-sm tracking-wide uppercase">
            {clubConfig.nombreEquipo} — Sesión de entrenamiento
          </p>
          {entrenamiento.hora_inicio && (
            <p className="text-right text-[10px]">
              {entrenamiento.hora_inicio.slice(0, 5)}
              {entrenamiento.hora_fin && ` - ${entrenamiento.hora_fin.slice(0, 5)}`}
              {entrenamiento.lugar && ` · ${entrenamiento.lugar}`}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-border border-b border-border sm:grid-cols-4 sm:divide-y-0 print:grid-cols-4 print:divide-y-0">
          <CampoCelda
            etiqueta="Fecha sesión"
            valor={formatearFechaCorta(entrenamiento.fecha)}
          />
          <CampoCelda etiqueta="Día" valor={nombreDia(entrenamiento.fecha)} />
          <CampoCelda etiqueta="Rival / Torneo" valor={entrenamiento.rival_torneo} />
          <CampoCelda etiqueta="Microciclo" valor={entrenamiento.microciclo} />
        </div>
        <CampoCelda
          etiqueta="Bajas"
          valor={entrenamiento.bajas}
          className="border-b border-border"
        />
        <CampoCelda
          etiqueta="Obj. semanal"
          valor={entrenamiento.objetivos}
          className="border-b border-border"
        />

        {entrenamiento.charla && (
          <div className="border-b border-border">
            <TituloSeccion>Charla</TituloSeccion>
            <p className="p-2 text-xs whitespace-pre-wrap">{entrenamiento.charla}</p>
          </div>
        )}

        {tareas.map((t) => (
          <BloqueTarea key={t.numero} {...t} />
        ))}

        {entrenamiento.material && (
          <div className="border-t border-border">
            <TituloSeccion>Material</TituloSeccion>
            <p className="p-2 text-xs whitespace-pre-wrap">{entrenamiento.material}</p>
          </div>
        )}
        {entrenamiento.notas && (
          <div className="border-t border-border">
            <TituloSeccion>Notas</TituloSeccion>
            <p className="p-2 text-xs whitespace-pre-wrap">{entrenamiento.notas}</p>
          </div>
        )}
      </div>
    </div>
  );
}
