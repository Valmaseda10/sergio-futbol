// Categorías de tagueo, offline-capable (Dexie + outbox), igual que el resto
// de catálogos personalizables de la app (estados, horario semanal...).

import { localDb, type LocalEtiqueta } from "@/lib/db/local-db";
import { queueMutation } from "@/lib/db/sync";
import { etiquetaSchema, type EtiquetaFormValues } from "@/lib/validations/etiqueta";

type ActionResult = { error: string } | { success: true; id: string };
type SimpleResult = { error: string } | { success: true };

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

// El registro de cada toque de una categoría durante un partido y su borrado
// viven en partidos/local-actions.ts (crearEtiquetaPartidoLocal /
// eliminarEtiquetaPartidoLocal), junto al resto de acciones scoped a un
// partido concreto.
