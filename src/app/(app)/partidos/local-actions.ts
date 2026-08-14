// Reemplaza a actions.ts (Server Actions): todo el módulo de Partidos
// (partido, convocatoria, alineación, eventos, valoración) escribiendo
// primero en Dexie y encolando la mutación para Supabase.

import {
  localDb,
  type LocalAlineacion,
  type LocalConvocatoria,
  type LocalEventoPartido,
  type LocalPartido,
  type LocalValoracionPartido,
} from "@/lib/db/local-db";
import { queueMutation } from "@/lib/db/sync";
import { createClient } from "@/lib/supabase/client";
import { subirArchivoPrivado, extensionDeArchivo } from "@/lib/storage";
import {
  partidoSchema,
  toPartidoInsert,
  type PartidoFormValues,
} from "@/lib/validations/partido";
import type { TipoAbp, TipoEventoPartido, TipoGol } from "@/lib/types/database.types";

type ActionResult = { error: string } | { success: true; id: string };
type SimpleResult = { error: string } | { success: true };

async function subirFotoRival(partidoId: string, foto: File): Promise<void> {
  const path = `partidos/${partidoId}.${extensionDeArchivo(foto)}`;
  await subirArchivoPrivado(path, foto);

  const supabase = createClient();
  await supabase
    .from("partidos")
    .update({ foto_rival_url: path })
    .eq("id", partidoId);
  await localDb.partidos.update(partidoId, { foto_rival_url: path });
}

export async function crearPartidoLocal(
  values: PartidoFormValues,
  fotoRival?: File | null,
): Promise<ActionResult> {
  const parsed = partidoSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const id = crypto.randomUUID();
  const row: LocalPartido = {
    id,
    ...toPartidoInsert(parsed.data),
    foto_rival_url: null,
    created_at: new Date().toISOString(),
  };

  await localDb.partidos.put(row);
  await queueMutation("partidos", "insert", id, row);

  if (fotoRival && fotoRival.size > 0) {
    try {
      await subirFotoRival(id, fotoRival);
    } catch (e) {
      return {
        error:
          e instanceof Error
            ? e.message
            : "Partido creado, pero la foto no se pudo subir",
      };
    }
  }

  return { success: true, id };
}

export async function actualizarPartidoLocal(
  id: string,
  values: PartidoFormValues,
  fotoRival?: File | null,
): Promise<ActionResult> {
  const parsed = partidoSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const patch = toPartidoInsert(parsed.data);
  await localDb.partidos.update(id, patch);
  await queueMutation("partidos", "update", id, patch);

  if (fotoRival && fotoRival.size > 0) {
    try {
      await subirFotoRival(id, fotoRival);
    } catch (e) {
      return {
        error:
          e instanceof Error
            ? e.message
            : "Partido actualizado, pero la foto no se pudo subir",
      };
    }
  }

  return { success: true, id };
}

export async function eliminarPartidoLocal(id: string): Promise<SimpleResult> {
  const [convocatorias, alineaciones, eventos, valoraciones] =
    await Promise.all([
      localDb.convocatorias.where("partido_id").equals(id).toArray(),
      localDb.alineaciones.where("partido_id").equals(id).toArray(),
      localDb.eventos_partido.where("partido_id").equals(id).toArray(),
      localDb.valoraciones_partido.where("partido_id").equals(id).toArray(),
    ]);

  await localDb.transaction(
    "rw",
    [
      localDb.partidos,
      localDb.convocatorias,
      localDb.alineaciones,
      localDb.eventos_partido,
      localDb.valoraciones_partido,
    ],
    async () => {
      await localDb.partidos.delete(id);
      await localDb.convocatorias.bulkDelete(convocatorias.map((c) => c.id));
      await localDb.alineaciones.bulkDelete(alineaciones.map((a) => a.id));
      await localDb.eventos_partido.bulkDelete(eventos.map((e) => e.id));
      await localDb.valoraciones_partido.bulkDelete(
        valoraciones.map((v) => v.id),
      );
    },
  );

  // El resto de tablas relacionadas se borran en cascada en Supabase; solo
  // hace falta encolar el borrado del partido en sí.
  await queueMutation("partidos", "delete", id);

  return { success: true };
}

export async function toggleConvocadoLocal(
  partidoId: string,
  jugadorId: string,
  convocado: boolean,
): Promise<SimpleResult> {
  const existente = await localDb.convocatorias
    .where("partido_id")
    .equals(partidoId)
    .filter((c) => c.jugador_id === jugadorId)
    .first();

  if (!convocado) {
    if (existente) {
      await localDb.convocatorias.delete(existente.id);
      await queueMutation("convocatorias", "delete", existente.id);
    }
    return { success: true };
  }

  if (existente) {
    await localDb.convocatorias.update(existente.id, { convocado: true });
    await queueMutation("convocatorias", "update", existente.id, {
      convocado: true,
    });
    return { success: true };
  }

  const id = crypto.randomUUID();
  const row: LocalConvocatoria = {
    id,
    partido_id: partidoId,
    jugador_id: jugadorId,
    convocado: true,
    motivo_no_convocado: null,
  };
  await localDb.convocatorias.put(row);
  await queueMutation("convocatorias", "insert", id, row);

  return { success: true };
}

export async function guardarAlineacionLocal(
  partidoId: string,
  titulares: {
    jugadorId: string;
    posicion: string;
    posX?: number;
    posY?: number;
  }[],
  suplentesIds: string[],
): Promise<SimpleResult> {
  const existentes = await localDb.alineaciones
    .where("partido_id")
    .equals(partidoId)
    .toArray();
  const existentesPorJugador = new Map(
    existentes.map((a) => [a.jugador_id, a]),
  );

  const deseados = new Map<
    string,
    { titular: boolean; posicion: string | null; posX: number | null; posY: number | null }
  >();
  for (const t of titulares) {
    deseados.set(t.jugadorId, {
      titular: true,
      posicion: t.posicion,
      posX: t.posX ?? null,
      posY: t.posY ?? null,
    });
  }
  for (const jugadorId of suplentesIds) {
    deseados.set(jugadorId, {
      titular: false,
      posicion: null,
      posX: null,
      posY: null,
    });
  }

  const aBorrar = existentes.filter((a) => !deseados.has(a.jugador_id));

  await localDb.alineaciones.bulkDelete(aBorrar.map((a) => a.id));
  for (const a of aBorrar) {
    await queueMutation("alineaciones", "delete", a.id);
  }

  for (const [jugadorId, datos] of deseados) {
    const existente = existentesPorJugador.get(jugadorId);
    if (existente) {
      const patch = {
        titular: datos.titular,
        posicion_jugada: datos.posicion,
        pos_x: datos.posX,
        pos_y: datos.posY,
      };
      await localDb.alineaciones.update(existente.id, patch);
      await queueMutation("alineaciones", "update", existente.id, patch);
    } else {
      const id = crypto.randomUUID();
      const row: LocalAlineacion = {
        id,
        partido_id: partidoId,
        jugador_id: jugadorId,
        titular: datos.titular,
        posicion_jugada: datos.posicion,
        minuto_entra: null,
        minuto_sale: null,
        pos_x: datos.posX,
        pos_y: datos.posY,
      };
      await localDb.alineaciones.put(row);
      await queueMutation("alineaciones", "insert", id, row);
    }
  }

  return { success: true };
}

type EventoResult = { error: string } | { success: true; evento: LocalEventoPartido };

export async function crearEventoLocal(
  partidoId: string,
  jugadorId: string | null,
  tipo: TipoEventoPartido,
  minuto: string,
  golDetalle?: {
    aFavor?: boolean;
    tipoGol?: TipoGol | null;
    posX?: number | null;
    posY?: number | null;
    abpTipo?: TipoAbp | null;
    posXCentro?: number | null;
    posYCentro?: number | null;
  },
): Promise<EventoResult> {
  const id = crypto.randomUUID();
  const row: LocalEventoPartido = {
    id,
    partido_id: partidoId,
    jugador_id: jugadorId,
    tipo,
    minuto: minuto !== "" ? Number(minuto) : null,
    a_favor: golDetalle?.aFavor ?? true,
    tipo_gol: golDetalle?.tipoGol ?? null,
    pos_x: golDetalle?.posX ?? null,
    pos_y: golDetalle?.posY ?? null,
    abp_tipo: golDetalle?.abpTipo ?? null,
    pos_x_centro: golDetalle?.posXCentro ?? null,
    pos_y_centro: golDetalle?.posYCentro ?? null,
  };

  await localDb.eventos_partido.put(row);
  await queueMutation("eventos_partido", "insert", id, row);

  return { success: true, evento: row };
}

export async function eliminarEventoLocal(eventoId: string): Promise<SimpleResult> {
  await localDb.eventos_partido.delete(eventoId);
  await queueMutation("eventos_partido", "delete", eventoId);
  return { success: true };
}

export async function guardarValoracionLocal(
  partidoId: string,
  valoracionGeneral: string,
  ratingEquipo: string,
): Promise<SimpleResult> {
  const existente = await localDb.valoraciones_partido
    .where("partido_id")
    .equals(partidoId)
    .first();

  const payload = {
    valoracion_general: valoracionGeneral || null,
    rating_equipo: ratingEquipo !== "" ? Number(ratingEquipo) : null,
  };

  if (existente) {
    await localDb.valoraciones_partido.update(existente.id, payload);
    await queueMutation("valoraciones_partido", "update", existente.id, payload);
    return { success: true };
  }

  const id = crypto.randomUUID();
  const row: LocalValoracionPartido = { id, partido_id: partidoId, ...payload };
  await localDb.valoraciones_partido.put(row);
  await queueMutation("valoraciones_partido", "insert", id, row);

  return { success: true };
}
