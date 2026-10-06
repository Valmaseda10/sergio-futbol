"use client";

// Recordatorios del dashboard de Inicio: mismo patrón local-first (Dexie +
// outbox) que el resto de la app.

import {
  localDb,
  type LocalRecordatorio,
  type LocalNota,
  type LocalMulta,
  type LocalNorma,
} from "@/lib/db/local-db";
import { queueMutation } from "@/lib/db/sync";
import {
  recordatorioSchema,
  type RecordatorioFormValues,
} from "@/lib/validations/recordatorio";
import { notaSchema, type NotaFormValues } from "@/lib/validations/nota";
import {
  multaSchema,
  normaSchema,
  type MultaFormValues,
  type NormaFormValues,
} from "@/lib/validations/norma";

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

export async function crearMultaLocal(
  values: MultaFormValues,
): Promise<ActionResult> {
  const parsed = multaSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const id = crypto.randomUUID();
  const row: LocalMulta = {
    id,
    jugador_id: parsed.data.jugador_id,
    categoria: parsed.data.categoria,
    norma: parsed.data.norma,
    puntos: parsed.data.puntos,
    fecha: new Date().toISOString().slice(0, 10),
    resuelta: false,
    notas: parsed.data.notas || null,
    created_at: new Date().toISOString(),
  };

  await localDb.multas.put(row);
  await queueMutation("multas", "insert", id, row);

  return { success: true, id };
}

export async function crearNormaLocal(
  values: NormaFormValues,
): Promise<ActionResult> {
  const parsed = normaSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const existentes = await localDb.normas.toArray();
  const id = crypto.randomUUID();
  const row: LocalNorma = {
    id,
    categoria: parsed.data.categoria,
    texto: parsed.data.texto,
    puntos: parsed.data.puntos,
    orden: Math.max(0, ...existentes.map((n) => n.orden)) + 1,
    created_at: new Date().toISOString(),
  };

  await localDb.normas.put(row);
  await queueMutation("normas", "insert", id, row);

  return { success: true, id };
}

export async function actualizarNormaLocal(
  id: string,
  values: NormaFormValues,
): Promise<SimpleResult> {
  const parsed = normaSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const patch = {
    categoria: parsed.data.categoria,
    texto: parsed.data.texto,
    puntos: parsed.data.puntos,
  };
  await localDb.normas.update(id, patch);
  await queueMutation("normas", "update", id, patch);

  return { success: true };
}

export async function eliminarNormaLocal(id: string): Promise<SimpleResult> {
  await localDb.normas.delete(id);
  await queueMutation("normas", "delete", id);
  return { success: true };
}

export async function eliminarMultaLocal(id: string): Promise<SimpleResult> {
  await localDb.multas.delete(id);
  await queueMutation("multas", "delete", id);
  return { success: true };
}

/** Marca como resueltas todas las multas pendientes de un jugador (castigo cumplido). */
export async function resolverMultasJugadorLocal(
  jugadorId: string,
): Promise<SimpleResult> {
  const pendientes = await localDb.multas
    .where("jugador_id")
    .equals(jugadorId)
    .filter((m) => !m.resuelta)
    .toArray();

  for (const m of pendientes) {
    await localDb.multas.update(m.id, { resuelta: true });
    await queueMutation("multas", "update", m.id, { resuelta: true });
  }

  return { success: true };
}

/** Resetea a 0 los puntos pendientes de todos los jugadores (reinicio mensual). */
export async function resolverTodasLasMultasLocal(): Promise<SimpleResult> {
  const pendientes = await localDb.multas.filter((m) => !m.resuelta).toArray();

  for (const m of pendientes) {
    await localDb.multas.update(m.id, { resuelta: true });
    await queueMutation("multas", "update", m.id, { resuelta: true });
  }

  return { success: true };
}
