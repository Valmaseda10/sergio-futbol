import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResultadosChart } from "@/components/estadisticas/resultados-chart";
import { AsistenciaChart } from "@/components/estadisticas/asistencia-chart";
import { GoleadoresChart } from "@/components/estadisticas/goleadores-chart";
import { JugadoresTable } from "@/components/estadisticas/jugadores-table";
import {
  DURACION_PARTIDO_MINUTOS,
  calcularAsistenciaEquipoPorSesion,
  calcularResumenEquipo,
  calcularStatsJugadores,
} from "@/lib/estadisticas";

function hoyISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default async function EstadisticasPage() {
  const supabase = await createClient();
  const hoy = hoyISO();

  const [
    { data: jugadores },
    { data: partidos },
    { data: eventos },
    { data: convocatorias },
    { data: alineaciones },
    { data: entrenamientos },
    { data: asistencias },
    { data: estados },
  ] = await Promise.all([
    supabase
      .from("jugadores")
      .select("id, nombre, apellidos, dorsal, fecha_alta")
      .eq("activo", true),
    supabase
      .from("partidos")
      .select("id, fecha, rival, resultado_favor, resultado_contra")
      .not("resultado_favor", "is", null)
      .not("resultado_contra", "is", null)
      .order("fecha", { ascending: true }),
    supabase.from("eventos_partido").select("jugador_id, tipo"),
    supabase.from("convocatorias").select("jugador_id").eq("convocado", true),
    supabase.from("alineaciones").select("jugador_id, titular"),
    supabase.from("entrenamientos").select("id, fecha").lte("fecha", hoy),
    supabase
      .from("asistencias_entrenamiento")
      .select("entrenamiento_id, jugador_id, estado_id"),
    supabase.from("estados").select("id, nombre"),
  ]);

  const nombrePorEstado = new Map(
    (estados ?? []).map((e) => [e.id, e.nombre]),
  );
  const asistenciasConNombre = (asistencias ?? [])
    .filter((a) => a.estado_id)
    .map((a) => ({
      entrenamiento_id: a.entrenamiento_id,
      jugador_id: a.jugador_id,
      estado_nombre: nombrePorEstado.get(a.estado_id as string) ?? "",
    }));

  const partidosJugados = (partidos ?? []).map((p) => ({
    id: p.id,
    fecha: p.fecha,
    rival: p.rival,
    resultado_favor: p.resultado_favor as number,
    resultado_contra: p.resultado_contra as number,
  }));

  const resumen = calcularResumenEquipo(partidosJugados);

  const asistenciaEquipo = calcularAsistenciaEquipoPorSesion(
    entrenamientos ?? [],
    asistenciasConNombre,
    (jugadores ?? []).length,
  );

  const statsJugadores = calcularStatsJugadores(
    jugadores ?? [],
    eventos ?? [],
    convocatorias ?? [],
    alineaciones ?? [],
    entrenamientos ?? [],
    asistenciasConNombre,
    hoy,
  );

  const goleadores = statsJugadores
    .filter((j) => j.goles > 0)
    .sort((a, b) => b.goles - a.goles)
    .slice(0, 5)
    .map((j) => ({ nombre: `${j.nombre} ${j.apellidos}`, goles: j.goles }));

  const datosResultados = partidosJugados.map((p) => ({
    rival: `${p.rival} (${new Date(`${p.fecha}T00:00:00`).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })})`,
    Favor: p.resultado_favor,
    Contra: p.resultado_contra,
  }));

  const datosAsistencia = asistenciaEquipo.map((a) => ({
    fecha: new Date(`${a.fecha}T00:00:00`).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
    }),
    pctAsistencia: a.pctAsistencia,
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Estadísticas</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{resumen.partidosJugados}</p>
            <p className="text-xs text-muted-foreground">Partidos jugados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">
              {resumen.victorias}-{resumen.empates}-{resumen.derrotas}
            </p>
            <p className="text-xs text-muted-foreground">V-E-D</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{resumen.golesFavor}</p>
            <p className="text-xs text-muted-foreground">Goles a favor</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{resumen.golesContra}</p>
            <p className="text-xs text-muted-foreground">Goles en contra</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resultados por partido</CardTitle>
        </CardHeader>
        <CardContent>
          {datosResultados.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Todavía no hay partidos con resultado registrado.
            </p>
          ) : (
            <ResultadosChart datos={datosResultados} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Asistencia a entrenamientos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {datosAsistencia.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Todavía no hay entrenamientos registrados.
            </p>
          ) : (
            <AsistenciaChart datos={datosAsistencia} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top goleadores</CardTitle>
        </CardHeader>
        <CardContent>
          {goleadores.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Todavía no hay goles registrados.
            </p>
          ) : (
            <GoleadoresChart datos={goleadores} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Por jugador</CardTitle>
        </CardHeader>
        <CardContent>
          {statsJugadores.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay jugadores activos.
            </p>
          ) : (
            <JugadoresTable jugadores={statsJugadores} />
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Los minutos son una aproximación: se asume que cada titular juega el
        partido completo ({DURACION_PARTIDO_MINUTOS} min), ya que no se
        registran sustituciones reales.
      </p>
    </div>
  );
}
