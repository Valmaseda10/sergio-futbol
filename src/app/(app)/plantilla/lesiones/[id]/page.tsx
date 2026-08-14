"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, Pencil } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EliminarLesionButton } from "@/components/plantilla/eliminar-lesion-button";
import { SesionesReadaptacion } from "@/components/plantilla/sesiones-readaptacion";

function formatearFecha(fecha: string | null) {
  if (!fecha) return "—";
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function diasDeBaja(fechaInicio: string, fechaAltaReal: string | null) {
  const inicio = new Date(`${fechaInicio}T00:00:00`);
  const fin = fechaAltaReal ? new Date(`${fechaAltaReal}T00:00:00`) : new Date();
  const ms = fin.getTime() - inicio.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export default function FichaLesionPage() {
  const { id } = useParams<{ id: string }>();

  const lesion = useLiveQuery(
    async () => (await localDb.lesiones.get(id)) ?? null,
    [id],
  );
  const jugador = useLiveQuery(
    async () =>
      lesion ? ((await localDb.jugadores.get(lesion.jugador_id)) ?? null) : null,
    [lesion],
  );
  const sesionesCount = useLiveQuery(
    () =>
      localDb.lesion_sesiones_readaptacion.where("lesion_id").equals(id).count(),
    [id],
    0,
  );

  if (lesion === undefined) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  if (lesion === null) {
    return <p className="text-sm text-muted-foreground">Lesión no encontrada.</p>;
  }

  const activa = !lesion.fecha_alta_real;

  return (
    <div className="space-y-4">
      <Link
        href="/plantilla/lesiones"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver a lesiones
      </Link>

      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold">
            {jugador ? `${jugador.nombre} ${jugador.apellidos}` : "—"}
          </h1>
          <p className="text-sm text-muted-foreground">{lesion.tipo}</p>
        </div>
        <Badge variant={activa ? "destructive" : "outline"}>
          {activa ? "Activa" : "Recuperado"}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={
            <Link href={`/plantilla/lesiones/${lesion.id}/editar`} aria-label="Editar" />
          }
        >
          <Pencil className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="font-heading text-3xl tabular-nums text-destructive">
              {diasDeBaja(lesion.fecha_inicio, lesion.fecha_alta_real)}
            </p>
            <p className="text-xs text-muted-foreground">
              {activa ? "Días de baja (en curso)" : "Días de baja"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="font-heading text-3xl tabular-nums text-pitch">
              {sesionesCount}
            </p>
            <p className="text-xs text-muted-foreground">
              {sesionesCount > 0 ? "Sesiones de readaptación" : "Sin readaptación"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalle</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Fecha de inicio</p>
            <p>{formatearFecha(lesion.fecha_inicio)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Alta prevista</p>
            <p>{formatearFecha(lesion.fecha_prevista_alta)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Alta real (100%)</p>
            <p>{formatearFecha(lesion.fecha_alta_real)}</p>
          </div>
          {lesion.mecanismo && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Cómo se ha lesionado</p>
              <p className="whitespace-pre-wrap">{lesion.mecanismo}</p>
            </div>
          )}
          {lesion.notas && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Notas</p>
              <p className="whitespace-pre-wrap">{lesion.notas}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <SesionesReadaptacion lesionId={lesion.id} />
        </CardContent>
      </Card>

      <EliminarLesionButton id={lesion.id} />
    </div>
  );
}
