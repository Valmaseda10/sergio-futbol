"use client";

// Capitán del partido, en la ficha del partido y en el modo día de partido: se elige entre los
// capitanes del equipo (jugadores.es_capitan) que estén convocados, o entre todos ellos si aún no
// hay convocatoria. También se puede marcar con la «C» de la lista de convocados. Alimenta
// Partidos → Capitanes.

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { marcarCapitanPartidoLocal } from "@/app/(app)/partidos/local-actions";
import { localDb } from "@/lib/db/local-db";

export function CapitanPartido({
  partidoId,
  capitanId,
}: {
  partidoId: string;
  capitanId: string | null;
}) {
  const jugadores = useLiveQuery(() => localDb.jugadores.toArray(), [], []);
  const convocados = useLiveQuery(
    () =>
      localDb.convocatorias
        .where("partido_id")
        .equals(partidoId)
        .filter((c) => c.convocado)
        .toArray(),
    [partidoId],
    [],
  );

  const opciones = useMemo(() => {
    const ids = new Set(convocados.map((c) => c.jugador_id));
    return jugadores
      .filter((j) => (j.es_capitan && j.activo && (ids.size === 0 || ids.has(j.id))) || j.id === capitanId)
      .sort((a, b) => a.apellidos.localeCompare(b.apellidos))
      .map((j) => ({
        id: j.id,
        nombre: `${j.dorsal != null ? `${j.dorsal} · ` : ""}${j.alias || `${j.nombre} ${j.apellidos}`}`,
      }));
  }, [jugadores, convocados, capitanId]);

  return (
    <div className="flex items-center gap-3 rounded-md border p-3">
      <label htmlFor="capitan-partido" className="shrink-0 text-sm font-medium">
        Capitán
      </label>
      <select
        id="capitan-partido"
        value={capitanId ?? ""}
        onChange={(e) => void marcarCapitanPartidoLocal(partidoId, e.target.value || null)}
        className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
      >
        <option value="">— Sin elegir —</option>
        {opciones.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}
