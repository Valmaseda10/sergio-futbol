import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Un usuario puede regenerar su propio token de calendario aunque la RLS de
// `usuarios` solo deje actualizar filas a un admin: aquí se verifica la
// sesión primero y se escribe con la service role solo sobre su propia fila.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const nuevoToken = randomUUID();
  const admin = createAdminClient();
  const { error } = await admin
    .from("usuarios")
    .update({ calendario_token: nuevoToken })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ calendarioToken: nuevoToken });
}
