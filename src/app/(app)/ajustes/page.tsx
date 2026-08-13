import { createClient } from "@/lib/supabase/server";
import { SolicitudesPanel } from "@/components/ajustes/solicitudes-panel";
import { EstadosPanel } from "@/components/ajustes/estados-panel";
import { UsuariosPanel } from "@/components/ajustes/usuarios-panel";
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

  const [{ data: estados }, { data: solicitudes }, { data: usuarios }] =
    await Promise.all([
      supabase
        .from("estados")
        .select("id, nombre, color, tipo, activo")
        .order("tipo", { ascending: true })
        .order("nombre", { ascending: true }),
      isAdmin
        ? supabase
            .from("solicitudes_acceso")
            .select("id, nombre, email, mensaje, fecha_solicitud")
            .eq("estado", "pendiente")
            .order("fecha_solicitud", { ascending: true })
        : Promise.resolve({ data: null }),
      isAdmin
        ? supabase
            .from("usuarios")
            .select("id, nombre, email, rol, activo")
            .order("nombre", { ascending: true })
        : Promise.resolve({ data: null }),
    ]);

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
          <CardTitle>Estados</CardTitle>
        </CardHeader>
        <CardContent>
          <EstadosPanel estadosIniciales={estados ?? []} />
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <UsuariosPanel
              usuariosIniciales={usuarios ?? []}
              currentUserId={user!.id}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
