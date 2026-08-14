"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb, type LocalJugador } from "@/lib/db/local-db";
import { Card, CardContent } from "@/components/ui/card";

export function AsistenciaResumen({
  entrenamientoId,
}: {
  entrenamientoId: string;
}) {
  const jugadores = useLiveQuery(
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
    [],
  );
  const asistenciasRows = useLiveQuery(
    () =>
      localDb.asistencias_entrenamiento
        .where("entrenamiento_id")
        .equals(entrenamientoId)
        .toArray(),
    [entrenamientoId],
    [],
  );
  const estados = useLiveQuery(() => localDb.estados.toArray(), [], []);

  const { asisten, noAsisten } = useMemo(() => {
    const estadoIdPorJugador = new Map(
      asistenciasRows.filter((a) => a.estado_id).map((a) => [a.jugador_id, a.estado_id as string]),
    );
    const estadoById = new Map(estados.map((e) => [e.id, e]));

    const asisten: LocalJugador[] = [];
    const noAsisten: { jugador: LocalJugador; nombre: string; color: string }[] = [];

    for (const j of jugadores) {
      const estadoId = estadoIdPorJugador.get(j.id);
      const estado = estadoId ? estadoById.get(estadoId) : undefined;
      if (!estado || estado.nombre === "SI") {
        asisten.push(j);
      } else {
        noAsisten.push({ jugador: j, nombre: estado.nombre, color: estado.color });
      }
    }

    return { asisten, noAsisten };
  }, [jugadores, asistenciasRows, estados]);

  if (jugadores.length === 0) return null;

  return (
    <Card>
      <CardContent className="grid grid-cols-2 gap-4 pt-6 text-sm">
        <div>
          <p className="mb-2 flex items-center gap-1.5 font-medium text-pitch">
            <span className="size-2 rounded-full bg-pitch" />
            Asisten ({asisten.length})
          </p>
          <ul className="space-y-1">
            {asisten.map((j) => (
              <li key={j.id} className="truncate text-muted-foreground">
                {j.dorsal != null ? `${j.dorsal} · ` : ""}
                {j.nombre} {j.apellidos}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 flex items-center gap-1.5 font-medium text-destructive">
            <span className="size-2 rounded-full bg-destructive" />
            No asisten ({noAsisten.length})
          </p>
          <ul className="space-y-1">
            {noAsisten.map(({ jugador, nombre, color }) => (
              <li key={jugador.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-muted-foreground">
                  {jugador.dorsal != null ? `${jugador.dorsal} · ` : ""}
                  {jugador.nombre} {jugador.apellidos}
                </span>
                <span
                  className="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
                  style={{ borderColor: color, color }}
                >
                  {nombre}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
