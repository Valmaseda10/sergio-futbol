import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, ClipboardList, MapPin, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { capitalizarPrimera } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EliminarEntrenamientoButton } from "@/components/entrenamientos/eliminar-entrenamiento-button";

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

export default async function FichaEntrenamientoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: entrenamiento } = await supabase
    .from("entrenamientos")
    .select("*")
    .eq("id", id)
    .single();

  if (!entrenamiento) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
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
