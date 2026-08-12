"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  partidoFormDataToValues,
  partidoSchema,
  toPartidoInsert,
} from "@/lib/validations/partido";
import type { TipoEventoPartido } from "@/lib/types/database.types";

type ActionResult = { error: string } | { success: true; id: string };
type SimpleResult = { error: string } | { success: true };

export async function crearPartido(formData: FormData): Promise<ActionResult> {
  const values = partidoFormDataToValues(formData);
  const parsed = partidoSchema.safeParse(values);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("partidos")
    .insert(toPartidoInsert(parsed.data))
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "No se ha podido crear el partido" };
  }

  revalidatePath("/partidos");
  return { success: true, id: data.id };
}

export async function actualizarPartido(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const values = partidoFormDataToValues(formData);
  const parsed = partidoSchema.safeParse(values);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("partidos")
    .update(toPartidoInsert(parsed.data))
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/partidos");
  revalidatePath(`/partidos/${id}`);
  return { success: true, id };
}

export async function eliminarPartido(id: string): Promise<SimpleResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("partidos").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/partidos");
  return { success: true };
}

export async function toggleConvocado(
  partidoId: string,
  jugadorId: string,
  convocado: boolean,
): Promise<SimpleResult> {
  const supabase = await createClient();

  if (!convocado) {
    const { error } = await supabase
      .from("convocatorias")
      .delete()
      .eq("partido_id", partidoId)
      .eq("jugador_id", jugadorId);

    if (error) return { error: error.message };
    revalidatePath(`/partidos/${partidoId}/convocatoria`);
    return { success: true };
  }

  const { error } = await supabase.from("convocatorias").upsert(
    { partido_id: partidoId, jugador_id: jugadorId, convocado: true },
    { onConflict: "partido_id,jugador_id" },
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/partidos/${partidoId}/convocatoria`);
  return { success: true };
}

export async function guardarAlineacion(
  partidoId: string,
  titulares: { jugadorId: string; posicion: string }[],
  suplentesIds: string[],
): Promise<SimpleResult> {
  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("alineaciones")
    .delete()
    .eq("partido_id", partidoId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  const filas = [
    ...titulares.map((t) => ({
      partido_id: partidoId,
      jugador_id: t.jugadorId,
      titular: true,
      posicion_jugada: t.posicion,
    })),
    ...suplentesIds.map((jugadorId) => ({
      partido_id: partidoId,
      jugador_id: jugadorId,
      titular: false,
      posicion_jugada: null,
    })),
  ];

  if (filas.length > 0) {
    const { error: insertError } = await supabase
      .from("alineaciones")
      .insert(filas);

    if (insertError) {
      return { error: insertError.message };
    }
  }

  revalidatePath(`/partidos/${partidoId}`);
  revalidatePath(`/partidos/${partidoId}/alineacion`);
  return { success: true };
}

type EventoResult =
  | { error: string }
  | {
      success: true;
      evento: {
        id: string;
        jugador_id: string;
        tipo: TipoEventoPartido;
        minuto: number | null;
      };
    };

export async function crearEvento(
  partidoId: string,
  jugadorId: string,
  tipo: TipoEventoPartido,
  minuto: string,
): Promise<EventoResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("eventos_partido")
    .insert({
      partido_id: partidoId,
      jugador_id: jugadorId,
      tipo,
      minuto: minuto !== "" ? Number(minuto) : null,
    })
    .select("id, jugador_id, tipo, minuto")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "No se ha podido añadir el evento" };
  }

  revalidatePath(`/partidos/${partidoId}/eventos`);
  return { success: true, evento: data };
}

export async function eliminarEvento(
  eventoId: string,
  partidoId: string,
): Promise<SimpleResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("eventos_partido")
    .delete()
    .eq("id", eventoId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/partidos/${partidoId}/eventos`);
  return { success: true };
}

export async function guardarValoracion(
  partidoId: string,
  valoracionGeneral: string,
  ratingEquipo: string,
): Promise<SimpleResult> {
  const supabase = await createClient();

  const { data: existente } = await supabase
    .from("valoraciones_partido")
    .select("id")
    .eq("partido_id", partidoId)
    .maybeSingle();

  const payload = {
    valoracion_general: valoracionGeneral || null,
    rating_equipo: ratingEquipo !== "" ? Number(ratingEquipo) : null,
  };

  const { error } = existente
    ? await supabase
        .from("valoraciones_partido")
        .update(payload)
        .eq("id", existente.id)
    : await supabase
        .from("valoraciones_partido")
        .insert({ partido_id: partidoId, ...payload });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/partidos/${partidoId}/valoracion`);
  return { success: true };
}
