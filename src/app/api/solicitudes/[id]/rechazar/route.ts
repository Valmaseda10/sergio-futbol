import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // La política RLS de solicitudes_acceso ya exige rol admin para el update;
  // esta llamada falla silenciosamente devolviendo 0 filas si no lo es.
  const { data, error } = await supabase
    .from("solicitudes_acceso")
    .update({ estado: "rechazado" })
    .eq("id", id)
    .eq("estado", "pendiente")
    .select("id, user_id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: "No autorizado o solicitud ya resuelta" },
      { status: 403 },
    );
  }

  // La cuenta se había creado ya en Auth al enviar la solicitud; al
  // rechazarla se borra para que ese email quede libre y no quede una
  // cuenta con contraseña válida pero sin acceso real.
  const userId = data[0].user_id;
  if (userId) {
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(userId);
  }

  return NextResponse.json({ ok: true });
}
