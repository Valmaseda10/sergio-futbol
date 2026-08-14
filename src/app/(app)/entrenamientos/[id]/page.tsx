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
import { localDb } from "@/lib/db/local-db";
import { capitalizarPrimera } from "@/lib/date";
import { createClient } from "@/lib/supabase/client";
import { esPdf } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EliminarEntrenamientoButton } from "@/components/entrenamientos/eliminar-entrenamiento-button";
import { AsistenciaResumen } from "@/components/entrenamientos/asistencia-resumen";
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
  const [documentoSignedUrl, setDocumentoSignedUrl] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!entrenamiento?.documento_url || !navigator.onLine) return;
    const supabase = createClient();
    supabase.storage
      .from("adjuntos")
      .createSignedUrl(entrenamiento.documento_url, 3600)
      .then(({ data }) => setDocumentoSignedUrl(data?.signedUrl ?? null));
  }, [entrenamiento?.documento_url]);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
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
        className="w-full"
        nativeButton={false}
        render={
          <Link href={`/entrenamientos/${entrenamiento.id}/asistencia`} />
        }
      >
        <ClipboardList className="size-4" />
        Pasar lista
      </Button>

      <AsistenciaResumen entrenamientoId={entrenamiento.id} />

      {entrenamiento.documento_url && documentoSignedUrl && (
        <Card>
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

      <Card>
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
          <div>
            <p className="text-muted-foreground">Ejercicios</p>
            <p className="whitespace-pre-wrap">
              {entrenamiento.ejercicios || "Sin definir todavía."}
            </p>
          </div>
          {entrenamiento.notas && (
            <div>
              <p className="text-muted-foreground">Notas</p>
              <p className="whitespace-pre-wrap">{entrenamiento.notas}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <EliminarEntrenamientoButton id={entrenamiento.id} />
    </div>
  );
}
