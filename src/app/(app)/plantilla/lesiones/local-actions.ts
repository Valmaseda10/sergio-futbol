"use client";

// Registro de lesiones y sesiones de readaptación: escribe primero en Dexie
// y encola la mutación para Supabase, siguiendo el mismo patrón local-first
// que el resto de la app.

import {
  localDb,
  type LocalLesion,
  type LocalLesionSesion,
} from "@/lib/db/local-db";
import { queueMutation } from "@/lib/db/sync";
import {
  lesionSchema,
  lesionSesionSchema,
  toLesionInsert,
  toLesionSesionInsert,
  type LesionFormValues,
  type LesionSesionFormValues,
} from "@/lib/validations/lesion";

type ActionResult = { error: string } | { success: true; id: string };
type SimpleResult = { error: string } | { success: true };

export async function crearLesionLocal(
  values: LesionFormValues,
): Promise<ActionResult> {
  const parsed = lesionSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const id = crypto.randomUUID();
  const row: LocalLesion = { id, ...toLesionInsert(parsed.data) };

  await localDb.lesiones.put(row);
  await queueMutation("lesiones", "insert", id, row);

  return { success: true, id };
}

export async function actualizarLesionLocal(
  id: string,
  values: LesionFormValues,
): Promise<ActionResult> {
  const parsed = lesionSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const patch = toLesionInsert(parsed.data);
  await localDb.lesiones.update(id, patch);
  await queueMutation("lesiones", "update", id, patch);

  return { success: true, id };
}

export async function eliminarLesionLocal(id: string): Promise<SimpleResult> {
  const sesiones = await localDb.lesion_sesiones_readaptacion
    .where("lesion_id")
    .equals(id)
    .toArray();

  await localDb.transaction(
    "rw",
    [localDb.lesiones, localDb.lesion_sesiones_readaptacion],
    async () => {
      await localDb.lesiones.delete(id);
      await localDb.lesion_sesiones_readaptacion.bulkDelete(
        sesiones.map((s) => s.id),
      );
    },
  );

  await queueMutation("lesiones", "delete", id);

  return { success: true };
}

type SesionResult =
  | { error: string }
  | { success: true; sesion: LocalLesionSesion };

export async function crearSesionReadaptacionLocal(
  lesionId: string,
  values: LesionSesionFormValues,
): Promise<SesionResult> {
  const parsed = lesionSesionSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const id = crypto.randomUUID();
  const row: LocalLesionSesion = {
    id,
    lesion_id: lesionId,
    ...toLesionSesionInsert(parsed.data),
    created_at: new Date().toISOString(),
  };

  await localDb.lesion_sesiones_readaptacion.put(row);
  await queueMutation("lesion_sesiones_readaptacion", "insert", id, row);

  return { success: true, sesion: row };
}

export async function eliminarSesionReadaptacionLocal(
  id: string,
): Promise<SimpleResult> {
  await localDb.lesion_sesiones_readaptacion.delete(id);
  await queueMutation("lesion_sesiones_readaptacion", "delete", id);
  return { success: true };
}
