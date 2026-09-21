"use client";

// Recordatorios del dashboard de Inicio: mismo patrón local-first (Dexie +
// outbox) que el resto de la app.

import { localDb, type LocalRecordatorio, type LocalNota } from "@/lib/db/local-db";
import { queueMutation } from "@/lib/db/sync";
import {
  recordatorioSchema,
  type RecordatorioFormValues,
} from "@/lib/validations/recordatorio";
import { notaSchema, type NotaFormValues } from "@/lib/validations/nota";

type ActionResult = { error: string } | { success: true; id: string };
type SimpleResult = { error: string } | { success: true };

export async function crearRecordatorioLocal(
  values: RecordatorioFormValues,
): Promise<ActionResult> {
  const parsed = recordatorioSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const id = crypto.randomUUID();
  const row: LocalRecordatorio = {
    id,
    texto: parsed.data.texto,
    completado: false,
    created_at: new Date().toISOString(),
  };

  await localDb.recordatorios.put(row);
  await queueMutation("recordatorios", "insert", id, row);

  return { success: true, id };
}

export async function toggleCompletadoRecordatorioLocal(
  id: string,
  completado: boolean,
): Promise<SimpleResult> {
  await localDb.recordatorios.update(id, { completado });
  await queueMutation("recordatorios", "update", id, { completado });
  return { success: true };
}

export async function eliminarRecordatorioLocal(
  id: string,
): Promise<SimpleResult> {
  await localDb.recordatorios.delete(id);
  await queueMutation("recordatorios", "delete", id);
  return { success: true };
}

export async function crearNotaLocal(
  values: NotaFormValues,
): Promise<ActionResult> {
  const parsed = notaSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const id = crypto.randomUUID();
  const row: LocalNota = {
    id,
    texto: parsed.data.texto,
    created_at: new Date().toISOString(),
  };

  await localDb.notas.put(row);
  await queueMutation("notas", "insert", id, row);

  return { success: true, id };
}

export async function eliminarNotaLocal(id: string): Promise<SimpleResult> {
  await localDb.notas.delete(id);
  await queueMutation("notas", "delete", id);
  return { success: true };
}
