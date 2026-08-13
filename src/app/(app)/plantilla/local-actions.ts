// Reemplaza a actions.ts (Server Actions) para permitir crear/editar
// jugadores y sus valoraciones sin conexión: escribe primero en Dexie y
// encola la mutación para Supabase. Única excepción: subir la foto requiere
// conexión (Supabase Storage no se puede encolar de forma sencilla).

import { localDb, type LocalJugador, type LocalValoracionJugador } from "@/lib/db/local-db";
import { queueMutation } from "@/lib/db/sync";
import { createClient } from "@/lib/supabase/client";
import {
  jugadorSchema,
  toJugadorInsert,
  type JugadorFormValues,
} from "@/lib/validations/jugador";
import {
  valoracionJugadorSchema,
  toValoracionJugadorInsert,
  type ValoracionJugadorFormValues,
} from "@/lib/validations/valoracion-jugador";

type ActionResult = { error: string } | { success: true; id: string };
type SimpleResult = { error: string } | { success: true };

async function subirFoto(jugadorId: string, foto: File): Promise<string | null> {
  if (!navigator.onLine) {
    throw new Error(
      "Sin conexión: el resto de los datos se ha guardado, pero la foto no se puede subir ahora. Añádela cuando vuelvas a tener cobertura.",
    );
  }

  const supabase = createClient();
  const { error } = await supabase.storage
    .from("jugadores")
    .upload(jugadorId, foto, { upsert: true, contentType: foto.type });

  if (error) {
    throw new Error(`No se ha podido subir la foto: ${error.message}`);
  }

  await supabase.from("jugadores").update({ foto_url: jugadorId }).eq("id", jugadorId);
  await localDb.jugadores.update(jugadorId, { foto_url: jugadorId });
  return jugadorId;
}

export async function crearJugadorLocal(
  values: JugadorFormValues,
  foto: File | null,
): Promise<ActionResult> {
  const parsed = jugadorSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const row: LocalJugador = {
    id,
    ...toJugadorInsert(parsed.data),
    foto_url: null,
    activo: true,
    created_at: now,
    updated_at: now,
  };

  await localDb.jugadores.put(row);
  await queueMutation("jugadores", "insert", id, row);

  if (foto && foto.size > 0) {
    try {
      await subirFoto(id, foto);
    } catch (e) {
      return {
        error:
          e instanceof Error
            ? e.message
            : "Jugador creado, pero la foto no se pudo subir",
      };
    }
  }

  return { success: true, id };
}

export async function actualizarJugadorLocal(
  id: string,
  values: JugadorFormValues,
  foto: File | null,
): Promise<ActionResult> {
  const parsed = jugadorSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const patch = toJugadorInsert(parsed.data);
  await localDb.jugadores.update(id, patch);
  await queueMutation("jugadores", "update", id, patch);

  if (foto && foto.size > 0) {
    try {
      await subirFoto(id, foto);
    } catch (e) {
      return {
        error:
          e instanceof Error
            ? e.message
            : "Jugador actualizado, pero la foto no se pudo subir",
      };
    }
  }

  return { success: true, id };
}

export async function toggleActivoJugadorLocal(
  id: string,
  activo: boolean,
): Promise<ActionResult> {
  await localDb.jugadores.update(id, { activo });
  await queueMutation("jugadores", "update", id, { activo });
  return { success: true, id };
}

type ValoracionResult =
  | { error: string }
  | { success: true; valoracion: LocalValoracionJugador };

export async function crearValoracionJugadorLocal(
  jugadorId: string,
  values: ValoracionJugadorFormValues,
): Promise<ValoracionResult> {
  const parsed = valoracionJugadorSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const id = crypto.randomUUID();
  const row: LocalValoracionJugador = {
    id,
    ...toValoracionJugadorInsert(jugadorId, parsed.data),
  };

  await localDb.valoraciones_jugador.put(row);
  await queueMutation("valoraciones_jugador", "insert", id, row);

  return { success: true, valoracion: row };
}

export async function eliminarValoracionJugadorLocal(id: string): Promise<SimpleResult> {
  await localDb.valoraciones_jugador.delete(id);
  await queueMutation("valoraciones_jugador", "delete", id);
  return { success: true };
}
