"use client";

// Rivales (antes "scouting" dentro de Partidos): escribe primero en Dexie y
// encola la mutación para Supabase, siguiendo el mismo patrón local-first
// que el resto de la app.

import {
  localDb,
  type LocalRivalScouting,
  type LocalRivalJugadorDestacado,
  type LocalRivalPlantillaJugador,
  type LocalRivalAlineacion,
  type LocalRivalGolIntervalo,
  type LocalRivalDocumento,
} from "@/lib/db/local-db";
import type { IntervaloGol } from "@/lib/types/database.types";
import { queueMutation } from "@/lib/db/sync";
import { createClient } from "@/lib/supabase/client";
import { subirArchivoPrivado, extensionDeArchivo } from "@/lib/storage";
import {
  rivalScoutingSchema,
  jugadorDestacadoSchema,
  plantillaJugadorSchema,
  toRivalScoutingInsert,
  toJugadorDestacadoInsert,
  toPlantillaJugadorInsert,
  type RivalScoutingFormValues,
  type JugadorDestacadoFormValues,
  type PlantillaJugadorFormValues,
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
  const plantilla = await localDb.rivales_plantilla
    .where("rival_id")
    .equals(id)
    .toArray();
  const alineacion = await localDb.rivales_alineacion
    .where("rival_id")
    .equals(id)
    .toArray();
  const golesIntervalo = await localDb.rivales_goles_intervalo
    .where("rival_id")
    .equals(id)
    .toArray();
  const documentos = await localDb.rivales_documentos
    .where("rival_id")
    .equals(id)
    .toArray();

  await localDb.transaction(
    "rw",
    [
      localDb.rivales_scouting,
      localDb.rivales_jugadores_destacados,
      localDb.rivales_plantilla,
      localDb.rivales_alineacion,
      localDb.rivales_goles_intervalo,
      localDb.rivales_documentos,
    ],
    async () => {
      await localDb.rivales_scouting.delete(id);
      await localDb.rivales_jugadores_destacados.bulkDelete(
        destacados.map((d) => d.id),
      );
      await localDb.rivales_plantilla.bulkDelete(plantilla.map((p) => p.id));
      await localDb.rivales_alineacion.bulkDelete(alineacion.map((a) => a.id));
      await localDb.rivales_goles_intervalo.bulkDelete(
        golesIntervalo.map((g) => g.id),
      );
      await localDb.rivales_documentos.bulkDelete(
        documentos.map((d) => d.id),
      );
    },
  );

  // Los destacados, la plantilla y la alineación ya sincronizados se borran
  // en cascada en Supabase con el borrado del rival. Pero si el rival se
  // borra antes de que su propio insert haya llegado a sincronizarse, esa
  // cascada nunca entra en juego: sin este paso, los inserts pendientes de
  // esas tablas se quedarían encolados para siempre intentando referenciar
  // un rival que no existe en ningún sitio.
  for (const d of destacados) {
    await queueMutation("rivales_jugadores_destacados", "delete", d.id);
  }
  for (const p of plantilla) {
    await queueMutation("rivales_plantilla", "delete", p.id);
  }
  for (const a of alineacion) {
    await queueMutation("rivales_alineacion", "delete", a.id);
  }
  for (const g of golesIntervalo) {
    await queueMutation("rivales_goles_intervalo", "delete", g.id);
  }
  for (const d of documentos) {
    await queueMutation("rivales_documentos", "delete", d.id);
  }
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

// Un tramo (0-15, 15-30...) se guarda solo cuando se toca por primera vez
// para ese rival — de ahí el upsert manual en vez de asumir que la fila ya
// existe, a diferencia de actualizarNotasRivalLocal que sí actualiza un
// campo que rivales_scouting siempre tiene desde que se crea el rival.
export async function actualizarGolesIntervaloRivalLocal(
  rivalId: string,
  intervalo: IntervaloGol,
  patch: Partial<Pick<LocalRivalGolIntervalo, "goles_favor" | "goles_contra">>,
): Promise<SimpleResult> {
  const existente = await localDb.rivales_goles_intervalo
    .where("rival_id")
    .equals(rivalId)
    .filter((g) => g.intervalo === intervalo)
    .first();

  if (existente) {
    await localDb.rivales_goles_intervalo.update(existente.id, patch);
    await queueMutation("rivales_goles_intervalo", "update", existente.id, patch);
    return { success: true };
  }

  const id = crypto.randomUUID();
  const row: LocalRivalGolIntervalo = {
    id,
    rival_id: rivalId,
    intervalo,
    goles_favor: patch.goles_favor ?? 0,
    goles_contra: patch.goles_contra ?? 0,
  };
  await localDb.rivales_goles_intervalo.put(row);
  await queueMutation("rivales_goles_intervalo", "insert", id, row);
  return { success: true };
}

export async function actualizarNotasRivalLocal(
  id: string,
  patch: Partial<
    Pick<LocalRivalScouting, "fase_ofensiva" | "fase_defensiva" | "abp" | "notas">
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

type PlantillaResult =
  | { error: string }
  | { success: true; jugador: LocalRivalPlantillaJugador };

export async function crearJugadorPlantillaLocal(
  rivalId: string,
  values: PlantillaJugadorFormValues,
): Promise<PlantillaResult> {
  const parsed = plantillaJugadorSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const id = crypto.randomUUID();
  const row: LocalRivalPlantillaJugador = {
    id,
    rival_id: rivalId,
    ...toPlantillaJugadorInsert(parsed.data),
    created_at: new Date().toISOString(),
  };

  await localDb.rivales_plantilla.put(row);
  await queueMutation("rivales_plantilla", "insert", id, row);

  return { success: true, jugador: row };
}

export async function actualizarJugadorPlantillaLocal(
  id: string,
  values: PlantillaJugadorFormValues,
): Promise<PlantillaResult> {
  const parsed = plantillaJugadorSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const patch = toPlantillaJugadorInsert(parsed.data);
  await localDb.rivales_plantilla.update(id, patch);
  await queueMutation("rivales_plantilla", "update", id, patch);

  const jugador = await localDb.rivales_plantilla.get(id);
  if (!jugador) {
    return { error: "No se ha encontrado el jugador tras guardar" };
  }

  return { success: true, jugador };
}

export async function eliminarJugadorPlantillaLocal(
  id: string,
): Promise<SimpleResult> {
  await localDb.rivales_plantilla.delete(id);
  await queueMutation("rivales_plantilla", "delete", id);
  return { success: true };
}

export interface FichaAlineacionGuardar {
  nombre: string | null;
  dorsal: number | null;
  posX: number;
  posY: number;
}

/** Alineación que puso el rival contra nosotros: como son fichas sueltas sin
 * una fila real con la que emparejar cada una (igual que las fichas rival
 * del campograma), se guarda reemplazando todo el conjunto cada vez en vez
 * de comparar fila a fila con lo existente. */
export async function guardarAlineacionRivalLocal(
  rivalId: string,
  fichas: FichaAlineacionGuardar[],
): Promise<SimpleResult> {
  const existentes = await localDb.rivales_alineacion
    .where("rival_id")
    .equals(rivalId)
    .toArray();

  await localDb.rivales_alineacion.bulkDelete(existentes.map((f) => f.id));
  for (const f of existentes) {
    await queueMutation("rivales_alineacion", "delete", f.id);
  }

  for (let i = 0; i < fichas.length; i++) {
    const f = fichas[i];
    const filaId = crypto.randomUUID();
    const row: LocalRivalAlineacion = {
      id: filaId,
      rival_id: rivalId,
      nombre: f.nombre,
      dorsal: f.dorsal,
      posicion_jugada: null,
      pos_x: f.posX,
      pos_y: f.posY,
      orden: i,
    };
    await localDb.rivales_alineacion.put(row);
    await queueMutation("rivales_alineacion", "insert", filaId, row);
  }

  return { success: true };
}

type DocumentoResult =
  | { error: string }
  | { success: true; documento: LocalRivalDocumento };

// Hojas de partido u otros documentos apuntados a mano contra este rival:
// a diferencia de la foto (un único campo en rivales_scouting), puede haber
// varios por rival (ida/vuelta, distintas competiciones), así que van en su
// propia tabla en vez de sobrescribir un campo fijo.
export async function subirDocumentoRivalLocal(
  rivalId: string,
  nombre: string,
  archivo: File,
): Promise<DocumentoResult> {
  const nombreLimpio = nombre.trim();
  if (!nombreLimpio) {
    return { error: "Introduce un nombre para el documento" };
  }

  const id = crypto.randomUUID();
  const path = `scouting-docs/${rivalId}/${id}.${extensionDeArchivo(archivo)}`;

  try {
    await subirArchivoPrivado(path, archivo);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "No se ha podido subir el archivo",
    };
  }

  const row: LocalRivalDocumento = {
    id,
    rival_id: rivalId,
    nombre: nombreLimpio,
    archivo_url: path,
    created_at: new Date().toISOString(),
  };

  await localDb.rivales_documentos.put(row);
  await queueMutation("rivales_documentos", "insert", id, row);

  return { success: true, documento: row };
}

export async function eliminarDocumentoRivalLocal(
  id: string,
): Promise<SimpleResult> {
  await localDb.rivales_documentos.delete(id);
  await queueMutation("rivales_documentos", "delete", id);
  return { success: true };
}
