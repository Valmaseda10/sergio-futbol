"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  jugadorFormDataToValues,
  jugadorSchema,
  toJugadorInsert,
} from "@/lib/validations/jugador";
import {
  valoracionJugadorFormDataToValues,
  valoracionJugadorSchema,
  toValoracionJugadorInsert,
} from "@/lib/validations/valoracion-jugador";

type ActionResult = { error: string } | { success: true; id: string };
type SimpleResult = { error: string } | { success: true };

async function subirFoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  jugadorId: string,
  foto: File,
) {
  const { error } = await supabase.storage
    .from("jugadores")
    .upload(jugadorId, foto, { upsert: true, contentType: foto.type });

  if (error) {
    throw new Error(`No se ha podido subir la foto: ${error.message}`);
  }
}

export async function crearJugador(formData: FormData): Promise<ActionResult> {
  const values = jugadorFormDataToValues(formData);
  const parsed = jugadorSchema.safeParse(values);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const supabase = await createClient();
  const { data: jugador, error } = await supabase
    .from("jugadores")
    .insert(toJugadorInsert(parsed.data))
    .select("id")
    .single();

  if (error || !jugador) {
    return { error: error?.message ?? "No se ha podido crear el jugador" };
  }

  const foto = formData.get("foto");
  if (foto instanceof File && foto.size > 0) {
    try {
      await subirFoto(supabase, jugador.id, foto);
      await supabase
        .from("jugadores")
        .update({ foto_url: jugador.id })
        .eq("id", jugador.id);
    } catch (e) {
      // El jugador ya se ha creado; solo avisamos del fallo de la foto.
      revalidatePath("/plantilla");
      return {
        error:
          e instanceof Error
            ? e.message
            : "Jugador creado, pero la foto no se pudo subir",
      };
    }
  }

  revalidatePath("/plantilla");
  return { success: true, id: jugador.id };
}

export async function actualizarJugador(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const values = jugadorFormDataToValues(formData);
  const parsed = jugadorSchema.safeParse(values);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("jugadores")
    .update(toJugadorInsert(parsed.data))
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  const foto = formData.get("foto");
  if (foto instanceof File && foto.size > 0) {
    try {
      await subirFoto(supabase, id, foto);
      await supabase.from("jugadores").update({ foto_url: id }).eq("id", id);
    } catch (e) {
      revalidatePath("/plantilla");
      revalidatePath(`/plantilla/${id}`);
      return {
        error:
          e instanceof Error
            ? e.message
            : "Jugador actualizado, pero la foto no se pudo subir",
      };
    }
  }

  revalidatePath("/plantilla");
  revalidatePath(`/plantilla/${id}`);
  return { success: true, id };
}

export async function toggleActivoJugador(
  id: string,
  activo: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("jugadores")
    .update({ activo })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/plantilla");
  revalidatePath(`/plantilla/${id}`);
  return { success: true, id };
}

type ValoracionResult =
  | { error: string }
  | {
      success: true;
      valoracion: {
        id: string;
        fecha: string;
        tecnica: number | null;
        fisico: number | null;
        tactica: number | null;
        actitud: number | null;
        notas: string | null;
      };
    };

export async function crearValoracionJugador(
  jugadorId: string,
  formData: FormData,
): Promise<ValoracionResult> {
  const values = valoracionJugadorFormDataToValues(formData);
  const parsed = valoracionJugadorSchema.safeParse(values);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("valoraciones_jugador")
    .insert(toValoracionJugadorInsert(jugadorId, parsed.data))
    .select("id, fecha, tecnica, fisico, tactica, actitud, notas")
    .single();

  if (error || !data) {
    return {
      error: error?.message ?? "No se ha podido guardar la valoración",
    };
  }

  revalidatePath(`/plantilla/${jugadorId}`);
  return { success: true, valoracion: data };
}

export async function eliminarValoracionJugador(
  id: string,
  jugadorId: string,
): Promise<SimpleResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("valoraciones_jugador")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/plantilla/${jugadorId}`);
  return { success: true };
}
