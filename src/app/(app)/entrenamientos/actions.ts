"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  entrenamientoFormDataToValues,
  entrenamientoSchema,
  generarSchema,
  toEntrenamientoInsert,
  type GenerarFormValues,
} from "@/lib/validations/entrenamiento";

type ActionResult = { error: string } | { success: true; id: string };

export async function crearEntrenamiento(
  formData: FormData,
): Promise<ActionResult> {
  const values = entrenamientoFormDataToValues(formData);
  const parsed = entrenamientoSchema.safeParse(values);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entrenamientos")
    .insert(toEntrenamientoInsert(parsed.data))
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "No se ha podido crear el entrenamiento" };
  }

  revalidatePath("/entrenamientos");
  return { success: true, id: data.id };
}

export async function actualizarEntrenamiento(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const values = entrenamientoFormDataToValues(formData);
  const parsed = entrenamientoSchema.safeParse(values);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("entrenamientos")
    .update(toEntrenamientoInsert(parsed.data))
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/entrenamientos");
  revalidatePath(`/entrenamientos/${id}`);
  return { success: true, id };
}

export async function eliminarEntrenamiento(
  id: string,
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const { error } = await supabase.from("entrenamientos").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/entrenamientos");
  return { success: true };
}

// Fechas en formato "YYYY-MM-DD"; se generan en UTC para no arrastrar
// desfases de un día según la zona horaria del servidor.
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

export async function generarEntrenamientos(
  values: GenerarFormValues,
): Promise<{ error: string } | { success: true; creados: number; omitidos: number }> {
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

  const supabase = await createClient();
  const { data: existentes } = await supabase
    .from("entrenamientos")
    .select("fecha")
    .gte("fecha", fecha_inicio)
    .lte("fecha", fecha_fin);

  const fechasExistentes = new Set((existentes ?? []).map((e) => e.fecha));
  const aCrear = fechasCandidatas.filter(
    (f) => !fechasExistentes.has(f.fecha),
  );

  if (aCrear.length > 0) {
    const { error } = await supabase.from("entrenamientos").insert(
      aCrear.map((f) => ({
        fecha: f.fecha,
        hora_inicio: hora_inicio || null,
        hora_fin: hora_fin || null,
        lugar: lugar || null,
      })),
    );

    if (error) {
      return { error: error.message };
    }
  }

  revalidatePath("/entrenamientos");
  return {
    success: true,
    creados: aCrear.length,
    omitidos: fechasCandidatas.length - aCrear.length,
  };
}

export async function actualizarAsistencia(
  entrenamientoId: string,
  jugadorId: string,
  estadoId: string | null,
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();

  if (estadoId === null) {
    const { error } = await supabase
      .from("asistencias_entrenamiento")
      .delete()
      .eq("entrenamiento_id", entrenamientoId)
      .eq("jugador_id", jugadorId);

    if (error) return { error: error.message };
    revalidatePath(`/entrenamientos/${entrenamientoId}/asistencia`);
    return { success: true };
  }

  const { error } = await supabase
    .from("asistencias_entrenamiento")
    .upsert(
      {
        entrenamiento_id: entrenamientoId,
        jugador_id: jugadorId,
        estado_id: estadoId,
      },
      { onConflict: "entrenamiento_id,jugador_id" },
    );

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/entrenamientos/${entrenamientoId}/asistencia`);
  return { success: true };
}
