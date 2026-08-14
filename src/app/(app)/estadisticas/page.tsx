"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/local-db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResultadosChart } from "@/components/estadisticas/resultados-chart";
import { AsistenciaChart } from "@/components/estadisticas/asistencia-chart";
import { GoleadoresChart } from "@/components/estadisticas/goleadores-chart";
import { TiposGolChart } from "@/components/estadisticas/tipos-gol-chart";
import { MapaGoles } from "@/components/estadisticas/mapa-goles";
import { GolesIntervaloChart } from "@/components/estadisticas/goles-intervalo-chart";
import { JugadoresTable } from "@/components/estadisticas/jugadores-table";
import {
  DURACION_PARTIDO_MINUTOS,
  calcularAsistenciaEquipoPorSesion,
  calcularGolesPorIntervalo,
  calcularGolesPorTipo,
  calcularResumenEquipo,
  calcularStatsJugadores,
} from "@/lib/estadisticas";
import { TIPOS_GOL } from "@/lib/validations/gol";

function hoyISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function EstadisticasPage() {
  const hoy = hoyISO();

  const jugadores = useLiveQuery(
    () => localDb.jugadores.filter((j) => j.activo).toArray(),
    [],
    [],
  );
  const partidos = useLiveQuery(() => localDb.partidos.toArray(), [], []);
  const eventos = useLiveQuery(
    () => localDb.eventos_partido.toArray(),
    [],
    [],
  );
  const convocatorias = useLiveQuery(
    () => localDb.convocatorias.filter((c) => c.convocado).toArray(),
    [],
    [],
  );
  const alineaciones = useLiveQuery(
    () => localDb.alineaciones.toArray(),
    [],
    [],
  );
  const entrenamientos = useLiveQuery(
    () => localDb.entrenamientos.toArray(),
    [],
    [],
  );
  const asistencias = useLiveQuery(
    () => localDb.asistencias_entrenamiento.toArray(),
    [],
    [],
  );
  const estados = useLiveQuery(() => localDb.estados.toArray(), [], []);

  const partidosJugados = useMemo(
    () =>
      partidos
        .filter((p) => p.resultado_favor != null && p.resultado_contra != null)
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .map((p) => ({
          id: p.id,
          fecha: p.fecha,
          rival: p.rival,
          resultado_favor: p.resultado_favor as number,
          resultado_contra: p.resultado_contra as number,
        })),
    [partidos],
  );

  const entrenamientosPasados = useMemo(
    () => entrenamientos.filter((e) => e.fecha <= hoy),
    [entrenamientos, hoy],
  );

  const asistenciasConNombre = useMemo(() => {
    const nombrePorEstado = new Map(estados.map((e) => [e.id, e.nombre]));
    return asistencias
      .filter((a) => a.estado_id)
      .map((a) => ({
        entrenamiento_id: a.entrenamiento_id,
        jugador_id: a.jugador_id,
        estado_nombre: nombrePorEstado.get(a.estado_id as string) ?? "",
      }));
  }, [asistencias, estados]);

  const resumen = useMemo(
    () => calcularResumenEquipo(partidosJugados),
    [partidosJugados],
  );

  const asistenciaEquipo = useMemo(
    () =>
      calcularAsistenciaEquipoPorSesion(
        entrenamientosPasados,
        asistenciasConNombre,
        jugadores.length,
      ),
    [entrenamientosPasados, asistenciasConNombre, jugadores],
  );

  const statsJugadores = useMemo(
    () =>
      calcularStatsJugadores(
        jugadores,
        eventos,
        convocatorias,
        alineaciones,
        entrenamientosPasados,
        asistenciasConNombre,
        hoy,
      ),
    [jugadores, eventos, convocatorias, alineaciones, entrenamientosPasados, asistenciasConNombre, hoy],
  );

  const goleadores = useMemo(
    () =>
      statsJugadores
        .filter((j) => j.goles > 0)
        .sort((a, b) => b.goles - a.goles)
        .slice(0, 5)
        .map((j) => ({ nombre: `${j.nombre} ${j.apellidos}`, goles: j.goles })),
    [statsJugadores],
  );

  const datosResultados = useMemo(
    () =>
      partidosJugados.map((p) => ({
        rival: `${p.rival} (${new Date(`${p.fecha}T00:00:00`).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })})`,
        Favor: p.resultado_favor,
        Contra: p.resultado_contra,
      })),
    [partidosJugados],
  );

  const goles = useMemo(
    () =>
      eventos
        .filter((e) => e.tipo_gol != null)
        .map((e) => ({ a_favor: e.a_favor, tipo_gol: e.tipo_gol as string })),
    [eventos],
  );
  const datosGoles = useMemo(
    () => calcularGolesPorTipo(goles, TIPOS_GOL),
    [goles],
  );
  const hayGoles = useMemo(
    () => datosGoles.some((d) => d.Favor > 0 || d.Contra > 0),
    [datosGoles],
  );

  const golesUbicacion = useMemo(
    () =>
      eventos
        .filter(
          (e) =>
            (e.tipo === "gol" || e.tipo === "autogol") &&
            e.pos_x != null &&
            e.pos_y != null,
        )
        .map((e) => ({
          pos_x: e.pos_x as number,
          pos_y: e.pos_y as number,
          a_favor: e.a_favor,
        })),
    [eventos],
  );

  const golesPorMinuto = useMemo(
    () =>
      eventos
        .filter((e) => e.tipo === "gol" && e.minuto != null)
        .map((e) => ({ minuto: e.minuto, a_favor: e.a_favor })),
    [eventos],
  );
  const datosIntervalos = useMemo(
    () => calcularGolesPorIntervalo(golesPorMinuto),
    [golesPorMinuto],
  );
  const hayGolesPorMinuto = useMemo(
    () => datosIntervalos.some((d) => d.Favor > 0 || d.Contra > 0),
    [datosIntervalos],
  );

  const datosAsistencia = useMemo(
    () =>
      asistenciaEquipo.map((a) => ({
        fecha: new Date(`${a.fecha}T00:00:00`).toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
        }),
        pctAsistencia: a.pctAsistencia,
      })),
    [asistenciaEquipo],
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Estadísticas</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="font-heading text-3xl tabular-nums">{resumen.partidosJugados}</p>
            <p className="text-xs text-muted-foreground">Partidos jugados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="font-heading text-3xl tabular-nums">
              {resumen.victorias}-{resumen.empates}-{resumen.derrotas}
            </p>
            <p className="text-xs text-muted-foreground">V-E-D</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="font-heading text-3xl tabular-nums text-pitch">{resumen.golesFavor}</p>
            <p className="text-xs text-muted-foreground">Goles a favor</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="font-heading text-3xl tabular-nums text-destructive">{resumen.golesContra}</p>
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
          <CardTitle className="text-base">Cómo han sido los goles</CardTitle>
        </CardHeader>
        <CardContent>
          {!hayGoles ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Todavía no hay goles registrados por tipo de jugada.
            </p>
          ) : (
            <TiposGolChart datos={datosGoles} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Goles por intervalo de tiempo</CardTitle>
        </CardHeader>
        <CardContent>
          {!hayGolesPorMinuto ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Todavía no hay goles con minuto registrado.
            </p>
          ) : (
            <GolesIntervaloChart datos={datosIntervalos} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mapa de goles</CardTitle>
        </CardHeader>
        <CardContent>
          {golesUbicacion.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Todavía no hay goles con ubicación registrada.
            </p>
          ) : (
            <MapaGoles goles={golesUbicacion} />
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
