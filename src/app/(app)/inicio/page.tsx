import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { InicioDashboard } from "@/components/inicio/inicio-dashboard";

export default async function InicioPage() {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");

  const supabase = await createClient();
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("nombre, rol")
    .eq("id", userId ?? "")
    .single();

  const isAdmin = usuario?.rol === "admin";

  const { count: solicitudesPendientes } = isAdmin
    ? await supabase
        .from("solicitudes_acceso")
        .select("id", { count: "exact", head: true })
        .eq("estado", "pendiente")
    : { count: 0 };

  return (
    <InicioDashboard
      nombre={usuario?.nombre ?? ""}
      isAdmin={isAdmin}
      solicitudesPendientes={solicitudesPendientes ?? 0}
    />
  );
}
