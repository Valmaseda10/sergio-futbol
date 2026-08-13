"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  estadoFormDataToValues,
  estadoSchema,
} from "@/lib/validations/estado";
import type { Rol } from "@/lib/types/database.types";

type ActionResult = { error: string } | { success: true; id: string };
type SimpleResult = { error: string } | { success: true };

export async function crearEstado(formData: FormData): Promise<ActionResult> {
  const parsed = estadoSchema.safeParse(estadoFormDataToValues(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("estados")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "No se ha podido crear el estado" };
  }

  revalidatePath("/ajustes");
  return { success: true, id: data.id };
}

export async function actualizarEstado(
  id: string,
  formData: FormData,
): Promise<SimpleResult> {
  const parsed = estadoSchema.safeParse(estadoFormDataToValues(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("estados")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/ajustes");
  return { success: true };
}

export async function toggleActivoEstado(
  id: string,
  activo: boolean,
): Promise<SimpleResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("estados")
    .update({ activo })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/ajustes");
  return { success: true };
}

async function contarAdminsActivos(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { count } = await supabase
    .from("usuarios")
    .select("id", { count: "exact", head: true })
    .eq("rol", "admin")
    .eq("activo", true);

  return count ?? 0;
}

export async function toggleActivoUsuario(
  id: string,
  activo: boolean,
): Promise<SimpleResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!activo && user?.id === id) {
    const admins = await contarAdminsActivos(supabase);
    const { data: objetivo } = await supabase
      .from("usuarios")
      .select("rol")
      .eq("id", id)
      .single();

    if (objetivo?.rol === "admin" && admins <= 1) {
      return {
        error: "No puedes desactivarte: eres el único admin activo.",
      };
    }
  }

  const { error } = await supabase
    .from("usuarios")
    .update({ activo })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/ajustes");
  return { success: true };
}

export async function cambiarRolUsuario(
  id: string,
  rol: Rol,
): Promise<SimpleResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (rol !== "admin" && user?.id === id) {
    const admins = await contarAdminsActivos(supabase);
    if (admins <= 1) {
      return {
        error: "No puedes quitarte el rol de admin: eres el único que queda.",
      };
    }
  }

  const { error } = await supabase
    .from("usuarios")
    .update({ rol })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/ajustes");
  return { success: true };
}

export async function eliminarUsuario(id: string): Promise<SimpleResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id === id) {
    const admins = await contarAdminsActivos(supabase);
    const { data: objetivo } = await supabase
      .from("usuarios")
      .select("rol")
      .eq("id", id)
      .single();

    if (objetivo?.rol === "admin" && admins <= 1) {
      return {
        error: "No puedes eliminarte: eres el único admin activo.",
      };
    }
  }

  const { error } = await supabase.from("usuarios").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(id).catch(() => {
    // El acceso ya ha quedado revocado al borrar la fila de usuarios;
    // si falla el borrado de la cuenta de Auth no es crítico.
  });

  revalidatePath("/ajustes");
  return { success: true };
}
