"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/local-db";
import { TemporadaSelector } from "@/components/temporada-selector";
import { useTemporadaSeleccionada } from "@/lib/hooks/use-temporada-seleccionada";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResultadosChart } from "@/components/estadisticas/resultados-chart";
import { AsistenciaChart } from "@/components/estadisticas/asistencia-chart";
import { GoleadoresChart } from "@/components/estadisticas/goleadores-chart";
import { TiposGolChart } from "@/components/estadisticas/tipos-gol-chart";
import { MapaGoles } from "@/components/estadisticas/mapa-goles";
import { GolesIntervaloChart } from "@/components/estadisticas/goles-intervalo-chart";
import { JugadoresTable } from "@/components/estadisticas/jugadores-table";
import { BalanceTemporada } from "@/components/estadisticas/balance-temporada";
import { EtiquetasResumen } from "@/components/estadisticas/etiquetas-resumen";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { PdfWatermark } from "@/components/branding/pdf-watermark";
import {
  DURACION_PARTIDO_MINUTOS,
  calcularAsistenciaEquipoPorSesion,
  calcularGolesPorIntervalo,
  calcularGolesPorTipo,
  calcularResumenEquipo,
  calcularStatsJugadores,
} from "@/lib/estadisticas";
import { TIPOS_GOL } from "@/lib/validations/gol";
import { temporadaDeFecha } from "@/lib/temporada";

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
  const etiquetasDef = useLiveQuery(() => localDb.etiquetas.toArray(), [], []);
  const etiquetasPartidoTodas = useLiveQuery(
    () => localDb.etiquetas_partido.toArray(),
    [],
    [],
  );
  // Se necesitan también los jugadores dados de baja: uno etiquetado en un
  // partido de esta temporada no debería desaparecer del resumen solo por
  // no estar ya activo.
  const jugadoresTodos = useLiveQuery(() => localDb.jugadores.toArray(), [], []);

  const { temporada: temporadaSel } = useTemporadaSeleccionada();

  const partidosTemporada = useMemo(
    () => partidos.filter((p) => temporadaDeFecha(p.fecha) === temporadaSel),
    [partidos, temporadaSel],
  );
  const partidoIdsTemporada = useMemo(
    () => new Set(partidosTemporada.map((p) => p.id)),
    [partidosTemporada],
  );
  const eventosTemporada = useMemo(
    () => eventos.filter((e) => partidoIdsTemporada.has(e.partido_id)),
    [eventos, partidoIdsTemporada],
  );
  const convocatoriasTemporada = useMemo(
    () => convocatorias.filter((c) => partidoIdsTemporada.has(c.partido_id)),
    [convocatorias, partidoIdsTemporada],
  );
  const alineacionesTemporada = useMemo(
    () => alineaciones.filter((a) => partidoIdsTemporada.has(a.partido_id)),
    [alineaciones, partidoIdsTemporada],
  );
  const entrenamientosTemporada = useMemo(
    () => entrenamientos.filter((e) => temporadaDeFecha(e.fecha) === temporadaSel),
    [entrenamientos, temporadaSel],
  );
  const entrenamientoIdsTemporada = useMemo(
    () => new Set(entrenamientosTemporada.map((e) => e.id)),
    [entrenamientosTemporada],
  );
  const asistenciasTemporada = useMemo(
    () => asistencias.filter((a) => entrenamientoIdsTemporada.has(a.entrenamiento_id)),
    [asistencias, entrenamientoIdsTemporada],
  );

  const partidosJugados = useMemo(
    () =>
      partidosTemporada
        .filter((p) => p.resultado_favor != null && p.resultado_contra != null)
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .map((p) => ({
          id: p.id,
          fecha: p.fecha,
          rival: p.rival,
          resultado_favor: p.resultado_favor as number,
          resultado_contra: p.resultado_contra as number,
        })),
    [partidosTemporada],
  );

  const entrenamientosPasados = useMemo(
    () => entrenamientosTemporada.filter((e) => e.fecha <= hoy),
    [entrenamientosTemporada, hoy],
  );

  const asistenciasConNombre = useMemo(() => {
    const nombrePorEstado = new Map(estados.map((e) => [e.id, e.nombre]));
    return asistenciasTemporada
      .filter((a) => a.estado_id)
      .map((a) => ({
        entrenamiento_id: a.entrenamiento_id,
        jugador_id: a.jugador_id,
        estado_nombre: nombrePorEstado.get(a.estado_id as string) ?? "",
      }));
  }, [asistenciasTemporada, estados]);

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
        eventosTemporada,
        convocatoriasTemporada,
        alineacionesTemporada,
        entrenamientosPasados,
        asistenciasConNombre,
        hoy,
      ),
    [
      jugadores,
      eventosTemporada,
      convocatoriasTemporada,
      alineacionesTemporada,
      entrenamientosPasados,
      asistenciasConNombre,
      hoy,
    ],
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
      eventosTemporada
        .filter((e) => e.tipo_gol != null)
        .map((e) => ({ a_favor: e.a_favor, tipo_gol: e.tipo_gol as string })),
    [eventosTemporada],
  );
  const datosGoles = useMemo(
    () => calcularGolesPorTipo(goles, TIPOS_GOL),
    [goles],
  );
  const hayGoles = useMemo(
    () => datosGoles.some((d) => d.Favor > 0 || d.Contra > 0),
    [datosGoles],
  );

  const rivalPorPartidoId = useMemo(
    () => new Map(partidosTemporada.map((p) => [p.id, p.rival])),
    [partidosTemporada],
  );

  const golesUbicacion = useMemo(
    () =>
      eventosTemporada
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
          tipo_gol: e.tipo_gol,
          rival: rivalPorPartidoId.get(e.partido_id) ?? "Rival",
        })),
    [eventosTemporada, rivalPorPartidoId],
  );

  const golesPorMinuto = useMemo(
    () =>
      eventosTemporada
        .filter((e) => e.tipo === "gol" && e.minuto != null)
        .map((e) => ({ minuto: e.minuto, a_favor: e.a_favor })),
    [eventosTemporada],
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

  const registrosEtiquetas = useMemo(() => {
    const etiquetasPorId = new Map(etiquetasDef.map((e) => [e.id, e.nombre]));
    const jugadoresPorId = new Map(jugadoresTodos.map((j) => [j.id, j]));
    const partidosPorId = new Map(partidosTemporada.map((p) => [p.id, p]));

    return etiquetasPartidoTodas
      .filter((r) => partidoIdsTemporada.has(r.partido_id))
      .map((r) => {
        const partido = partidosPorId.get(r.partido_id);
        const jugador = r.jugador_id ? jugadoresPorId.get(r.jugador_id) : null;
        return {
          fecha: partido?.fecha ?? "",
          rival: partido?.rival ?? "",
          etiqueta: etiquetasPorId.get(r.etiqueta_id) ?? "Etiqueta",
          jugador: jugador
            ? jugador.alias || `${jugador.nombre} ${jugador.apellidos}`
            : "Equipo",
          minuto: r.minuto,
          nota: r.notas,
        };
      });
  }, [
    etiquetasPartidoTodas,
    etiquetasDef,
    jugadoresTodos,
    partidosTemporada,
    partidoIdsTemporada,
  ]);

  return (
    <div className="space-y-4">
      <PdfWatermark />
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Estadísticas</h1>
        <div className="flex items-center gap-2">
          <TemporadaSelector className="print:hidden" />
          <Button
            variant="outline"
            size="icon"
            className="print:hidden"
            aria-label="Exportar a PDF"
            onClick={() => window.print()}
          >
            <Printer className="size-4" />
          </Button>
        </div>
      </div>
      <p className="hidden text-sm text-muted-foreground print:block">
        Temporada {temporadaSel}
      </p>

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

      <BalanceTemporada
        temporada={temporadaSel}
        resumen={resumen}
        statsJugadores={statsJugadores}
        asistenciaEquipo={asistenciaEquipo}
      />

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
            <MapaGoles goles={golesUbicacion} tipos={TIPOS_GOL} />
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Etiquetas</CardTitle>
        </CardHeader>
        <CardContent>
          <EtiquetasResumen
            registros={registrosEtiquetas}
            temporada={temporadaSel}
          />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Los minutos usan los eventos &quot;Entra al campo&quot; / &quot;Sale
        del campo&quot; registrados en cada partido; si no se registra ningún
        cambio para un jugador, se asume que el titular jugó el partido
        completo ({DURACION_PARTIDO_MINUTOS} min) y el suplente no llegó a
        entrar.
      </p>
    </div>
  );
}
