import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    nombre?: string;
    email?: string;
    password?: string;
    mensaje?: string;
  };

  const nombre = body.nombre?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const mensaje = body.mensaje?.trim() || null;

  if (!nombre || nombre.length < 2) {
    return NextResponse.json({ error: "Introduce tu nombre" }, { status: 400 });
  }
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Introduce un email válido" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 6 caracteres" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: yaUsuario } = await admin
    .from("usuarios")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (yaUsuario) {
    return NextResponse.json(
      { error: "Ya existe una cuenta con ese email" },
      { status: 409 },
    );
  }

  const { data: solicitudPendiente } = await admin
    .from("solicitudes_acceso")
    .select("id")
    .eq("email", email)
    .eq("estado", "pendiente")
    .maybeSingle();

  if (solicitudPendiente) {
    return NextResponse.json(
      { error: "Ya hay una solicitud pendiente con ese email" },
      { status: 409 },
    );
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  let userId = created?.user?.id;

  if (createError) {
    if (!createError.message.toLowerCase().includes("already been registered")) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    // Ya existe en Auth (p. ej. una solicitud anterior rechazada): reutiliza
    // la cuenta y actualiza la contraseña a la que acaba de elegir.
    let existente = null;
    for (let page = 1; page <= 5 && !existente; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      existente = data.users.find((u) => u.email === email) ?? null;
      if (!data.users.length || data.users.length < 200) break;
    }

    if (!existente) {
      return NextResponse.json(
        { error: "No se ha podido crear la cuenta" },
        { status: 500 },
      );
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(existente.id, {
      password,
      email_confirm: true,
    });
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    userId = existente.id;
  }

  if (!userId) {
    return NextResponse.json(
      { error: "No se ha podido crear la cuenta" },
      { status: 500 },
    );
  }

  const { error: insertError } = await admin.from("solicitudes_acceso").insert({
    nombre,
    email,
    mensaje,
    user_id: userId,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
