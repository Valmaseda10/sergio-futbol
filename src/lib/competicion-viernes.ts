// Competición de los viernes: cada ronda, cada jugador golpea una falta desde el perfil derecho,
// otra desde el izquierdo (mirando a la portería) y un penalti. Si no mete (casilla vacía) no suma;
// si mete con su pierna dominante vale 1 punto y con la menos dominante, 2.

export type TipoTiro = "perfil_derecho" | "perfil_izquierdo" | "penalti";

export const TIPOS_TIRO: { value: TipoTiro; label: string; corto: string }[] = [
  { value: "perfil_derecho", label: "Perfil derecho", corto: "Perfil dcho" },
  { value: "perfil_izquierdo", label: "Perfil izquierdo", corto: "Perfil izq" },
  { value: "penalti", label: "Penalti", corto: "Penalti" },
];

export interface TiroViernes {
  fecha: string;
  ronda: number;
  jugador_id: string;
  tipo: TipoTiro;
  /** 1 = metió con su pierna dominante, 2 = metió con la menos dominante (doble). */
  puntos: number;
}

export type PiernaDominante = "izquierda" | "derecha" | "ambidiestro" | null | undefined;

export interface ResumenJugadorViernes {
  jugador_id: string;
  puntos: number;
  /** Tiros que han entrado. */
  aciertos: number;
  /** Aciertos con la pierna menos dominante (los que valen doble). */
  dobles: number;
}

/** Puntos, aciertos e intentos de cada jugador con los tiros dados. */
export function resumirViernes(tiros: TiroViernes[]): Map<string, ResumenJugadorViernes> {
  const mapa = new Map<string, ResumenJugadorViernes>();
  for (const t of tiros) {
    const r =
      mapa.get(t.jugador_id) ??
      { jugador_id: t.jugador_id, puntos: 0, aciertos: 0, dobles: 0 };
    r.puntos += t.puntos;
    r.aciertos++;
    if (t.puntos === 2) r.dobles++;
    mapa.set(t.jugador_id, r);
  }
  return mapa;
}

/** El viernes de esta semana (hoy si es viernes, si no el último que pasó), en AAAA-MM-DD. */
export function ultimoViernes(hoy = new Date()): string {
  const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const dif = (d.getDay() - 5 + 7) % 7;
  d.setDate(d.getDate() - dif);
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}
