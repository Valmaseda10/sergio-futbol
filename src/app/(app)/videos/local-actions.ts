"use client";

import {
  localDb,
  type LocalVideo,
  type LocalVideoSesion,
  type LocalVideoSesionClip,
} from "@/lib/db/local-db";
import { queueMutation } from "@/lib/db/sync";
import {
  videoSchema,
  toVideoInsert,
  type VideoFormValues,
} from "@/lib/validations/video";

type ActionResult = { error: string } | { success: true; id: string };
type SimpleResult = { error: string } | { success: true };

export async function crearVideoLocal(
  values: VideoFormValues,
): Promise<ActionResult> {
  const parsed = videoSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const id = crypto.randomUUID();
  const row: LocalVideo = {
    id,
    ...toVideoInsert(parsed.data),
    created_at: new Date().toISOString(),
  };

  await localDb.videos.put(row);
  await queueMutation("videos", "insert", id, row);

  return { success: true, id };
}

export async function crearClipDesdeVideoLocal(params: {
  videoOrigenId: string;
  titulo: string;
  segundoInicio: number;
  segundoFin: number;
}): Promise<ActionResult> {
  const origen = await localDb.videos.get(params.videoOrigenId);
  if (!origen) {
    return { error: "No se encuentra el vídeo original" };
  }

  const id = crypto.randomUUID();
  const row: LocalVideo = {
    id,
    titulo: params.titulo,
    url: origen.url,
    tipo: "clip",
    partido_id: origen.partido_id,
    evento_id: null,
    segundo_inicio: params.segundoInicio,
    segundo_fin: params.segundoFin,
    fecha: origen.fecha,
    notas: null,
    created_at: new Date().toISOString(),
  };

  await localDb.videos.put(row);
  await queueMutation("videos", "insert", id, row);

  return { success: true, id };
}

export async function eliminarVideoLocal(id: string): Promise<SimpleResult> {
  await localDb.videos.delete(id);
  await queueMutation("videos", "delete", id);
  return { success: true };
}

// Sesión de vídeo: varios clips ya guardados, reproducidos seguidos para
// enseñárselos a los jugadores de un tirón. No se genera ningún archivo
// nuevo (los clips siguen siendo YouTube con marcas de tiempo), solo se
// guarda en qué orden se reproducen.
export async function guardarSesionLocal(params: {
  id?: string;
  titulo: string;
  notas: string | null;
  clipIds: string[];
}): Promise<ActionResult> {
  const titulo = params.titulo.trim();
  if (!titulo) {
    return { error: "Ponle un título a la sesión" };
  }
  if (params.clipIds.length === 0) {
    return { error: "Añade al menos un clip" };
  }

  const id = params.id ?? crypto.randomUUID();

  if (params.id) {
    const patch = { titulo, notas: params.notas };
    await localDb.videos_sesiones.update(id, patch);
    await queueMutation("videos_sesiones", "update", id, patch);
  } else {
    const row: LocalVideoSesion = {
      id,
      titulo,
      notas: params.notas,
      created_at: new Date().toISOString(),
    };
    await localDb.videos_sesiones.put(row);
    await queueMutation("videos_sesiones", "insert", id, row);
  }

  const existentes = await localDb.videos_sesion_clips
    .where("sesion_id")
    .equals(id)
    .toArray();
  const existentesPorVideo = new Map(existentes.map((c) => [c.video_id, c]));
  const deseadosIds = new Set(params.clipIds);

  const aBorrar = existentes.filter((c) => !deseadosIds.has(c.video_id));
  await localDb.videos_sesion_clips.bulkDelete(aBorrar.map((c) => c.id));
  for (const c of aBorrar) {
    await queueMutation("videos_sesion_clips", "delete", c.id);
  }

  for (const [i, videoId] of params.clipIds.entries()) {
    const existente = existentesPorVideo.get(videoId);
    if (existente) {
      if (existente.orden !== i) {
        await localDb.videos_sesion_clips.update(existente.id, { orden: i });
        await queueMutation("videos_sesion_clips", "update", existente.id, { orden: i });
      }
    } else {
      const filaId = crypto.randomUUID();
      const row: LocalVideoSesionClip = {
        id: filaId,
        sesion_id: id,
        video_id: videoId,
        orden: i,
      };
      await localDb.videos_sesion_clips.put(row);
      await queueMutation("videos_sesion_clips", "insert", filaId, row);
    }
  }

  return { success: true, id };
}

export async function eliminarSesionLocal(id: string): Promise<SimpleResult> {
  const clips = await localDb.videos_sesion_clips
    .where("sesion_id")
    .equals(id)
    .toArray();

  await localDb.transaction(
    "rw",
    [localDb.videos_sesiones, localDb.videos_sesion_clips],
    async () => {
      await localDb.videos_sesiones.delete(id);
      await localDb.videos_sesion_clips.bulkDelete(clips.map((c) => c.id));
    },
  );

  await queueMutation("videos_sesiones", "delete", id);
  return { success: true };
}
