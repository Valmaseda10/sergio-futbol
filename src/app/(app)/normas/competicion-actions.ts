// Competición de los viernes: mismo patrón local-first que el resto de la app — se escribe en
// Dexie y se encola la mutación para Supabase.

import { localDb, type LocalCompeticionViernes } from "@/lib/db/local-db";
import { queueMutation } from "@/lib/db/sync";
import type { TipoTiro } from "@/lib/competicion-viernes";

/**
 * Apunta los puntos de un tiro que ha entrado (1 con su pierna dominante, 2 con la menos dominante)
 * o `null` si no ha metido (borra el tiro: la casilla vacía es un fallo).
 */
export async function ponerTiroViernesLocal(
  fecha: string,
  ronda: number,
  jugadorId: string,
  tipo: TipoTiro,
  puntos: number | null,
): Promise<void> {
  const existente = await localDb.competicion_viernes
    .where("fecha")
    .equals(fecha)
    .filter((t) => t.ronda === ronda && t.jugador_id === jugadorId && t.tipo === tipo)
    .first();

  if (puntos === null) {
    if (existente) {
      await localDb.competicion_viernes.delete(existente.id);
      await queueMutation("competicion_viernes", "delete", existente.id);
    }
    return;
  }
  if (existente) {
    if (existente.puntos === puntos) return;
    await localDb.competicion_viernes.update(existente.id, { puntos });
    await queueMutation("competicion_viernes", "update", existente.id, { puntos });
    return;
  }
  const row: LocalCompeticionViernes = {
    id: crypto.randomUUID(),
    fecha,
    ronda,
    jugador_id: jugadorId,
    tipo,
    puntos,
    created_at: new Date().toISOString(),
  };
  await localDb.competicion_viernes.put(row);
  await queueMutation("competicion_viernes", "insert", row.id, row);
}
