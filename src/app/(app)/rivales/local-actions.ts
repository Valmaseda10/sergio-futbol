"use client";

// Rivales (antes "scouting" dentro de Partidos): escribe primero en Dexie y
// encola la mutación para Supabase, siguiendo el mismo patrón local-first
// que el resto de la app.

import {
  localDb,
  type LocalRivalScouting,
  type LocalRivalJugadorDestacado,
} from "@/lib/db/local-db";
import { queueMutation } from "@/lib/db/sync";
import { createClient } from "@/lib/supabase/client";
import { subirArchivoPrivado, extensionDeArchivo } from "@/lib/storage";
import {
  rivalScoutingSchema,
  jugadorDestacadoSchema,
  toRivalScoutingInsert,
  toJugadorDestacadoInsert,
  type RivalScoutingFormValues,
  type JugadorDestacadoFormValues,
} from "@/lib/validations/rivales";

type ActionResult = { error: string } | { success: true; id: string };
type SimpleResult = { error: string } | { success: true };

async function subirFotoRival(rivalId: string, foto: File): Promise<void> {
  const path = `scouting/${rivalId}.${extensionDeArchivo(foto)}`;
  await subirArchivoPrivado(path, foto);

  const supabase = createClient();
  await supabase
    .from("rivales_scouting")
    .update({ foto_url: path })
    .eq("id", rivalId);
  await localDb.rivales_scouting.update(rivalId, { foto_url: path });
}

export async function crearRivalLocal(
  values: RivalScoutingFormValues,
  foto?: File | null,
): Promise<ActionResult> {
  const parsed = rivalScoutingSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const row: LocalRivalScouting = {
    id,
    ...toRivalScoutingInsert(parsed.data),
    foto_url: null,
    color_camiseta: null,
    color_pantalon: null,
    color_medias: null,
    created_at: now,
    updated_at: now,
  };

  await localDb.rivales_scouting.put(row);
  await queueMutation("rivales_scouting", "insert", id, row);

  if (foto && foto.size > 0) {
    try {
      await subirFotoRival(id, foto);
    } catch (e) {
      return {
        error:
          e instanceof Error
            ? e.message
            : "Rival creado, pero la foto no se pudo subir",
      };
    }
  }

  return { success: true, id };
}

export async function actualizarRivalLocal(
  id: string,
  values: RivalScoutingFormValues,
  foto?: File | null,
): Promise<ActionResult> {
  const parsed = rivalScoutingSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const patch = toRivalScoutingInsert(parsed.data);
  await localDb.rivales_scouting.update(id, patch);
  await queueMutation("rivales_scouting", "update", id, patch);

  if (foto && foto.size > 0) {
    try {
      await subirFotoRival(id, foto);
    } catch (e) {
      return {
        error:
          e instanceof Error
            ? e.message
            : "Rival actualizado, pero la foto no se pudo subir",
      };
    }
  }

  return { success: true, id };
}

export async function eliminarRivalLocal(id: string): Promise<SimpleResult> {
  const destacados = await localDb.rivales_jugadores_destacados
    .where("rival_id")
    .equals(id)
    .toArray();

  await localDb.transaction(
    "rw",
    [localDb.rivales_scouting, localDb.rivales_jugadores_destacados],
    async () => {
      await localDb.rivales_scouting.delete(id);
      await localDb.rivales_jugadores_destacados.bulkDelete(
        destacados.map((d) => d.id),
      );
    },
  );

  await queueMutation("rivales_scouting", "delete", id);

  return { success: true };
}

export async function actualizarEquipacionRivalLocal(
  id: string,
  patch: Partial<
    Pick<LocalRivalScouting, "color_camiseta" | "color_pantalon" | "color_medias">
  >,
): Promise<SimpleResult> {
  await localDb.rivales_scouting.update(id, patch);
  await queueMutation("rivales_scouting", "update", id, patch);
  return { success: true };
}

type DestacadoResult =
  | { error: string }
  | { success: true; destacado: LocalRivalJugadorDestacado };

export async function crearJugadorDestacadoLocal(
  rivalId: string,
  values: JugadorDestacadoFormValues,
): Promise<DestacadoResult> {
  const parsed = jugadorDestacadoSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const id = crypto.randomUUID();
  const row: LocalRivalJugadorDestacado = {
    id,
    rival_id: rivalId,
    ...toJugadorDestacadoInsert(parsed.data),
    created_at: new Date().toISOString(),
  };

  await localDb.rivales_jugadores_destacados.put(row);
  await queueMutation("rivales_jugadores_destacados", "insert", id, row);

  return { success: true, destacado: row };
}

export async function eliminarJugadorDestacadoLocal(
  id: string,
): Promise<SimpleResult> {
  await localDb.rivales_jugadores_destacados.delete(id);
  await queueMutation("rivales_jugadores_destacados", "delete", id);
  return { success: true };
}
