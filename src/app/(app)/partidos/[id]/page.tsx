"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Pencil,
  Users,
  LayoutGrid,
  ListOrdered,
  Star,
  MapPin,
  Clock,
  ChevronRight,
} from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { capitalizarPrimera } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EliminarPartidoButton } from "@/components/partidos/eliminar-partido-button";

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

const COMPETICION_LABEL: Record<string, string> = {
  liga: "Liga",
  amistoso: "Amistoso",
  copa: "Copa",
};

export default function FichaPartidoPage() {
  const { id } = useParams<{ id: string }>();

  const partido = useLiveQuery(
    async () => (await localDb.partidos.get(id)) ?? null,
    [id],
  );
  const convocadosCount = useLiveQuery(
    () => localDb.convocatorias.where("partido_id").equals(id).count(),
    [id],
    0,
  );
  const titularesCount = useLiveQuery(
    () =>
      localDb.alineaciones
        .where("partido_id")
        .equals(id)
        .filter((a) => a.titular)
        .count(),
    [id],
    0,
  );
  const eventosCount = useLiveQuery(
    () => localDb.eventos_partido.where("partido_id").equals(id).count(),
    [id],
    0,
  );
  const tieneValoracion = useLiveQuery(
    () =>
      localDb.valoraciones_partido
        .where("partido_id")
        .equals(id)
        .count()
        .then((n) => n > 0),
    [id],
    false,
  );

  if (partido === undefined) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  if (partido === null) {
    return <p className="text-sm text-muted-foreground">Partido no encontrado.</p>;
  }

  const tieneResultado =
    partido.resultado_favor != null && partido.resultado_contra != null;

  const secciones = [
    {
      href: `/partidos/${id}/convocatoria`,
      icon: Users,
      label: "Convocatoria",
      estado: `${convocadosCount} convocados`,
    },
    {
      href: `/partidos/${id}/alineacion`,
      icon: LayoutGrid,
      label: "Alineación",
      estado: titularesCount > 0 ? "Definida" : "Sin definir",
    },
    {
      href: `/partidos/${id}/eventos`,
      icon: ListOrdered,
      label: "Eventos",
      estado: `${eventosCount} registrados`,
    },
    {
      href: `/partidos/${id}/valoracion`,
      icon: Star,
      label: "Valoración",
      estado: tieneValoracion ? "Completada" : "Sin valorar",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold">
            {partido.local_visitante === "local" ? "vs" : "@"} {partido.rival}
          </h1>
          <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
            <span>{formatearFecha(partido.fecha)}</span>
            {partido.hora && (
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                {partido.hora.slice(0, 5)}
              </span>
            )}
            {partido.lugar && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                {partido.lugar}
              </span>
            )}
          </p>
          <Badge variant="secondary" className="mt-1">
            {COMPETICION_LABEL[partido.competicion]}
          </Badge>
        </div>
        {tieneResultado && (
          <span className="text-2xl font-bold">
            {partido.resultado_favor} - {partido.resultado_contra}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={<Link href={`/partidos/${id}/editar`} aria-label="Editar" />}
        >
          <Pencil className="size-4" />
        </Button>
      </div>

      <ul className="divide-y rounded-md border">
        {secciones.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="flex items-center gap-3 p-3 hover:bg-muted/50"
            >
              <s.icon className="size-4 text-muted-foreground" />
              <span className="min-w-0 flex-1 text-sm font-medium">
                {s.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {s.estado}
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>

      {partido.notas && (
        <Card>
          <CardContent className="pt-6 text-sm whitespace-pre-wrap">
            {partido.notas}
          </CardContent>
        </Card>
      )}

      <EliminarPartidoButton id={partido.id} />
    </div>
  );
}
