"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { EventosList } from "@/components/partidos/eventos-list";

export default function EventosPage() {
  const { id } = useParams<{ id: string }>();

  const partido = useLiveQuery(
    async () => (await localDb.partidos.get(id)) ?? null,
    [id],
  );
  const convocatorias = useLiveQuery(
    () =>
      localDb.convocatorias
        .where("partido_id")
        .equals(id)
        .filter((c) => c.convocado)
        .toArray(),
    [id],
    [],
  );
  const jugadores = useLiveQuery(() => localDb.jugadores.toArray(), [], []);

  const convocados = useMemo(() => {
    const jugadoresPorId = new Map(jugadores.map((j) => [j.id, j]));
    return convocatorias
      .map((c) => jugadoresPorId.get(c.jugador_id))
      .filter((j): j is NonNullable<typeof j> => !!j)
      .map((j) => ({
        id: j.id,
        nombre: j.nombre,
        apellidos: j.apellidos,
        alias: j.alias,
        dorsal: j.dorsal,
      }));
  }, [convocatorias, jugadores]);

  if (partido === undefined) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  if (partido === null) {
    return <p className="text-sm text-muted-foreground">Partido no encontrado.</p>;
  }

  return (
    <div className="space-y-4">
      <Link
        href={`/partidos/${id}`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver al partido
      </Link>
      <h1 className="text-2xl font-semibold">Eventos vs {partido.rival}</h1>

      {convocados.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Todavía no hay convocatoria.{" "}
          <Link
            href={`/partidos/${id}/convocatoria`}
            className="font-medium underline"
          >
            Convoca a los jugadores primero
          </Link>
          .
        </p>
      ) : (
        <EventosList partidoId={id} convocados={convocados} />
      )}
    </div>
  );
}
