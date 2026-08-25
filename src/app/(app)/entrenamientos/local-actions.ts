// Reemplaza a actions.ts (Server Actions): crear/editar/eliminar
// entrenamientos, generarlos en lote y registrar asistencia, todo
// escribiendo primero en Dexie y encolando la mutación para Supabase.

import {
  localDb,
  type LocalAsistencia,
  type LocalEntrenamiento,
} from "@/lib/db/local-db";
import { queueMutation } from "@/lib/db/sync";
import { createClient } from "@/lib/supabase/client";
import { subirArchivoPrivado, extensionDeArchivo } from "@/lib/storage";
import {
  entrenamientoSchema,
  generarSchema,
  toEntrenamientoInsert,
  type EntrenamientoFormValues,
  type GenerarFormValues,
} from "@/lib/validations/entrenamiento";

type ActionResult = { error: string } | { success: true; id: string };
type SimpleResult = { error: string } | { success: true };

async function subirDocumento(
  entrenamientoId: string,
  archivo: File,
): Promise<void> {
  const path = `entrenamientos/${entrenamientoId}.${extensionDeArchivo(archivo)}`;
  await subirArchivoPrivado(path, archivo);

  const supabase = createClient();
  await supabase
    .from("entrenamientos")
    .update({ documento_url: path })
    .eq("id", entrenamientoId);
  await localDb.entrenamientos.update(entrenamientoId, { documento_url: path });
}

export async function crearEntrenamientoLocal(
  values: EntrenamientoFormValues,
  documento?: File | null,
): Promise<ActionResult> {
  const parsed = entrenamientoSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const id = crypto.randomUUID();
  const row: LocalEntrenamiento = {
    id,
    ...toEntrenamientoInsert(parsed.data),
    documento_url: null,
    created_at: new Date().toISOString(),
  };

  await localDb.entrenamientos.put(row);
  await queueMutation("entrenamientos", "insert", id, row);

  if (documento && documento.size > 0) {
    try {
      await subirDocumento(id, documento);
    } catch (e) {
      return {
        error:
          e instanceof Error
            ? e.message
            : "Entrenamiento creado, pero el archivo no se pudo subir",
      };
    }
  }

  return { success: true, id };
}

export async function actualizarEntrenamientoLocal(
  id: string,
  values: EntrenamientoFormValues,
  documento?: File | null,
): Promise<ActionResult> {
  const parsed = entrenamientoSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const patch = toEntrenamientoInsert(parsed.data);
  await localDb.entrenamientos.update(id, patch);
  await queueMutation("entrenamientos", "update", id, patch);

  if (documento && documento.size > 0) {
    try {
      await subirDocumento(id, documento);
    } catch (e) {
      return {
        error:
          e instanceof Error
            ? e.message
            : "Entrenamiento actualizado, pero el archivo no se pudo subir",
      };
    }
  }

  return { success: true, id };
}

export async function eliminarEntrenamientoLocal(id: string): Promise<SimpleResult> {
  const asistencias = await localDb.asistencias_entrenamiento
    .where("entrenamiento_id")
    .equals(id)
    .toArray();

  await localDb.transaction(
    "rw",
    [localDb.entrenamientos, localDb.asistencias_entrenamiento],
    async () => {
      await localDb.entrenamientos.delete(id);
      await localDb.asistencias_entrenamiento.bulkDelete(
        asistencias.map((a) => a.id),
      );
    },
  );

  // Las asistencias se borran en cascada en Supabase; solo hace falta
  // encolar el borrado del entrenamiento en sí.
  await queueMutation("entrenamientos", "delete", id);

  return { success: true };
}

// Fechas en formato "YYYY-MM-DD"; se generan en UTC para no arrastrar
// desfases de un día según la zona horaria del dispositivo.
function* fechasEnRango(inicio: string, fin: string) {
  const [y1, m1, d1] = inicio.split("-").map(Number);
  const [y2, m2, d2] = fin.split("-").map(Number);
  const cursor = new Date(Date.UTC(y1, m1 - 1, d1));
  const limite = new Date(Date.UTC(y2, m2 - 1, d2));

  while (cursor <= limite) {
    yield {
      fecha: cursor.toISOString().slice(0, 10),
      diaSemana: cursor.getUTCDay(),
    };
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
}

export async function generarEntrenamientosLocal(
  values: GenerarFormValues,
): Promise<
  { error: string } | { success: true; creados: number; omitidos: number }
> {
  const parsed = generarSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const { fecha_inicio, fecha_fin, dias, hora_inicio, hora_fin, lugar } =
    parsed.data;
  const diasSet = new Set(dias);

  const fechasCandidatas = Array.from(
    fechasEnRango(fecha_inicio, fecha_fin),
  ).filter((f) => diasSet.has(f.diaSemana));

  if (fechasCandidatas.length === 0) {
    return { error: "No hay ninguna fecha que coincida con los días elegidos" };
  }

  const existentes = await localDb.entrenamientos
    .where("fecha")
    .between(fecha_inicio, fecha_fin, true, true)
    .toArray();
  const fechasExistentes = new Set(existentes.map((e) => e.fecha));

  const aCrear = fechasCandidatas.filter((f) => !fechasExistentes.has(f.fecha));

  const now = new Date().toISOString();
  const nuevasFilas: LocalEntrenamiento[] = aCrear.map((f) => ({
    id: crypto.randomUUID(),
    fecha: f.fecha,
    hora_inicio: hora_inicio || null,
    hora_fin: hora_fin || null,
    lugar: lugar || null,
    objetivos: null,
    tarea_1: null,
    tarea_2: null,
    tarea_3: null,
    tarea_4: null,
    notas: null,
    documento_url: null,
    created_at: now,
  }));

  if (nuevasFilas.length > 0) {
    await localDb.entrenamientos.bulkPut(nuevasFilas);
    for (const fila of nuevasFilas) {
      await queueMutation("entrenamientos", "insert", fila.id, fila);
    }
  }

  return {
    success: true,
    creados: nuevasFilas.length,
    omitidos: fechasCandidatas.length - nuevasFilas.length,
  };
}

async function buscarAsistencia(entrenamientoId: string, jugadorId: string) {
  return localDb.asistencias_entrenamiento
    .where("entrenamiento_id")
    .equals(entrenamientoId)
    .filter((a) => a.jugador_id === jugadorId)
    .first();
}

export async function actualizarAsistenciaLocal(
  entrenamientoId: string,
  jugadorId: string,
  estadoId: string | null,
): Promise<SimpleResult> {
  const existente = await buscarAsistencia(entrenamientoId, jugadorId);

  if (estadoId === null) {
    if (existente) {
      await localDb.asistencias_entrenamiento.delete(existente.id);
      await queueMutation("asistencias_entrenamiento", "delete", existente.id);
    }
    return { success: true };
  }

  if (existente) {
    await localDb.asistencias_entrenamiento.update(existente.id, {
      estado_id: estadoId,
    });
    await queueMutation("asistencias_entrenamiento", "update", existente.id, {
      estado_id: estadoId,
    });
    return { success: true };
  }

  const id = crypto.randomUUID();
  const row: LocalAsistencia = {
    id,
    entrenamiento_id: entrenamientoId,
    jugador_id: jugadorId,
    estado_id: estadoId,
    notas: null,
  };
  await localDb.asistencias_entrenamiento.put(row);
  await queueMutation("asistencias_entrenamiento", "insert", id, row);

  return { success: true };
}
