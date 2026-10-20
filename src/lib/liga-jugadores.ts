// Goleadores y tarjetas de la liga, calculados con los eventos de las actas (tabla `liga_eventos`).
// Los nombres son los del acta: se agrupan por equipo + nombre.

import { claveEquipo } from "@/lib/clasificacion";

export interface EventoLiga {
  jornada: number;
  acta: string;
  equipo: string;
  jugador: string;
  tipo: string;
  minuto: number | null;
}

/**
 * Amarillas de un ciclo: al llegar a este número hay sanción de un partido. Ajústalo si el reglamento
 * de la competición dice otra cosa.
 */
export const CICLO_AMARILLAS = 5;

export interface GoleadorLiga {
  equipo: string;
  jugador: string;
  goles: number;
  penaltis: number;
  /** Partidos en los que ha marcado. */
  partidos: number;
}

export interface TarjetasJugador {
  equipo: string;
  jugador: string;
  amarillas: number;
  dobleAmarilla: number;
  rojas: number;
  /** Jornada de su última tarjeta. */
  ultimaJornada: number;
}

const esGol = (t: string) => t === "gol" || t === "gol_penalti";

function delEquipo(eventos: EventoLiga[], equipo?: string): EventoLiga[] {
  if (!equipo) return eventos;
  const k = claveEquipo(equipo);
  return eventos.filter((e) => claveEquipo(e.equipo) === k);
}

/** Máximos goleadores (sin los goles en propia puerta). */
export function goleadores(eventos: EventoLiga[], equipo?: string): GoleadorLiga[] {
  const mapa = new Map<string, GoleadorLiga & { actas: Set<string> }>();
  for (const e of delEquipo(eventos, equipo)) {
    if (!esGol(e.tipo)) continue;
    const clave = `${claveEquipo(e.equipo)}|${e.jugador}`;
    const g = mapa.get(clave) ?? { equipo: e.equipo, jugador: e.jugador, goles: 0, penaltis: 0, partidos: 0, actas: new Set<string>() };
    g.goles++;
    if (e.tipo === "gol_penalti") g.penaltis++;
    g.actas.add(e.acta);
    mapa.set(clave, g);
  }
  return [...mapa.values()]
    .map(({ actas, ...g }) => ({ ...g, partidos: actas.size }))
    .sort((a, b) => b.goles - a.goles || a.partidos - b.partidos || a.jugador.localeCompare(b.jugador));
}

/** Tarjetas por jugador: las que más acumulan primero. */
export function tarjetas(eventos: EventoLiga[], equipo?: string): TarjetasJugador[] {
  const mapa = new Map<string, TarjetasJugador>();
  for (const e of delEquipo(eventos, equipo)) {
    if (e.tipo !== "amarilla" && e.tipo !== "doble_amarilla" && e.tipo !== "roja") continue;
    const clave = `${claveEquipo(e.equipo)}|${e.jugador}`;
    const t = mapa.get(clave) ?? {
      equipo: e.equipo,
      jugador: e.jugador,
      amarillas: 0,
      dobleAmarilla: 0,
      rojas: 0,
      ultimaJornada: 0,
    };
    if (e.tipo === "amarilla") t.amarillas++;
    else if (e.tipo === "doble_amarilla") t.dobleAmarilla++;
    else t.rojas++;
    t.ultimaJornada = Math.max(t.ultimaJornada, e.jornada);
    mapa.set(clave, t);
  }
  return [...mapa.values()].sort(
      (a, b) =>
        b.rojas + b.dobleAmarilla - (a.rojas + a.dobleAmarilla) ||
        b.amarillas - a.amarillas ||
        a.jugador.localeCompare(b.jugador),
    );
}

/**
 * Jugadores de un equipo que pueden perderse el próximo partido: los expulsados (roja o doble amarilla)
 * en su último partido jugado.
 */
export function expulsadosUltimoPartido(eventos: EventoLiga[], equipo: string, ultimaJornadaEquipo: number): TarjetasJugador[] {
  return tarjetas(eventos, equipo).filter((t) => (t.rojas > 0 || t.dobleAmarilla > 0) && t.ultimaJornada === ultimaJornadaEquipo);
}

/** Jugadores a una amarilla de la sanción del ciclo (apercibidos). */
export function apercibidos(eventos: EventoLiga[], equipo?: string): TarjetasJugador[] {
  return tarjetas(eventos, equipo).filter((t) => t.amarillas > 0 && t.amarillas % CICLO_AMARILLAS === CICLO_AMARILLAS - 1);
}
