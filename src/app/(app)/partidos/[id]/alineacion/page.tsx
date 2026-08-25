"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { calcularOnceFinal } from "@/lib/alineacion-final";
import {
  guardarAlineacionLocal,
  guardarAlineacionFinalLocal,
} from "@/app/(app)/partidos/local-actions";
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
  const alineacionesFinales = useLiveQuery(
    () =>
      localDb.alineaciones_finales
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

  // Si ya se guardó una vez el once final a mano, se parte de eso. Si no,
  // se calcula solo a partir del once inicial y los cambios de Eventos, como
  // punto de partida cómodo que el entrenador puede corregir y guardar.
  const titularesFinales = useMemo(() => {
    if (alineacionesFinales && alineacionesFinales.length > 0) {
      return alineacionesFinales.map((a) => ({
        jugadorId: a.jugador_id,
        posicion: a.posicion_jugada ?? "",
        posX: a.pos_x ?? undefined,
        posY: a.pos_y ?? undefined,
      }));
    }
    const { titulares } = calcularOnceFinal(alineaciones ?? [], eventos ?? []);
    return titulares.map((t) => ({
      jugadorId: t.jugadorId,
      posicion: t.posicion ?? "",
      posX: t.posX ?? undefined,
      posY: t.posY ?? undefined,
    }));
  }, [alineacionesFinales, alineaciones, eventos]);

  // Las consultas resuelven de forma asíncrona e independiente: si
  // AlineacionCampo montara antes de que sus datos cargaran, fijaría su
  // estado inicial vacío y ya no se actualizaría al llegar los titulares
  // guardados (useState solo lee su inicializador una vez). Por eso se
  // espera a que todas estén listas.
  if (
    partido === undefined ||
    convocatorias === undefined ||
    jugadores === undefined ||
    alineaciones === undefined ||
    alineacionesFinales === undefined ||
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
        <div className="grid gap-8 sm:grid-cols-2">
          <AlineacionCampo
            titulo="Once inicial"
            convocados={convocados}
            titularesIniciales={titularesIniciales}
            onGuardar={(titulares, suplentesIds) =>
              guardarAlineacionLocal(id, titulares, suplentesIds)
            }
          />
          <AlineacionCampo
            titulo="Once que termina"
            convocados={convocados}
            titularesIniciales={titularesFinales}
            onGuardar={(titulares, suplentesIds) =>
              guardarAlineacionFinalLocal(id, titulares, suplentesIds)
            }
          />
        </div>
      )}
    </div>
  );
}
