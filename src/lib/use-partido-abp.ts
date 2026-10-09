"use client";

// Partido con el que se sincroniza una jugada de ABP: por defecto el próximo
// (o el último jugado si no queda ninguno por delante). De su alineación y su
// convocatoria sale quién es titular y quién suplente.

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/local-db";
import type { EstadoPartido } from "@/lib/plan-partido";

function hoyIso(): string {
  const d = new Date();
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

export interface PartidoAbp {
  partidos: { id: string; fecha: string; rival: string }[];
  /** Partido elegido (o el que toca por defecto); null si no hay ninguno. */
  partidoId: string | null;
  /** "" = sin sincronizar con ningún partido. */
  elegir: (id: string) => void;
  /** Jugador -> titular (alineación inicial) o suplente (convocado que no sale de inicio). */
  estados: Map<string, EstadoPartido>;
}

export function usePartidoAbp(): PartidoAbp {
  const partidos = useLiveQuery(() => localDb.partidos.orderBy("fecha").toArray(), [], []);
  const [elegido, setElegido] = useState<string | null>(null);

  const porDefecto = useMemo(() => {
    const hoy = hoyIso();
    return partidos.find((p) => p.fecha >= hoy) ?? partidos[partidos.length - 1] ?? null;
  }, [partidos]);
  const partidoId = elegido === null ? (porDefecto?.id ?? null) : elegido || null;

  const alineaciones = useLiveQuery(
    () =>
      partidoId ? localDb.alineaciones.where("partido_id").equals(partidoId).toArray() : [],
    [partidoId],
    [],
  );
  const convocatorias = useLiveQuery(
    () =>
      partidoId ? localDb.convocatorias.where("partido_id").equals(partidoId).toArray() : [],
    [partidoId],
    [],
  );

  const estados = useMemo(() => {
    const m = new Map<string, EstadoPartido>();
    for (const a of alineaciones) {
      if (a.jugador_id) m.set(a.jugador_id, a.titular ? "titular" : "suplente");
    }
    for (const c of convocatorias) {
      if (c.convocado && !m.has(c.jugador_id)) m.set(c.jugador_id, "suplente");
    }
    return m;
  }, [alineaciones, convocatorias]);

  return {
    partidos: partidos.map((p) => ({ id: p.id, fecha: p.fecha, rival: p.rival })),
    partidoId,
    elegir: setElegido,
    estados,
  };
}
