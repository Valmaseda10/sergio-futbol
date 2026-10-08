// La tabla de objetivos (psicológico / táctico / técnico / físico) es la misma
// toda la semana: se pone en la primera sesión y las siguientes de esa semana
// (lunes a domingo) la heredan mientras no tengan una propia.

import type { LocalEntrenamiento } from "@/lib/db/local-db";
import {
  leerFicha,
  normalizarObjetivosTabla,
  objetivosTablaTieneContenido,
  type FichaEntrenamiento,
  type ObjetivosTabla,
} from "@/lib/ficha-entrenamiento";

/** Lunes de la semana de una fecha "AAAA-MM-DD", en el mismo formato. */
export function lunesDeLaSemana(fecha: string): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  const desdeLunes = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - desdeLunes);
  return d.toISOString().slice(0, 10);
}

export function fichaTieneTabla(ficha: FichaEntrenamiento): boolean {
  return (
    !!ficha.tabla_imagen_url ||
    (!!ficha.tabla_objetivos &&
      objetivosTablaTieneContenido(normalizarObjetivosTabla(ficha.tabla_objetivos)))
  );
}

export interface TablaHeredada {
  /** Sesión de la que se hereda. */
  origen: LocalEntrenamiento;
  imagenPath: string | null;
  tabla: ObjetivosTabla | null;
}

/**
 * Tabla que le toca a una sesión por heredarla: la de la sesión anterior de
 * la misma semana que tenga una (la más reciente). `null` si no hay ninguna.
 */
export function tablaHeredadaDe(
  actual: { id: string; fecha: string },
  sesionesDeLaSemana: LocalEntrenamiento[],
): TablaHeredada | null {
  const origen = sesionesDeLaSemana
    .filter(
      (s) =>
        s.id !== actual.id &&
        s.fecha < actual.fecha &&
        fichaTieneTabla(leerFicha(s.ficha)),
    )
    .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
  if (!origen) return null;
  const ficha = leerFicha(origen.ficha);
  return {
    origen,
    imagenPath: ficha.tabla_imagen_url ?? null,
    tabla: ficha.tabla_objetivos
      ? normalizarObjetivosTabla(ficha.tabla_objetivos)
      : null,
  };
}
