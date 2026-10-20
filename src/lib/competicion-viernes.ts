// Competición de los viernes: cada ronda, cada jugador golpea una falta con la pierna derecha, otra
// con la izquierda y un penalti. Meter = 1 punto, fallar = 0 y meter con la pierna no dominante =
// doble (2). El penalti vale 1.

export type TipoTiro = "pierna_derecha" | "pierna_izquierda" | "penalti";

export const TIPOS_TIRO: { value: TipoTiro; label: string; corto: string }[] = [
  { value: "pierna_derecha", label: "Pierna derecha", corto: "P. dcha" },
  { value: "pierna_izquierda", label: "Pierna izquierda", corto: "P. izq" },
  { value: "penalti", label: "Penalti", corto: "Penalti" },
];

export interface TiroViernes {
  fecha: string;
  ronda: number;
  jugador_id: string;
  tipo: TipoTiro;
  /** 0 = falló, 1 = metió, 2 = metió con la pierna no dominante (doble). */
  puntos: number;
}

export type PiernaDominante = "izquierda" | "derecha" | "ambidiestro" | null | undefined;

/** Puntos que propone la app al meter: 2 con la pierna no dominante, 1 en los demás casos. */
export function puntosSugeridos(tipo: TipoTiro, dominante: PiernaDominante): number {
  if (tipo === "penalti") return 1;
  if (dominante !== "izquierda" && dominante !== "derecha") return 1;
  const pierna = tipo === "pierna_derecha" ? "derecha" : "izquierda";
  return pierna === dominante ? 1 : 2;
}

export interface ResumenJugadorViernes {
  jugador_id: string;
  puntos: number;
  aciertos: number;
  intentos: number;
  /** Aciertos con la pierna no dominante (los que valen doble). */
  dobles: number;
}

/** Puntos, aciertos e intentos de cada jugador con los tiros dados. */
export function resumirViernes(tiros: TiroViernes[]): Map<string, ResumenJugadorViernes> {
  const mapa = new Map<string, ResumenJugadorViernes>();
  for (const t of tiros) {
    const r =
      mapa.get(t.jugador_id) ??
      { jugador_id: t.jugador_id, puntos: 0, aciertos: 0, intentos: 0, dobles: 0 };
    r.puntos += t.puntos;
    r.intentos++;
    if (t.puntos > 0) r.aciertos++;
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
