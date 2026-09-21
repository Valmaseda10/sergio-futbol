// Duración aproximada de un partido de fútbol 11 en categoría base. Se usa
// como minuto de fin cuando un titular no tiene un evento "sale del campo"
// registrado (se asume que jugó el partido completo), y como minuto de fin
// para un suplente que entró pero no tiene "sale del campo" registrado.
export const DURACION_PARTIDO_MINUTOS = 70;

export interface JugadorBase {
  id: string;
  nombre: string;
  apellidos: string;
  dorsal: number | null;
  fecha_alta: string;
}

export type ResultadoPartido = "ganado" | "empatado" | "perdido";

export function resultadoPartido(
  favor: number,
  contra: number,
): ResultadoPartido {
  if (favor > contra) return "ganado";
  if (favor < contra) return "perdido";
  return "empatado";
}

/**
 * Ordena el marcador para mostrarlo como se lee cualquier resultado
 * publicado (local - visitante): si jugamos de visitante, nuestro
 * resultado (favor) va a la derecha en vez de siempre a la izquierda.
 */
export function marcadorLocalVisitante(
  favor: number,
  contra: number,
  localVisitante: "local" | "visitante",
): { izquierda: number; derecha: number } {
  return localVisitante === "visitante"
    ? { izquierda: contra, derecha: favor }
    : { izquierda: favor, derecha: contra };
}

export interface PartidoJugado {
  id: string;
  fecha: string;
  rival: string;
  resultado_favor: number;
  resultado_contra: number;
}

export interface EventoPartidoRow {
  partido_id: string;
  jugador_id: string | null;
  tipo:
    | "gol"
    | "asistencia"
    | "tarjeta_amarilla"
    | "tarjeta_roja"
    | "cambio_entra"
    | "cambio_sale"
    | "autogol";
  minuto: number | null;
  a_favor: boolean;
}

export interface ConvocatoriaRow {
  jugador_id: string;
}

export interface AlineacionRow {
  partido_id: string;
  jugador_id: string | null;
  titular: boolean;
}

export interface EntrenamientoRow {
  id: string;
  fecha: string;
}

export interface AsistenciaRow {
  entrenamiento_id: string;
  jugador_id: string;
  estado_nombre: string;
}

export interface JugadorStats {
  id: string;
  nombre: string;
  apellidos: string;
  dorsal: number | null;
  convocatorias: number;
  titularidades: number;
  suplencias: number;
  goles: number;
  asistencias: number;
  tarjetasAmarillas: number;
  tarjetasRojas: number;
  golesEncajados: number;
  minutosAprox: number;
  pctAsistencia: number | null;
  entrenamientosTotales: number;
  entrenamientosAsistidos: number;
  entrenamientosPerdidos: number;
}

export interface GolPartidoRow {
  a_favor: boolean;
  tipo_gol: string;
}

export interface ResumenEquipo {
  partidosJugados: number;
  victorias: number;
  empates: number;
  derrotas: number;
  golesFavor: number;
  golesContra: number;
}

export function calcularResumenEquipo(partidos: PartidoJugado[]): ResumenEquipo {
  let victorias = 0;
  let empates = 0;
  let derrotas = 0;
  let golesFavor = 0;
  let golesContra = 0;

  for (const p of partidos) {
    golesFavor += p.resultado_favor;
    golesContra += p.resultado_contra;
    if (p.resultado_favor > p.resultado_contra) victorias += 1;
    else if (p.resultado_favor === p.resultado_contra) empates += 1;
    else derrotas += 1;
  }

  return {
    partidosJugados: partidos.length,
    victorias,
    empates,
    derrotas,
    golesFavor,
    golesContra,
  };
}

export function calcularGolesPorTipo(
  goles: GolPartidoRow[],
  tipos: { value: string; label: string }[],
) {
  return tipos.map((t) => ({
    tipo: t.label,
    Favor: goles.filter((g) => g.a_favor && g.tipo_gol === t.value).length,
    Contra: goles.filter((g) => !g.a_favor && g.tipo_gol === t.value).length,
  }));
}

export function calcularAsistenciaEquipoPorSesion(
  entrenamientos: EntrenamientoRow[],
  asistencias: AsistenciaRow[],
  totalActivos: number,
) {
  if (totalActivos === 0) return [];

  const ausenciasPorEntrenamiento = new Map<string, Set<string>>();
  for (const a of asistencias) {
    if (a.estado_nombre === "SI") continue;
    const set = ausenciasPorEntrenamiento.get(a.entrenamiento_id) ?? new Set();
    set.add(a.jugador_id);
    ausenciasPorEntrenamiento.set(a.entrenamiento_id, set);
  }

  return entrenamientos
    .slice()
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((e) => {
      const ausentes = ausenciasPorEntrenamiento.get(e.id)?.size ?? 0;
      const presentes = Math.max(totalActivos - ausentes, 0);
      return {
        fecha: e.fecha,
        pctAsistencia: Math.round((presentes / totalActivos) * 100),
      };
    });
}

export function calcularStatsJugadores(
  jugadores: JugadorBase[],
  eventos: EventoPartidoRow[],
  convocatorias: ConvocatoriaRow[],
  alineaciones: AlineacionRow[],
  entrenamientos: EntrenamientoRow[],
  asistencias: AsistenciaRow[],
  hoyISO: string,
): JugadorStats[] {
  return jugadores.map((j) => {
    const eventosJugador = eventos.filter((e) => e.jugador_id === j.id);
    const convocatoriasJugador = convocatorias.filter(
      (c) => c.jugador_id === j.id,
    ).length;
    const alineacionesJugador = alineaciones.filter((a) => a.jugador_id === j.id);
    const titularidades = alineacionesJugador.filter((a) => a.titular).length;
    const suplencias = alineacionesJugador.filter((a) => !a.titular).length;

    // Minutos reales por partido: un titular empieza en el minuto 0; un
    // suplente solo cuenta minutos desde que tiene un evento "entra al
    // campo". Cada "sale del campo" cierra la ventana abierta; si después
    // hay otra "entra al campo" (típico en pretemporada, con cambios sin
    // límite y jugadores que repiten turno), se abre una ventana nueva — un
    // jugador puede sumar así varios tramos en el mismo partido, no solo
    // uno. Si al terminar los eventos sigue "dentro", la ventana se cierra
    // al final del partido.
    //
    // Goles encajados: goles del rival (o autogoles, que siempre cuentan en
    // contra) marcados con minuto dentro de esas mismas ventanas — para
    // saber cuántos goles se encajaron con el jugador en el campo, no en el
    // partido entero.
    let minutosJugados = 0;
    let golesEncajados = 0;
    for (const a of alineacionesJugador) {
      const eventosCambioPartido = eventosJugador
        .filter(
          (e): e is typeof e & { minuto: number } =>
            e.partido_id === a.partido_id &&
            (e.tipo === "cambio_entra" || e.tipo === "cambio_sale") &&
            e.minuto != null,
        )
        .slice()
        .sort((x, y) => {
          const diff = x.minuto - y.minuto;
          if (diff !== 0) return diff;
          // A igual minuto, la salida siempre se procesa antes que la
          // entrada (mismo motivo que en calcularOnceFinal).
          if (x.tipo === y.tipo) return 0;
          return x.tipo === "cambio_sale" ? -1 : 1;
        });

      const golesRivalPartido = eventos.filter(
        (e): e is typeof e & { minuto: number } =>
          e.partido_id === a.partido_id &&
          (e.tipo === "gol" || e.tipo === "autogol") &&
          !e.a_favor &&
          e.minuto != null,
      );

      let dentro = a.titular;
      let inicioVentana = a.titular ? 0 : null;

      for (const evento of eventosCambioPartido) {
        if (evento.tipo === "cambio_entra") {
          if (!dentro) {
            dentro = true;
            inicioVentana = evento.minuto;
          }
          continue;
        }
        if (dentro && inicioVentana != null) {
          minutosJugados += Math.max(0, evento.minuto - inicioVentana);
          golesEncajados += golesRivalPartido.filter(
            (g) => g.minuto >= inicioVentana! && g.minuto <= evento.minuto,
          ).length;
        }
        dentro = false;
        inicioVentana = null;
      }

      if (dentro && inicioVentana != null) {
        minutosJugados += Math.max(0, DURACION_PARTIDO_MINUTOS - inicioVentana);
        golesEncajados += golesRivalPartido.filter(
          (g) => g.minuto >= inicioVentana! && g.minuto <= DURACION_PARTIDO_MINUTOS,
        ).length;
      }
    }

    const entrenamientosDelJugador = entrenamientos.filter(
      (e) => e.fecha >= j.fecha_alta && e.fecha <= hoyISO,
    );
    const idsEntrenamientosJugador = new Set(
      entrenamientosDelJugador.map((e) => e.id),
    );
    const ausencias = new Set(
      asistencias
        .filter(
          (a) =>
            a.jugador_id === j.id &&
            a.estado_nombre !== "SI" &&
            idsEntrenamientosJugador.has(a.entrenamiento_id),
        )
        .map((a) => a.entrenamiento_id),
    ).size;

    const totalEntrenamientos = entrenamientosDelJugador.length;
    const pctAsistencia =
      totalEntrenamientos > 0
        ? Math.round(
            ((totalEntrenamientos - ausencias) / totalEntrenamientos) * 100,
          )
        : null;

    return {
      id: j.id,
      nombre: j.nombre,
      apellidos: j.apellidos,
      dorsal: j.dorsal,
      convocatorias: convocatoriasJugador,
      titularidades,
      suplencias,
      goles: eventosJugador.filter((e) => e.tipo === "gol").length,
      asistencias: eventosJugador.filter((e) => e.tipo === "asistencia").length,
      tarjetasAmarillas: eventosJugador.filter(
        (e) => e.tipo === "tarjeta_amarilla",
      ).length,
      tarjetasRojas: eventosJugador.filter((e) => e.tipo === "tarjeta_roja")
        .length,
      golesEncajados,
      minutosAprox: minutosJugados,
      pctAsistencia,
      entrenamientosTotales: totalEntrenamientos,
      entrenamientosAsistidos: totalEntrenamientos - ausencias,
      entrenamientosPerdidos: ausencias,
    };
  });
}

const INTERVALOS_GOL = [
  { desde: 0, hasta: 10 },
  { desde: 10, hasta: 20 },
  { desde: 20, hasta: 30 },
  { desde: 30, hasta: 40 },
  { desde: 40, hasta: 50 },
  { desde: 50, hasta: 60 },
  { desde: 60, hasta: 70 },
];

export interface GolMinutoRow {
  minuto: number | null;
  a_favor: boolean;
}

export function calcularGolesPorIntervalo(goles: GolMinutoRow[]) {
  return INTERVALOS_GOL.map(({ desde, hasta }) => {
    const enIntervalo = goles.filter(
      (g) =>
        g.minuto != null &&
        g.minuto >= desde &&
        (hasta === 70 ? g.minuto <= hasta : g.minuto < hasta),
    );
    return {
      intervalo: `${desde}-${hasta}`,
      Favor: enIntervalo.filter((g) => g.a_favor).length,
      Contra: enIntervalo.filter((g) => !g.a_favor).length,
    };
  });
}
