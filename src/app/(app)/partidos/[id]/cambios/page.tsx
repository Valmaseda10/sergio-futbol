"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { CambiosList } from "@/components/partidos/cambios-list";

export default function CambiosPage() {
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
  );
  const jugadores = useLiveQuery(() => localDb.jugadores.toArray(), []);
  const titularesIniciales = useLiveQuery(
    () =>
      localDb.alineaciones
        .where("partido_id")
        .equals(id)
        .filter((a) => a.titular)
        .toArray(),
    [id],
  );
  const eventos = useLiveQuery(
    () => localDb.eventos_partido.where("partido_id").equals(id).toArray(),
    [id],
  );

  const convocados = useMemo(() => {
    const jugadoresPorId = new Map((jugadores ?? []).map((j) => [j.id, j]));
    return (convocatorias ?? [])
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

  if (
    partido === undefined ||
    convocatorias === undefined ||
    jugadores === undefined ||
    titularesIniciales === undefined ||
    eventos === undefined
  ) {
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
      <h1 className="text-2xl font-semibold">Cambios vs {partido.rival}</h1>

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
      ) : titularesIniciales.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Todavía no hay once inicial.{" "}
          <Link
            href={`/partidos/${id}/alineacion`}
            className="font-medium underline"
          >
            Define la alineación primero
          </Link>
          .
        </p>
      ) : (
        <CambiosList
          partidoId={id}
          convocados={convocados}
          titularesIniciales={titularesIniciales}
          eventos={eventos}
        />
      )}
    </div>
  );
}
