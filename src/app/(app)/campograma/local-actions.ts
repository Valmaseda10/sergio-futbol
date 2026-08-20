"use client";

// Campograma: alineaciones guardadas y reutilizables (no atadas a un
// partido), que se pueden ir editando. Mismo patrón local-first que el
// resto de la app: escribe primero en Dexie y encola la mutación.

import {
  localDb,
  type LocalCampograma,
  type LocalCampogramaJugador,
} from "@/lib/db/local-db";
import { queueMutation } from "@/lib/db/sync";

type ActionResult = { error: string } | { success: true; id: string };
type SimpleResult = { error: string } | { success: true };

export interface TitularGuardar {
  jugadorId: string;
  posicion: string | null;
  posX: number;
  posY: number;
}

export async function guardarCampogramaLocal(params: {
  id?: string;
  nombre: string;
  notas: string | null;
  titulares: TitularGuardar[];
  suplentesIds: string[];
}): Promise<ActionResult> {
  const nombre = params.nombre.trim();
  if (!nombre) {
    return { error: "Ponle un nombre al campograma" };
  }

  const now = new Date().toISOString();
  const id = params.id ?? crypto.randomUUID();

  if (params.id) {
    const patch = { nombre, notas: params.notas, updated_at: now };
    await localDb.campogramas.update(id, patch);
    await queueMutation("campogramas", "update", id, patch);
  } else {
    const row: LocalCampograma = {
      id,
      nombre,
      notas: params.notas,
      created_at: now,
      updated_at: now,
    };
    await localDb.campogramas.put(row);
    await queueMutation("campogramas", "insert", id, row);
  }

  const existentes = await localDb.campograma_jugadores
    .where("campograma_id")
    .equals(id)
    .toArray();
  const existentesPorJugador = new Map(existentes.map((c) => [c.jugador_id, c]));

  const deseados = new Map<
    string,
    { titular: boolean; posicion: string | null; posX: number | null; posY: number | null; orden: number | null }
  >();
  params.titulares.forEach((t) => {
    deseados.set(t.jugadorId, {
      titular: true,
      posicion: t.posicion,
      posX: t.posX,
      posY: t.posY,
      orden: null,
    });
  });
  params.suplentesIds.forEach((jugadorId, i) => {
    deseados.set(jugadorId, {
      titular: false,
      posicion: null,
      posX: null,
      posY: null,
      orden: i,
    });
  });

  const aBorrar = existentes.filter((c) => !deseados.has(c.jugador_id));
  await localDb.campograma_jugadores.bulkDelete(aBorrar.map((c) => c.id));
  for (const c of aBorrar) {
    await queueMutation("campograma_jugadores", "delete", c.id);
  }

  for (const [jugadorId, datos] of deseados) {
    const existente = existentesPorJugador.get(jugadorId);
    if (existente) {
      const patch = {
        titular: datos.titular,
        posicion_jugada: datos.posicion,
        pos_x: datos.posX,
        pos_y: datos.posY,
        orden: datos.orden,
      };
      await localDb.campograma_jugadores.update(existente.id, patch);
      await queueMutation("campograma_jugadores", "update", existente.id, patch);
    } else {
      const filaId = crypto.randomUUID();
      const row: LocalCampogramaJugador = {
        id: filaId,
        campograma_id: id,
        jugador_id: jugadorId,
        titular: datos.titular,
        posicion_jugada: datos.posicion,
        pos_x: datos.posX,
        pos_y: datos.posY,
        orden: datos.orden,
      };
      await localDb.campograma_jugadores.put(row);
      await queueMutation("campograma_jugadores", "insert", filaId, row);
    }
  }

  return { success: true, id };
}

export async function eliminarCampogramaLocal(id: string): Promise<SimpleResult> {
  const jugadores = await localDb.campograma_jugadores
    .where("campograma_id")
    .equals(id)
    .toArray();

  await localDb.transaction(
    "rw",
    [localDb.campogramas, localDb.campograma_jugadores],
    async () => {
      await localDb.campogramas.delete(id);
      await localDb.campograma_jugadores.bulkDelete(jugadores.map((j) => j.id));
    },
  );

  // Los jugadores del campograma se borran en cascada en Supabase; solo
  // hace falta encolar el borrado del campograma en sí.
  await queueMutation("campogramas", "delete", id);

  return { success: true };
}
