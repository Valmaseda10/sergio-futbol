"use client";

import { localDb, type LocalVideo } from "@/lib/db/local-db";
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

export async function eliminarVideoLocal(id: string): Promise<SimpleResult> {
  await localDb.videos.delete(id);
  await queueMutation("videos", "delete", id);
  return { success: true };
}
