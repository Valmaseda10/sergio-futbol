"use client";

// Nuestros goles a favor y en contra por tramos de minutos en los partidos de liga ya jugados
// (de los eventos de la app), con los mismos tramos que la tabla "Goles del rival por tramos":
// así lo nuestro se puede comparar con lo de cualquier rival.

import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/local-db";

export const TRAMOS_GOLES = ["0-15", "15-30", "30-45", "45-60", "60+"] as const;

export interface GolesPropiosPorTramos {
  /** Goles a favor en cada tramo (mismo orden que TRAMOS_GOLES). */
  favor: number[];
  /** Goles en contra en cada tramo. */
  contra: number[];
  /** Partidos de liga jugados con goles apuntados. */
  partidos: number;
  /** Goles sin minuto apuntado (no entran en ningún tramo). */
  sinMinuto: number;
}

const VACIO: GolesPropiosPorTramos = { favor: [0, 0, 0, 0, 0], contra: [0, 0, 0, 0, 0], partidos: 0, sinMinuto: 0 };

const tramoDe = (m: number) => (m < 15 ? 0 : m < 30 ? 1 : m < 45 ? 2 : m < 60 ? 3 : 4);

export function useGolesPropiosPorTramos(): GolesPropiosPorTramos {
  return useLiveQuery(
    async () => {
      const partidos = await localDb.partidos
        .filter((p) => p.competicion === "liga" && p.resultado_favor != null)
        .toArray();
      const ids = new Set(partidos.map((p) => p.id));
      const eventos = await localDb.eventos_partido
        .filter((e) => ids.has(e.partido_id) && (e.tipo === "gol" || e.tipo === "autogol"))
        .toArray();
      const favor = [0, 0, 0, 0, 0];
      const contra = [0, 0, 0, 0, 0];
      let sinMinuto = 0;
      for (const e of eventos) {
        if (e.minuto == null) {
          sinMinuto++;
          continue;
        }
        (e.a_favor ? favor : contra)[tramoDe(e.minuto)]++;
      }
      return { favor, contra, partidos: partidos.length, sinMinuto };
    },
    [],
    VACIO,
  );
}
