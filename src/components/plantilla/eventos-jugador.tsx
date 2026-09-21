"use client";

// Partidos en los que este jugador ha tenido algún evento individual
// tagueado (gol, asistencia, tarjeta...), para poder repasarlo con él en
// una charla y, si algo se apuntó mal, ir directamente a ese partido a
// corregirlo — no se edita aquí, se enlaza al apartado Eventos del partido.

import { useMemo } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb, type LocalPartido } from "@/lib/db/local-db";
import { TIPO_GOL_LABEL, TIPO_ABP_LABEL } from "@/lib/validations/gol";
import type { TipoEventoPartido } from "@/lib/types/database.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TIPO_LABEL: Partial<Record<TipoEventoPartido, string>> = {
  gol: "Gol",
  asistencia: "Asistencia",
  tarjeta_amarilla: "Tarjeta amarilla",
  tarjeta_roja: "Tarjeta roja",
  autogol: "Autogol",
};

function formatearFechaCorta(fecha: string) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function EventosJugador({ jugadorId }: { jugadorId: string }) {
  const eventos = useLiveQuery(
    () =>
      localDb.eventos_partido
        .where("jugador_id")
        .equals(jugadorId)
        .filter((e) => e.tipo in TIPO_LABEL)
        .toArray(),
    [jugadorId],
    [],
  );
  const partidos = useLiveQuery(() => localDb.partidos.toArray(), [], []);
  const partidosPorId = useMemo(
    () => new Map(partidos.map((p) => [p.id, p])),
    [partidos],
  );

  const filas = useMemo(() => {
    return eventos
      .map((e) => ({ evento: e, partido: partidosPorId.get(e.partido_id) ?? null }))
      .filter((f): f is typeof f & { partido: LocalPartido } => f.partido !== null)
      .sort((a, b) => b.partido.fecha.localeCompare(a.partido.fecha));
  }, [eventos, partidosPorId]);

  if (filas.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Eventos en partidos</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y">
          {filas.map(({ evento, partido }) => (
            <li key={evento.id}>
              <Link
                href={`/partidos/${partido.id}/eventos`}
                className="flex items-center gap-3 p-3 text-sm hover:bg-muted/50"
              >
                <span className="w-24 shrink-0 text-xs text-muted-foreground">
                  {formatearFechaCorta(partido.fecha)}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{TIPO_LABEL[evento.tipo]}</span>
                  {" vs "}
                  {partido.rival}
                  {evento.tipo_gol && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {TIPO_GOL_LABEL[evento.tipo_gol]}
                      {evento.abp_tipo && ` (${TIPO_ABP_LABEL[evento.abp_tipo]})`}
                    </span>
                  )}
                  {evento.notas && (
                    <span className="text-muted-foreground italic">
                      {" "}
                      · {evento.notas}
                    </span>
                  )}
                </span>
                {evento.minuto != null && (
                  <span className="shrink-0 font-heading tabular-nums text-muted-foreground">
                    {evento.minuto}&apos;
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
