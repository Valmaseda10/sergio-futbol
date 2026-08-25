"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { AlineacionCampo } from "@/components/partidos/alineacion-campo";

export default function AlineacionPage() {
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
  const alineaciones = useLiveQuery(
    () =>
      localDb.alineaciones
        .where("partido_id")
        .equals(id)
        .filter((a) => a.titular)
        .toArray(),
    [id],
  );

  const convocados = useMemo(() => {
    const jugadoresPorId = new Map((jugadores ?? []).map((j) => [j.id, j]));
    return (convocatorias ?? [])
      .map((c) => jugadoresPorId.get(c.jugador_id))
      .filter((j): j is NonNullable<typeof j> => !!j)
      .map(({ foto_url, ...j }) => ({ ...j, foto_url }));
  }, [convocatorias, jugadores]);

  const titularesIniciales = useMemo(
    () =>
      (alineaciones ?? []).map((a) => ({
        jugadorId: a.jugador_id,
        posicion: a.posicion_jugada ?? "",
        posX: a.pos_x ?? undefined,
        posY: a.pos_y ?? undefined,
      })),
    [alineaciones],
  );

  // Las tres consultas (convocatorias, jugadores, alineaciones) resuelven de
  // forma asíncrona e independiente: si AlineacionCampo montara antes de que
  // "alineaciones" cargue, fijaría su estado inicial vacío y ya no se
  // actualizaría al llegar los titulares guardados (useState solo lee su
  // inicializador una vez). Por eso se espera a que las tres estén listas.
  if (
    partido === undefined ||
    convocatorias === undefined ||
    jugadores === undefined ||
    alineaciones === undefined
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
      <h1 className="text-2xl font-semibold">Alineación vs {partido.rival}</h1>

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
        <AlineacionCampo
          partidoId={id}
          convocados={convocados}
          titularesIniciales={titularesIniciales}
        />
      )}
    </div>
  );
}
