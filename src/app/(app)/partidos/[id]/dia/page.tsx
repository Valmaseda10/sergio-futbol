"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, Users, LayoutGrid, ListOrdered } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { calcularOnceFinal } from "@/lib/alineacion-final";
import {
  guardarAlineacionLocal,
  guardarAlineacionFinalLocal,
} from "@/app/(app)/partidos/local-actions";
import { cn } from "@/lib/utils";
import { ConvocatoriaList } from "@/components/partidos/convocatoria-list";
import { AlineacionCampo } from "@/components/partidos/alineacion-campo";
import { EventosList } from "@/components/partidos/eventos-list";

const VISTAS = [
  { value: "convocatoria", label: "Convocatoria", icon: Users },
  { value: "alineacion", label: "Alineación", icon: LayoutGrid },
  { value: "eventos", label: "Eventos", icon: ListOrdered },
] as const;

type Vista = (typeof VISTAS)[number]["value"];

export default function DiaPartidoPage() {
  const { id } = useParams<{ id: string }>();
  const [vista, setVista] = useState<Vista>("convocatoria");

  const partido = useLiveQuery(
    async () => (await localDb.partidos.get(id)) ?? null,
    [id],
  );
  const jugadoresActivos = useLiveQuery(
    () =>
      localDb.jugadores
        .filter((j) => j.activo)
        .toArray()
        .then((rows) =>
          rows.sort((a, b) => {
            if (a.dorsal == null && b.dorsal != null) return 1;
            if (a.dorsal != null && b.dorsal == null) return -1;
            if (a.dorsal != null && b.dorsal != null && a.dorsal !== b.dorsal) {
              return a.dorsal - b.dorsal;
            }
            return a.apellidos.localeCompare(b.apellidos);
          }),
        ),
    [],
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

  const jugadoresParaConvocatoria = useMemo(
    () => (jugadoresActivos ?? []).map(({ foto_url, ...j }) => ({ ...j, foto_url })),
    [jugadoresActivos],
  );

  const convocados = useMemo(() => {
    const jugadoresPorId = new Map((jugadoresActivos ?? []).map((j) => [j.id, j]));
    return (convocatorias ?? [])
      .map((c) => jugadoresPorId.get(c.jugador_id))
      .filter((j): j is NonNullable<typeof j> => !!j)
      .map(({ foto_url, ...j }) => ({ ...j, foto_url }));
  }, [convocatorias, jugadoresActivos]);

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
    jugadoresActivos === undefined ||
    convocatorias === undefined ||
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
      <h1 className="text-2xl font-semibold">Día de partido vs {partido.rival}</h1>

      <div className="grid grid-cols-3 gap-2">
        {VISTAS.map((v) => (
          <button
            key={v.value}
            type="button"
            onClick={() => setVista(v.value)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-md border py-2 text-xs font-medium",
              vista === v.value
                ? "border-primary bg-primary/10 text-primary"
                : "text-muted-foreground",
            )}
          >
            <v.icon className="size-4" />
            {v.label}
          </button>
        ))}
      </div>

      {/* Las tres vistas se mantienen siempre montadas (solo se ocultan con
          CSS) para no perder ediciones sin guardar —como fichas movidas en
          el campo o un evento a medio rellenar— al cambiar de pestaña
          durante el partido. */}
      <div className={cn(vista !== "convocatoria" && "hidden")}>
        <ConvocatoriaList
          partidoId={id}
          partido={{
            rival: partido.rival,
            fecha: partido.fecha,
            hora: partido.hora,
            lugar: partido.lugar,
          }}
          jugadores={jugadoresParaConvocatoria}
        />
      </div>

      <div className={cn(vista !== "alineacion" && "hidden")}>
        {convocados.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Todavía no hay convocatoria. Convócalos en la pestaña de arriba
            primero.
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

      <div className={cn(vista !== "eventos" && "hidden")}>
        {convocados.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Todavía no hay convocatoria. Convócalos en la pestaña de arriba
            primero.
          </p>
        ) : (
          <EventosList partidoId={id} convocados={convocados} />
        )}
      </div>
    </div>
  );
}
