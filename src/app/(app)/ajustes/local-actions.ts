// Estados pasa a ser offline-capable (Dexie + outbox). Usuarios y
// Solicitudes de acceso se quedan en actions.ts / route handlers online-only:
// requieren la service_role key, que nunca debe llegar al cliente.

import { localDb, type LocalEstado } from "@/lib/db/local-db";
import { queueMutation } from "@/lib/db/sync";
import { estadoSchema, type EstadoFormValues } from "@/lib/validations/estado";

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
