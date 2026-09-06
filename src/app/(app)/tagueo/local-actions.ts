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

  const existentes = await localDb.etiquetas.toArray();
  const maxOrden = existentes.reduce((max, e) => Math.max(max, e.orden), -1);

  const id = crypto.randomUUID();
  const row: LocalEtiqueta = {
    id,
    ...parsed.data,
    orden: maxOrden + 1,
    activo: true,
    created_at: new Date().toISOString(),
  };

  await localDb.etiquetas.put(row);
  await queueMutation("etiquetas", "insert", id, row);

  return { success: true, id };
}

// Mueve una categoría un puesto arriba o abajo en la lista, intercambiando su
// "orden" con el de la categoría vecina en esa dirección (según el orden
// actual). Si ya está en el extremo, no hace nada.
export async function moverEtiquetaLocal(
  id: string,
  direccion: "arriba" | "abajo",
): Promise<SimpleResult> {
  const ordenadas = (await localDb.etiquetas.toArray()).sort(
    (a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre),
  );
  const index = ordenadas.findIndex((e) => e.id === id);
  if (index === -1) return { success: true };

  const destino = direccion === "arriba" ? index - 1 : index + 1;
  if (destino < 0 || destino >= ordenadas.length) return { success: true };

  const actual = ordenadas[index];
  const vecino = ordenadas[destino];

  await localDb.etiquetas.update(actual.id, { orden: vecino.orden });
  await queueMutation("etiquetas", "update", actual.id, { orden: vecino.orden });
  await localDb.etiquetas.update(vecino.id, { orden: actual.orden });
  await queueMutation("etiquetas", "update", vecino.id, { orden: actual.orden });

  return { success: true };
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
