import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Rol } from "@/lib/types/database.types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Solo un admin autenticado (comprobado vía RLS con el cliente normal)
  // puede aprobar una solicitud.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: solicitante } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (solicitante?.rol !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { rol?: Rol };
  const rol: Rol = body.rol === "admin" ? "admin" : "staff";

  const { data: solicitud, error: fetchError } = await supabase
    .from("solicitudes_acceso")
    .select("id, nombre, email, estado, user_id")
    .eq("id", id)
    .single();

  if (fetchError || !solicitud) {
    return NextResponse.json(
      { error: "Solicitud no encontrada" },
      { status: 404 },
    );
  }

  if (solicitud.estado !== "pendiente") {
    return NextResponse.json(
      { error: "La solicitud ya fue resuelta" },
      { status: 409 },
    );
  }

  if (!solicitud.user_id) {
    return NextResponse.json(
      { error: "Esta solicitud no tiene una cuenta asociada" },
      { status: 409 },
    );
  }

  // La cuenta ya existe en Auth (se creó con su propia contraseña al enviar
  // la solicitud); aprobar solo consiste en darle acceso real creando su
  // fila en usuarios. No se envía ningún email.
  const admin = createAdminClient();

  const { error: insertError } = await admin.from("usuarios").insert({
    id: solicitud.user_id,
    nombre: solicitud.nombre,
    email: solicitud.email,
    rol,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("solicitudes_acceso")
    .update({ estado: "aprobado" })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
