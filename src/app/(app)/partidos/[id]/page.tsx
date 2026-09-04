"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Pencil,
  Users,
  LayoutGrid,
  ArrowLeftRight,
  ListOrdered,
  Star,
  MapPin,
  Clock,
  ChevronRight,
  Video,
  PlayCircle,
} from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { capitalizarPrimera } from "@/lib/date";
import { resultadoPartido } from "@/lib/estadisticas";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EliminarPartidoButton } from "@/components/partidos/eliminar-partido-button";
import { ResumenGoles } from "@/components/partidos/resumen-goles";
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

const COMPETICION_LABEL: Record<string, string> = {
  liga: "Liga",
  amistoso: "Amistoso",
  copa: "Copa",
};

const RESULTADO_CLASSNAME = {
  ganado: "text-pitch",
  empatado: "text-gold",
  perdido: "text-destructive",
} as const;

const COMPETICION_CLASSNAME: Record<string, string> = {
  liga: "border-transparent bg-primary text-primary-foreground",
  copa: "border-transparent bg-gold text-gold-foreground",
  amistoso: "",
};

export default function FichaPartidoPage() {
  const { id } = useParams<{ id: string }>();

  const partido = useLiveQuery(
    async () => (await localDb.partidos.get(id)) ?? null,
    [id],
  );
  const rivalScouting = useLiveQuery(
    async () =>
      partido?.rival_scouting_id
        ? ((await localDb.rivales_scouting.get(partido.rival_scouting_id)) ?? null)
        : null,
    [partido?.rival_scouting_id],
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
  const cambiosCount = useLiveQuery(
    () =>
      localDb.eventos_partido
        .where("partido_id")
        .equals(id)
        .filter((e) => e.tipo === "cambio_sale")
        .count(),
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
  const videosCount = useLiveQuery(
    () => localDb.videos.where("partido_id").equals(id).count(),
    [id],
    0,
  );
  const [fotoRivalSignedUrl, setFotoRivalSignedUrl] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!partido?.foto_rival_url || !navigator.onLine) return;
    const supabase = createClient();
    supabase.storage
      .from("adjuntos")
      .createSignedUrl(partido.foto_rival_url, 3600)
      .then(({ data }) => setFotoRivalSignedUrl(data?.signedUrl ?? null));
  }, [partido?.foto_rival_url]);

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
      href: `/partidos/${id}/cambios`,
      icon: ArrowLeftRight,
      label: "Cambios",
      estado: `${cambiosCount} cambios`,
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
    {
      href: `/partidos/${id}/videos`,
      icon: Video,
      label: "Vídeos",
      estado: `${videosCount} vídeos`,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <FechaTile fecha={partido.fecha} />
        {fotoRivalSignedUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fotoRivalSignedUrl}
            alt={partido.rival}
            className="size-10 shrink-0 rounded-full border object-cover"
          />
        )}
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
          <Badge
            variant="secondary"
            className={cn("mt-1", COMPETICION_CLASSNAME[partido.competicion])}
          >
            {COMPETICION_LABEL[partido.competicion]}
          </Badge>
        </div>
        {tieneResultado && (
          <span
            className={cn(
              "font-heading text-3xl tabular-nums",
              RESULTADO_CLASSNAME[
                resultadoPartido(
                  partido.resultado_favor!,
                  partido.resultado_contra!,
                )
              ],
            )}
          >
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

      {rivalScouting && (
        <Link
          href={`/rivales/${rivalScouting.id}`}
          className="block rounded-md border p-3 hover:bg-muted/50"
        >
          <p className="text-xs font-medium text-muted-foreground">
            Scouting del rival
          </p>
          {rivalScouting.sistema_juego && (
            <p className="mt-1 line-clamp-2 text-sm">
              {rivalScouting.sistema_juego}
            </p>
          )}
          <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary">
            Ver ficha completa
            <ChevronRight className="size-3" />
          </span>
        </Link>
      )}

      <Button
        className="w-full"
        nativeButton={false}
        render={<Link href={`/partidos/${id}/dia`} />}
      >
        <PlayCircle className="size-4" />
        Modo día de partido
      </Button>

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

      <ResumenGoles partidoId={id} />

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
