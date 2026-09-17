"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Pencil,
  ClipboardList,
  MapPin,
  Clock,
  FileText,
  ExternalLink,
} from "lucide-react";
import { localDb, type LocalEntrenamiento } from "@/lib/db/local-db";
import { capitalizarPrimera } from "@/lib/date";
import { createClient } from "@/lib/supabase/client";
import { esPdf } from "@/lib/storage";
import { CATEGORIA_TAREA_LABEL } from "@/lib/validations/categoria-tarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EliminarEntrenamientoButton } from "@/components/entrenamientos/eliminar-entrenamiento-button";
import { AsistenciaResumen } from "@/components/entrenamientos/asistencia-resumen";
import { EntrenamientoFichaImprimible } from "@/components/entrenamientos/entrenamiento-ficha-imprimible";
import { FechaTile } from "@/components/ui/fecha-tile";

function formatearFecha(fecha: string) {
  return capitalizarPrimera(
    new Date(`${fecha}T00:00:00`).toLocaleDateString("es-ES", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
  );
}

export default function FichaEntrenamientoPage() {
  const { id } = useParams<{ id: string }>();
  const entrenamiento = useLiveQuery(
    async () => (await localDb.entrenamientos.get(id)) ?? null,
    [id],
  );

  if (entrenamiento === undefined) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  if (entrenamiento === null) {
    return (
      <p className="text-sm text-muted-foreground">
        Entrenamiento no encontrado.
      </p>
    );
  }

  // La key fuerza a remontar este bloque al cambiar de entrenamiento: sin
  // ella, Next.js reutiliza el mismo componente al navegar de una sesión a
  // otra y las URLs firmadas (documento, imágenes de las tareas) de la
  // sesión anterior se quedaban viéndose hasta que llegaban las nuevas — o
  // para siempre si no había conexión.
  return <FichaEntrenamientoDetalle key={entrenamiento.id} entrenamiento={entrenamiento} />;
}

function FichaEntrenamientoDetalle({
  entrenamiento,
}: {
  entrenamiento: LocalEntrenamiento;
}) {
  const [documentoSignedUrl, setDocumentoSignedUrl] = useState<string | null>(
    null,
  );
  const [tareaImagenSignedUrls, setTareaImagenSignedUrls] = useState<
    (string | null)[]
  >([null, null, null, null]);

  useEffect(() => {
    if (!entrenamiento.documento_url || !navigator.onLine) return;
    const supabase = createClient();
    supabase.storage
      .from("adjuntos")
      .createSignedUrl(entrenamiento.documento_url, 3600)
      .then(({ data }) => setDocumentoSignedUrl(data?.signedUrl ?? null));
  }, [entrenamiento.documento_url]);

  useEffect(() => {
    if (!navigator.onLine) return;
    const paths = [
      entrenamiento.tarea_1_imagen_url,
      entrenamiento.tarea_2_imagen_url,
      entrenamiento.tarea_3_imagen_url,
      entrenamiento.tarea_4_imagen_url,
    ];
    const supabase = createClient();
    Promise.all(
      paths.map((path) =>
        path
          ? supabase.storage
              .from("adjuntos")
              .createSignedUrl(path, 3600)
              .then(({ data }) => data?.signedUrl ?? null)
          : Promise.resolve(null),
      ),
    ).then(setTareaImagenSignedUrls);
  }, [
    entrenamiento.tarea_1_imagen_url,
    entrenamiento.tarea_2_imagen_url,
    entrenamiento.tarea_3_imagen_url,
    entrenamiento.tarea_4_imagen_url,
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 print:hidden">
        <FechaTile fecha={entrenamiento.fecha} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold">
            {formatearFecha(entrenamiento.fecha)}
          </h1>
          <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
            {entrenamiento.hora_inicio && (
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                {entrenamiento.hora_inicio.slice(0, 5)}
                {entrenamiento.hora_fin &&
                  ` - ${entrenamiento.hora_fin.slice(0, 5)}`}
              </span>
            )}
            {entrenamiento.lugar && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                {entrenamiento.lugar}
              </span>
            )}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={
            <Link
              href={`/entrenamientos/${entrenamiento.id}/editar`}
              aria-label="Editar"
            />
          }
        >
          <Pencil className="size-4" />
        </Button>
      </div>

      <Button
        className="w-full print:hidden"
        nativeButton={false}
        render={
          <Link href={`/entrenamientos/${entrenamiento.id}/asistencia`} />
        }
      >
        <ClipboardList className="size-4" />
        Pasar lista
      </Button>

      <div className="print:hidden">
        <AsistenciaResumen entrenamientoId={entrenamiento.id} fecha={entrenamiento.fecha} />
      </div>

      <EntrenamientoFichaImprimible
        entrenamiento={entrenamiento}
        tareaImagenSignedUrls={tareaImagenSignedUrls}
      />

      {entrenamiento.documento_url && documentoSignedUrl && (
        <Card className="print:hidden">
          <CardContent className="pt-6">
            {esPdf(entrenamiento.documento_url) ? (
              <a
                href={documentoSignedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary underline underline-offset-4"
              >
                <FileText className="size-4" />
                Ver documento de la sesión
                <ExternalLink className="size-3.5" />
              </a>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={documentoSignedUrl}
                alt="Foto de la sesión"
                className="max-h-80 w-full rounded-md object-contain"
              />
            )}
          </CardContent>
        </Card>
      )}

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="text-base">Planificación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-muted-foreground">Objetivos</p>
            <p className="whitespace-pre-wrap">
              {entrenamiento.objetivos || "Sin definir todavía."}
            </p>
          </div>
          <div className="space-y-3">
            <p className="text-muted-foreground">Tareas</p>
            {[
              entrenamiento.tarea_1,
              entrenamiento.tarea_2,
              entrenamiento.tarea_3,
              entrenamiento.tarea_4,
            ].every((t) => !t) ? (
              <p className="whitespace-pre-wrap">Sin definir todavía.</p>
            ) : (
              <ol className="space-y-2">
                {[
                  {
                    tarea: entrenamiento.tarea_1,
                    minutos: entrenamiento.tarea_1_minutos,
                    categoria: entrenamiento.tarea_1_categoria,
                  },
                  {
                    tarea: entrenamiento.tarea_2,
                    minutos: entrenamiento.tarea_2_minutos,
                    categoria: entrenamiento.tarea_2_categoria,
                  },
                  {
                    tarea: entrenamiento.tarea_3,
                    minutos: entrenamiento.tarea_3_minutos,
                    categoria: entrenamiento.tarea_3_categoria,
                  },
                  {
                    tarea: entrenamiento.tarea_4,
                    minutos: entrenamiento.tarea_4_minutos,
                    categoria: entrenamiento.tarea_4_categoria,
                  },
                ].map(({ tarea, minutos, categoria }, i) =>
                  tarea ? (
                    <li key={i} className="rounded-md border p-2">
                      <p className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                        <span>
                          Tarea {i + 1}
                          {categoria && ` · ${CATEGORIA_TAREA_LABEL[categoria]}`}
                        </span>
                        {minutos != null && <span>{minutos} min</span>}
                      </p>
                      <p className="whitespace-pre-wrap">{tarea}</p>
                    </li>
                  ) : null,
                )}
              </ol>
            )}
          </div>
          {entrenamiento.notas && (
            <div>
              <p className="text-muted-foreground">Notas</p>
              <p className="whitespace-pre-wrap">{entrenamiento.notas}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="print:hidden">
        <EliminarEntrenamientoButton id={entrenamiento.id} />
      </div>
    </div>
  );
}
