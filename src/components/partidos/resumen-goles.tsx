"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/local-db";
import { Card, CardContent } from "@/components/ui/card";
import { TIPO_GOL_LABEL } from "@/lib/validations/gol";

function nombreMostrado(j: { nombre: string; apellidos: string; alias: string | null }) {
  return j.alias || `${j.nombre} ${j.apellidos}`;
}

export function ResumenGoles({ partidoId }: { partidoId: string }) {
  const eventos = useLiveQuery(
    () =>
      localDb.eventos_partido
        .where("partido_id")
        .equals(partidoId)
        .filter((e) => e.tipo === "gol" || e.tipo === "autogol")
        .toArray(),
    [partidoId],
    [],
  );
  const jugadores = useLiveQuery(() => localDb.jugadores.toArray(), [], []);

  const jugadoresPorId = useMemo(
    () => new Map(jugadores.map((j) => [j.id, j])),
    [jugadores],
  );

  const { favor, contra } = useMemo(() => {
    const ordenados = eventos
      .slice()
      .sort((a, b) => (a.minuto ?? 999) - (b.minuto ?? 999));
    return {
      favor: ordenados.filter((e) => e.a_favor),
      contra: ordenados.filter((e) => !e.a_favor),
    };
  }, [eventos]);

  if (eventos.length === 0) return null;

  return (
    <Card>
      <CardContent className="grid grid-cols-2 gap-4 pt-6 text-sm">
        <div>
          <p className="mb-2 flex items-center gap-1.5 font-medium text-pitch">
            <span className="size-2 rounded-full bg-pitch" />
            A favor ({favor.length})
          </p>
          {favor.length === 0 ? (
            <p className="text-muted-foreground">—</p>
          ) : (
            <ul className="space-y-1">
              {favor.map((e) => {
                const jugador = e.jugador_id ? jugadoresPorId.get(e.jugador_id) : null;
                return (
                  <li key={e.id} className="truncate text-muted-foreground">
                    {e.minuto != null ? `${e.minuto}' ` : ""}
                    {jugador ? nombreMostrado(jugador) : "?"}
                    {e.tipo_gol && (
                      <span className="text-xs"> · {TIPO_GOL_LABEL[e.tipo_gol]}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div>
          <p className="mb-2 flex items-center gap-1.5 font-medium text-destructive">
            <span className="size-2 rounded-full bg-destructive" />
            En contra ({contra.length})
          </p>
          {contra.length === 0 ? (
            <p className="text-muted-foreground">—</p>
          ) : (
            <ul className="space-y-1">
              {contra.map((e) => {
                const jugador = e.jugador_id ? jugadoresPorId.get(e.jugador_id) : null;
                return (
                  <li key={e.id} className="truncate text-muted-foreground">
                    {e.minuto != null ? `${e.minuto}' ` : ""}
                    {jugador
                      ? `${nombreMostrado(jugador)}${e.tipo === "autogol" ? " (p.p.)" : ""}`
                      : "Rival"}
                    {e.tipo_gol && (
                      <span className="text-xs"> · {TIPO_GOL_LABEL[e.tipo_gol]}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
