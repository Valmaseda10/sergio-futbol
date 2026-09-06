import { createClient } from "@/lib/supabase/server";
import { SolicitudesPanel } from "@/components/ajustes/solicitudes-panel";
import { EstadosPanel } from "@/components/ajustes/estados-panel";
import { EtiquetasPanel } from "@/components/ajustes/etiquetas-panel";
import { HorarioSemanalPanel } from "@/components/ajustes/horario-semanal-panel";
import { UsuariosPanel } from "@/components/ajustes/usuarios-panel";
import { CambiarPasswordPanel } from "@/components/ajustes/cambiar-password-panel";
import { CopiaSeguridadPanel } from "@/components/ajustes/copia-seguridad-panel";
import { CalendarioPanel } from "@/components/ajustes/calendario-panel";
import { TemporadaSelector } from "@/components/temporada-selector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AjustesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("rol, calendario_token")
    .eq("id", user!.id)
    .single();

  const isAdmin = usuario?.rol === "admin";

  const [{ data: solicitudes }, { data: usuarios }] = await Promise.all([
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

      <Card>
        <CardHeader>
          <CardTitle>Mi contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          <CambiarPasswordPanel />
        </CardContent>
      </Card>

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
          <CardTitle>Temporada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Entrenamientos, partidos y estadísticas se filtran por esta
            temporada en el resto de la app. Cámbiala aquí para editar o
            añadir datos de otra.
          </p>
          <TemporadaSelector />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horario semanal</CardTitle>
        </CardHeader>
        <CardContent>
          <HorarioSemanalPanel />
        </CardContent>
      </Card>

      {usuario?.calendario_token && (
        <Card>
          <CardHeader>
            <CardTitle>Calendario en el iPhone</CardTitle>
          </CardHeader>
          <CardContent>
            <CalendarioPanel calendarioTokenInicial={usuario.calendario_token} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Estados</CardTitle>
        </CardHeader>
        <CardContent>
          <EstadosPanel />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Etiquetas de partido</CardTitle>
        </CardHeader>
        <CardContent>
          <EtiquetasPanel />
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

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Copia de seguridad</CardTitle>
          </CardHeader>
          <CardContent>
            <CopiaSeguridadPanel />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
