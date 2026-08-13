// Duración aproximada de un partido de fútbol 11 en categoría base,
// usada solo para estimar minutos jugados (no hay registro real de
// sustituciones en Alineación, solo titular/suplente).
export const DURACION_PARTIDO_MINUTOS = 70;

export interface JugadorBase {
  id: string;
  nombre: string;
  apellidos: string;
  dorsal: number | null;
  fecha_alta: string;
}

export interface PartidoJugado {
  id: string;
  fecha: string;
  rival: string;
  resultado_favor: number;
  resultado_contra: number;
}

export interface EventoPartidoRow {
  jugador_id: string;
  tipo: "gol" | "asistencia" | "tarjeta_amarilla" | "tarjeta_roja";
}

export interface ConvocatoriaRow {
  jugador_id: string;
}

export interface AlineacionRow {
  jugador_id: string;
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
  goles: number;
  asistencias: number;
  tarjetasAmarillas: number;
  tarjetasRojas: number;
  minutosAprox: number;
  pctAsistencia: number | null;
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
    const titularias = alineaciones.filter(
      (a) => a.jugador_id === j.id && a.titular,
    ).length;

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
      goles: eventosJugador.filter((e) => e.tipo === "gol").length,
      asistencias: eventosJugador.filter((e) => e.tipo === "asistencia").length,
      tarjetasAmarillas: eventosJugador.filter(
        (e) => e.tipo === "tarjeta_amarilla",
      ).length,
      tarjetasRojas: eventosJugador.filter((e) => e.tipo === "tarjeta_roja")
        .length,
      minutosAprox: titularias * DURACION_PARTIDO_MINUTOS,
      pctAsistencia,
    };
  });
}
