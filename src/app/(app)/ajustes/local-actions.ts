// Estados pasa a ser offline-capable (Dexie + outbox). Usuarios y
// Solicitudes de acceso se quedan en actions.ts / route handlers online-only:
// requieren la service_role key, que nunca debe llegar al cliente.

import {
  localDb,
  type LocalEstado,
  type LocalEtiqueta,
  type LocalHorarioEntrenamiento,
} from "@/lib/db/local-db";
import { queueMutation } from "@/lib/db/sync";
import { estadoSchema, type EstadoFormValues } from "@/lib/validations/estado";
import { etiquetaSchema, type EtiquetaFormValues } from "@/lib/validations/etiqueta";

type ActionResult = { error: string } | { success: true; id: string };
type SimpleResult = { error: string } | { success: true };

export async function crearEstadoLocal(
  values: EstadoFormValues,
): Promise<ActionResult> {
  const parsed = estadoSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const id = crypto.randomUUID();
  const row: LocalEstado = {
    id,
    ...parsed.data,
    activo: true,
    created_at: new Date().toISOString(),
  };

  await localDb.estados.put(row);
  await queueMutation("estados", "insert", id, row);

  return { success: true, id };
}

export async function actualizarEstadoLocal(
  id: string,
  values: EstadoFormValues,
): Promise<SimpleResult> {
  const parsed = estadoSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  await localDb.estados.update(id, parsed.data);
  await queueMutation("estados", "update", id, parsed.data);

  return { success: true };
}

export async function toggleActivoEstadoLocal(
  id: string,
  activo: boolean,
): Promise<SimpleResult> {
  await localDb.estados.update(id, { activo });
  await queueMutation("estados", "update", id, { activo });
  return { success: true };
}

export async function crearEtiquetaLocal(
  values: EtiquetaFormValues,
): Promise<ActionResult> {
  const parsed = etiquetaSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const id = crypto.randomUUID();
  const row: LocalEtiqueta = {
    id,
    ...parsed.data,
    activo: true,
    created_at: new Date().toISOString(),
  };

  await localDb.etiquetas.put(row);
  await queueMutation("etiquetas", "insert", id, row);

  return { success: true, id };
}

export async function actualizarEtiquetaLocal(
  id: string,
  values: EtiquetaFormValues,
): Promise<SimpleResult> {
  const parsed = etiquetaSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  await localDb.etiquetas.update(id, parsed.data);
  await queueMutation("etiquetas", "update", id, parsed.data);

  return { success: true };
}

export async function toggleActivoEtiquetaLocal(
  id: string,
  activo: boolean,
): Promise<SimpleResult> {
  await localDb.etiquetas.update(id, { activo });
  await queueMutation("etiquetas", "update", id, { activo });
  return { success: true };
}

export interface HorarioFormValues {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  lugar: string;
}

export async function crearHorarioLocal(
  values: HorarioFormValues,
): Promise<ActionResult> {
  const id = crypto.randomUUID();
  const row: LocalHorarioEntrenamiento = {
    id,
    dia_semana: values.dia_semana,
    hora_inicio: values.hora_inicio || null,
    hora_fin: values.hora_fin || null,
    lugar: values.lugar || null,
    created_at: new Date().toISOString(),
  };

  await localDb.horario_entrenamiento.put(row);
  await queueMutation("horario_entrenamiento", "insert", id, row);

  return { success: true, id };
}

export async function actualizarHorarioLocal(
  id: string,
  values: Omit<HorarioFormValues, "dia_semana">,
): Promise<SimpleResult> {
  const patch = {
    hora_inicio: values.hora_inicio || null,
    hora_fin: values.hora_fin || null,
    lugar: values.lugar || null,
  };
  await localDb.horario_entrenamiento.update(id, patch);
  await queueMutation("horario_entrenamiento", "update", id, patch);
  return { success: true };
}

export async function eliminarHorarioLocal(id: string): Promise<SimpleResult> {
  await localDb.horario_entrenamiento.delete(id);
  await queueMutation("horario_entrenamiento", "delete", id);
  return { success: true };
}
