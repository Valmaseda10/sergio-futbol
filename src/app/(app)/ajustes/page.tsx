import { createClient } from "@/lib/supabase/server";
import { SolicitudesPanel } from "@/components/ajustes/solicitudes-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AjustesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user!.id)
    .single();

  const isAdmin = usuario?.rol === "admin";

  const { data: solicitudes } = isAdmin
    ? await supabase
        .from("solicitudes_acceso")
        .select("id, nombre, email, mensaje, fecha_solicitud")
        .eq("estado", "pendiente")
        .order("fecha_solicitud", { ascending: true })
    : { data: null };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Ajustes</h1>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Solicitudes de acceso pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <SolicitudesPanel solicitudes={solicitudes ?? []} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-muted-foreground">
            Próximamente
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Aquí irá la gestión de estados personalizables y de usuarios (Fase
          6).
        </CardContent>
      </Card>
    </div>
  );
}
