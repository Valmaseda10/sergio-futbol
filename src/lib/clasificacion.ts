// Clasificación de la liga calculada con los resultados de las actas (tabla `liga_partidos`):
// puntos, posición, partidos de cada equipo, racha y cara a cara entre dos equipos.

export interface PartidoLiga {
  id: string;
  jornada: number;
  fecha: string | null;
  local: string;
  visitante: string;
  goles_local: number;
  goles_visitante: number;
}

export type Resultado = "V" | "E" | "D";

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

export function partidosDeEquipo(partidos: PartidoLiga[], equipo: string): PartidoDeEquipo[] {
  const k = claveEquipo(equipo);
  const lista: PartidoDeEquipo[] = [];
  for (const p of partidos) {
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

/** Puntos, diferencia de goles y goles a favor (el orden de la tabla). */
export function calcularClasificacion(partidos: PartidoLiga[]): FilaClasificacion[] {
  const filas = new Map<string, FilaClasificacion>();
  const fila = (equipo: string) => {
    const k = claveEquipo(equipo);
    let f = filas.get(k);
    if (!f) {
      f = { equipo, posicion: 0, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0 };
      filas.set(k, f);
    }
    return f;
  };
  for (const p of partidos) {
    for (const [equipo, gf, gc] of [
      [p.local, p.goles_local, p.goles_visitante],
      [p.visitante, p.goles_visitante, p.goles_local],
    ] as const) {
      const f = fila(equipo);
      f.pj++;
      f.gf += gf;
      f.gc += gc;
      if (gf > gc) {
        f.g++;
        f.pts += 3;
      } else if (gf === gc) {
        f.e++;
        f.pts += 1;
      } else f.p++;
    }
  }
  const lista = [...filas.values()].map((f) => ({ ...f, dg: f.gf - f.gc }));
  lista.sort(
    (a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || a.equipo.localeCompare(b.equipo),
  );
  lista.forEach((f, i) => (f.posicion = i + 1));
  return lista;
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
