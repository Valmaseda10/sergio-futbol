// Datos de la cabecera de la sesión que se rellenan solos: el número de sesión (en
// orden de fechas, "24-MARTES") y el rival de la semana (el del partido de ese fin de
// semana). Funciones puras sobre listas ya leídas, más sus versiones que leen Dexie.

import { localDb } from "@/lib/db/local-db";

const DIAS = ["DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"];

interface SesionBasica {
  id: string;
  fecha: string;
  ficha: unknown;
}

interface PartidoBasico {
  fecha: string;
  rival: string;
}

function diaSemana(fecha: string): string {
  return DIAS[new Date(`${fecha}T00:00:00`).getDay()];
}

/** "24" + "2026-10-13" -> "24-MARTES". */
export function etiquetaSesion(numero: number, fecha: string): string {
  return `${numero}-${diaSemana(fecha)}`;
}

/** El número con el que empieza el texto del nº de sesión ("22- JUEVES" -> 22). */
export function numeroDeSesion(texto: string | null | undefined): number | null {
  const m = texto?.match(/^\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

function numeroGuardado(s: SesionBasica): number | null {
  const ficha = s.ficha as { numero_sesion?: string } | null;
  return numeroDeSesion(ficha?.numero_sesion);
}

/**
 * Número que le toca a una sesión por fecha: el de la sesión anterior con número + 1
 * (las anteriores sin número cuentan igualmente una cada una, para no dejar huecos).
 */
export function numeroSesionDe(
  sesiones: SesionBasica[],
  fecha: string,
  ignorarId?: string,
): number {
  const previas = sesiones
    .filter((s) => s.id !== ignorarId && s.fecha < fecha)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  let n = 0;
  for (const s of previas) n = numeroGuardado(s) ?? n + 1;
  return n + 1;
}

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** "C.D.F. Peña Elyte "B"" -> "PEÑA ELYTE B", "Veguellina C.F." -> "VEGUELLINA". */
export function nombreCortoRival(rival: string): string {
  let s = rival.replace(/["“”]/g, "").replace(/\s+/g, " ").trim();
  s = s.replace(/^(C\.D\.F\.|C\.D\.|C\.F\.|F\.C\.|S\.A\.D\.|U\.D\.|A\.D\.)\s+/i, "");
  s = s.replace(/\s+(C\.F\.|F\.C\.|C\.D\.|S\.A\.D\.)$/i, "");
  return s.toUpperCase();
}

/** Rival del primer partido que hay desde esa fecha hasta 6 días después (el del finde). */
export function rivalDeLaSemanaDe(partidos: PartidoBasico[], fecha: string): string {
  const fin = sumarDias(fecha, 6);
  const p = partidos
    .filter((x) => x.fecha >= fecha && x.fecha <= fin)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
  return p ? nombreCortoRival(p.rival) : "";
}

export async function numeroSesionAuto(fecha: string, ignorarId?: string): Promise<string> {
  const sesiones = await localDb.entrenamientos.toArray();
  return etiquetaSesion(numeroSesionDe(sesiones, fecha, ignorarId), fecha);
}

export async function rivalDeLaSemanaAuto(fecha: string): Promise<string> {
  const partidos = await localDb.partidos
    .where("fecha")
    .between(fecha, sumarDias(fecha, 6), true, true)
    .toArray();
  return rivalDeLaSemanaDe(partidos, fecha);
}

/** Etiquetas de varias sesiones nuevas (fechas ascendentes) que se crean de golpe. */
export function etiquetasSesionesNuevas(
  existentes: SesionBasica[],
  fechasNuevas: string[],
): Map<string, string> {
  const resultado = new Map<string, string>();
  const acumuladas = [...existentes];
  for (const fecha of [...fechasNuevas].sort()) {
    const n = numeroSesionDe(acumuladas, fecha);
    const etiqueta = etiquetaSesion(n, fecha);
    resultado.set(fecha, etiqueta);
    acumuladas.push({ id: `nueva-${fecha}`, fecha, ficha: { numero_sesion: etiqueta } });
  }
  return resultado;
}
