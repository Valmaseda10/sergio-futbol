"use client";

// Lee de la app lo que necesitan las diapositivas automáticas de un partido: la ficha del
// rival (plantilla, goles por tramos, alineación), nuestra alineación y las jugadas de ABP.

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/local-db";
import type { ContextoPresentacion } from "@/components/plan-partido/presentacion/diapositiva-vista";

/** `undefined` mientras carga y `null` si el partido no existe. */
export function useContextoPresentacion(partidoId: string): ContextoPresentacion | null | undefined {
  const datos = useLiveQuery(async () => {
    const partido = await localDb.partidos.get(partidoId);
    if (!partido) return null;
    // El rival de la ficha de scouting: el enlazado en el partido o, si no hay, el del mismo nombre.
    let rival = partido.rival_scouting_id ? ((await localDb.rivales_scouting.get(partido.rival_scouting_id)) ?? null) : null;
    if (!rival) {
      const nombre = partido.rival.trim().toLowerCase();
      rival =
        (await localDb.rivales_scouting.filter((r) => r.nombre.trim().toLowerCase() === nombre).first()) ?? null;
    }
    const rivalId = rival?.id;
    const [plantillaRival, destacadosRival, golesRival, onceRival, nuestraAlineacion, jugadores, abp, ligaPartidos, ligaEventos] =
      await Promise.all([
        rivalId ? localDb.rivales_plantilla.where("rival_id").equals(rivalId).toArray() : Promise.resolve([]),
        rivalId
          ? localDb.rivales_jugadores_destacados.where("rival_id").equals(rivalId).toArray()
          : Promise.resolve([]),
        rivalId ? localDb.rivales_goles_intervalo.where("rival_id").equals(rivalId).toArray() : Promise.resolve([]),
        rivalId ? localDb.rivales_alineacion.where("rival_id").equals(rivalId).toArray() : Promise.resolve([]),
        localDb.alineaciones.where("partido_id").equals(partidoId).toArray(),
        localDb.jugadores.toArray(),
        localDb.jugadas_abp.filter((j) => j.partido_id === partidoId).toArray(),
        localDb.liga_partidos.toArray(),
        localDb.liga_eventos.toArray(),
      ]);
    return { partido, rival, plantillaRival, destacadosRival, golesRival, onceRival, nuestraAlineacion, jugadores, abp, ligaPartidos, ligaEventos };
  }, [partidoId]);

  return useMemo(
    () =>
      datos === undefined || datos === null
        ? datos
        : {
            partido: datos.partido,
            rival: datos.rival,
            plantillaRival: datos.plantillaRival,
            destacadosRival: datos.destacadosRival,
            golesRival: datos.golesRival,
            onceRival: datos.onceRival,
            nuestraAlineacion: datos.nuestraAlineacion,
            jugadores: new Map(datos.jugadores.map((j) => [j.id, j])),
            abp: datos.abp,
            ligaPartidos: datos.ligaPartidos,
            ligaEventos: datos.ligaEventos,
          },
    [datos],
  );
}
