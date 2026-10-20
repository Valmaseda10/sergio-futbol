// Clasificación de la liga calculada con los resultados de las actas (tabla `liga_partidos`):
// puntos, posición, partidos de cada equipo, forma, local y visitante, porterías a cero, calendario
// de lo que queda y cara a cara entre dos equipos. Un partido sin goles apuntados es un partido por
// jugar (calendario).

export interface PartidoLiga {
  id: string;
  jornada: number;
  fecha: string | null;
  hora?: string | null;
  local: string;
  visitante: string;
  goles_local: number | null;
  goles_visitante: number | null;
}

export type Resultado = "V" | "E" | "D";
export type Ambito = "total" | "local" | "visitante";

export interface FilaClasificacion {
  equipo: string;
  posicion: number;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
  /** Puntos por partido. */
  ppp: number;
  /** Partidos con la portería a cero. */
  cs: number;
  /** Partidos sin marcar. */
  sg: number;
  /** Resultados de sus últimos 5 partidos (el último, al final). */
  forma: Resultado[];
  ptsForma: number;
}

export interface PartidoDeEquipo {
  id: string;
  jornada: number;
  fecha: string | null;
  rival: string;
  /** El equipo jugó en casa. */
  local: boolean;
  gf: number;
  gc: number;
  resultado: Resultado;
}

export interface PartidoPorJugar {
  id: string;
  jornada: number;
  fecha: string | null;
  hora: string | null;
  rival: string;
  local: boolean;
}

export const jugado = (p: PartidoLiga): p is PartidoLiga & { goles_local: number; goles_visitante: number } =>
  p.goles_local != null && p.goles_visitante != null;

/** "C.D. Flores del Sil" -> "c.d. flores del sil": para comparar nombres de distinta procedencia. */
export function claveEquipo(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/["“”']/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Nombre para enseñar: las B con comillas ("Atlético Pinilla "B""), como en el resto de la app. */
export function nombreMostrado(nombre: string): string {
  return nombre.replace(/\s+B$/, ' "B"');
}

export function resultadoDe(gf: number, gc: number): Resultado {
  return gf > gc ? "V" : gf === gc ? "E" : "D";
}

const puntosDe = (r: Resultado) => (r === "V" ? 3 : r === "E" ? 1 : 0);

/** Partidos ya jugados de un equipo, por jornada. */
export function partidosDeEquipo(partidos: PartidoLiga[], equipo: string): PartidoDeEquipo[] {
  const k = claveEquipo(equipo);
  const lista: PartidoDeEquipo[] = [];
  for (const p of partidos) {
    if (!jugado(p)) continue;
    const esLocal = claveEquipo(p.local) === k;
    const esVisitante = claveEquipo(p.visitante) === k;
    if (!esLocal && !esVisitante) continue;
    const gf = esLocal ? p.goles_local : p.goles_visitante;
    const gc = esLocal ? p.goles_visitante : p.goles_local;
    lista.push({
      id: p.id,
      jornada: p.jornada,
      fecha: p.fecha,
      rival: esLocal ? p.visitante : p.local,
      local: esLocal,
      gf,
      gc,
      resultado: resultadoDe(gf, gc),
    });
  }
  return lista.sort((a, b) => a.jornada - b.jornada);
}

/** Partidos que le quedan por jugar a un equipo (el calendario), por jornada. */
export function calendarioDe(partidos: PartidoLiga[], equipo: string): PartidoPorJugar[] {
  const k = claveEquipo(equipo);
  const lista: PartidoPorJugar[] = [];
  for (const p of partidos) {
    if (jugado(p)) continue;
    const esLocal = claveEquipo(p.local) === k;
    const esVisitante = claveEquipo(p.visitante) === k;
    if (!esLocal && !esVisitante) continue;
    lista.push({
      id: p.id,
      jornada: p.jornada,
      fecha: p.fecha,
      hora: p.hora ?? null,
      rival: esLocal ? p.visitante : p.local,
      local: esLocal,
    });
  }
  return lista.sort((a, b) => a.jornada - b.jornada);
}

/**
 * Tabla de la liga. Con `ambito` "local" o "visitante" solo cuenta lo jugado en casa o fuera
 * (cómo rinde cada equipo en cada campo). Orden: puntos, diferencia de goles y goles a favor.
 */
export function calcularClasificacion(partidos: PartidoLiga[], ambito: Ambito = "total"): FilaClasificacion[] {
  const filas = new Map<string, FilaClasificacion & { resultados: Resultado[] }>();
  const fila = (equipo: string) => {
    const k = claveEquipo(equipo);
    let f = filas.get(k);
    if (!f) {
      f = {
        equipo,
        posicion: 0,
        pj: 0,
        g: 0,
        e: 0,
        p: 0,
        gf: 0,
        gc: 0,
        dg: 0,
        pts: 0,
        ppp: 0,
        cs: 0,
        sg: 0,
        forma: [],
        ptsForma: 0,
        resultados: [],
      };
      filas.set(k, f);
    }
    return f;
  };
  const jugados = partidos.filter(jugado).sort((a, b) => a.jornada - b.jornada);
  for (const p of jugados) {
    for (const [equipo, gf, gc, enCasa] of [
      [p.local, p.goles_local, p.goles_visitante, true],
      [p.visitante, p.goles_visitante, p.goles_local, false],
    ] as const) {
      const f = fila(equipo);
      if ((ambito === "local" && !enCasa) || (ambito === "visitante" && enCasa)) continue;
      const r = resultadoDe(gf, gc);
      f.pj++;
      f.gf += gf;
      f.gc += gc;
      f.pts += puntosDe(r);
      if (r === "V") f.g++;
      else if (r === "E") f.e++;
      else f.p++;
      if (gc === 0) f.cs++;
      if (gf === 0) f.sg++;
      f.resultados.push(r);
    }
  }
  const lista = [...filas.values()]
    .filter((f) => ambito === "total" || f.pj > 0)
    .map((f) => {
      const forma = f.resultados.slice(-5);
      const { resultados, ...resto } = f;
      void resultados;
      return {
        ...resto,
        dg: f.gf - f.gc,
        ppp: f.pj > 0 ? f.pts / f.pj : 0,
        forma,
        ptsForma: forma.reduce((s, r) => s + puntosDe(r), 0),
      } as FilaClasificacion;
    });
  lista.sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || a.equipo.localeCompare(b.equipo));
  lista.forEach((f, i) => (f.posicion = i + 1));
  return lista;
}

/**
 * Dificultad del calendario que le queda a un equipo: puntos por partido medio de sus rivales
 * restantes comparado con la media de la liga, y posición media de esos rivales.
 */
export function dificultadCalendario(
  restantes: PartidoPorJugar[],
  tabla: FilaClasificacion[],
): { partidos: number; pppRivales: number; pppLiga: number; posicionMedia: number } | null {
  const conDatos = restantes
    .map((r) => tabla.find((f) => claveEquipo(f.equipo) === claveEquipo(r.rival)))
    .filter((f): f is FilaClasificacion => !!f && f.pj > 0);
  if (conDatos.length === 0) return null;
  const totalPts = tabla.reduce((s, f) => s + f.pts, 0);
  const totalPj = tabla.reduce((s, f) => s + f.pj, 0);
  return {
    partidos: restantes.length,
    pppRivales: conDatos.reduce((s, f) => s + f.ppp, 0) / conDatos.length,
    pppLiga: totalPj > 0 ? totalPts / totalPj : 0,
    posicionMedia: conDatos.reduce((s, f) => s + f.posicion, 0) / conDatos.length,
  };
}

/** Enfrentamientos directos entre dos equipos, desde el punto de vista del primero. */
export function caraACara(partidos: PartidoLiga[], a: string, b: string): PartidoDeEquipo[] {
  const kb = claveEquipo(b);
  return partidosDeEquipo(partidos, a).filter((p) => claveEquipo(p.rival) === kb);
}

/** Rivales que han jugado los dos equipos (menos ellos mismos): cómo le fue a cada uno. */
export function rivalesComunes(
  partidos: PartidoLiga[],
  a: string,
  b: string,
): { rival: string; deA: PartidoDeEquipo[]; deB: PartidoDeEquipo[] }[] {
  const ka = claveEquipo(a);
  const kb = claveEquipo(b);
  const pa = partidosDeEquipo(partidos, a);
  const pb = partidosDeEquipo(partidos, b);
  const comunes = new Map<string, string>();
  for (const x of pa) {
    const k = claveEquipo(x.rival);
    if (k !== kb && k !== ka && pb.some((y) => claveEquipo(y.rival) === k)) comunes.set(k, x.rival);
  }
  return [...comunes.entries()]
    .map(([k, rival]) => ({
      rival,
      deA: pa.filter((x) => claveEquipo(x.rival) === k),
      deB: pb.filter((x) => claveEquipo(x.rival) === k),
    }))
    .sort((x, y) => x.rival.localeCompare(y.rival));
}

/** "1º", "2º"... */
export function ordinal(n: number): string {
  return `${n}º`;
}
