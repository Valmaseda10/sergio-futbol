// Plan de partido (ABP y hoja de partido): mismo patrón local-first que el
// resto de la app — se escribe en Dexie y se encola la mutación para Supabase.

import {
  localDb,
  type LocalHojaPartido,
  type LocalJugadaAbp,
} from "@/lib/db/local-db";
import { queueMutation } from "@/lib/db/sync";
import type { Diagrama } from "@/lib/ficha-entrenamiento";
import {
  alineacionVacia,
  fechaHoja,
  hojaAJson,
  hojaVacia,
  leerHoja,
  ponerNuestroEquipoEn,
  NUM_SUPLENTES,
  NUM_TITULARES,
  type FaseAbp,
  type TipoAbp,
  type HojaPartidoDatos,
  type JugadorAbp,
} from "@/lib/plan-partido";
import { DEMARCACION_ORDEN, demarcacionDePosicion } from "@/lib/posiciones";
import type { Json } from "@/lib/types/database.types";
import { clubConfig } from "@/lib/club-config";

type SimpleResult = { error: string } | { success: true };
type ActionResult = { error: string } | { success: true; id: string };

// ---- Jugadas de ABP ---------------------------------------------------------

export interface DatosJugadaAbp {
  nombre: string;
  fase: FaseAbp;
  tipo: TipoAbp;
  diagrama: Diagrama | null;
  jugadores: JugadorAbp[];
  notas: string;
}

function json(v: unknown): Json {
  return JSON.parse(JSON.stringify(v)) as Json;
}

export async function crearJugadaAbpLocal(
  datos: DatosJugadaAbp,
): Promise<ActionResult> {
  if (!datos.nombre.trim()) return { error: "Pon un nombre a la jugada" };
  const existentes = await localDb.jugadas_abp.toArray();
  const id = crypto.randomUUID();
  const row: LocalJugadaAbp = {
    id,
    nombre: datos.nombre.trim(),
    fase: datos.fase,
    tipo: datos.tipo,
    diagrama: datos.diagrama ? json(datos.diagrama) : null,
    jugadores: json(datos.jugadores),
    notas: datos.notas.trim() || null,
    orden: Math.max(0, ...existentes.map((j) => j.orden)) + 1,
    created_at: new Date().toISOString(),
  };
  await localDb.jugadas_abp.put(row);
  await queueMutation("jugadas_abp", "insert", id, row);
  return { success: true, id };
}

export async function actualizarJugadaAbpLocal(
  id: string,
  datos: DatosJugadaAbp,
): Promise<SimpleResult> {
  if (!datos.nombre.trim()) return { error: "Pon un nombre a la jugada" };
  const patch = {
    nombre: datos.nombre.trim(),
    fase: datos.fase,
    tipo: datos.tipo,
    diagrama: datos.diagrama ? json(datos.diagrama) : null,
    jugadores: json(datos.jugadores),
    notas: datos.notas.trim() || null,
  };
  await localDb.jugadas_abp.update(id, patch);
  await queueMutation("jugadas_abp", "update", id, patch);
  return { success: true };
}

export async function eliminarJugadaAbpLocal(id: string): Promise<SimpleResult> {
  await localDb.jugadas_abp.delete(id);
  await queueMutation("jugadas_abp", "delete", id);
  return { success: true };
}

/** Intercambia el orden de dos jugadas (para subir o bajar una dentro de su categoría). */
export async function intercambiarOrdenJugadasAbpLocal(
  idA: string,
  idB: string,
): Promise<SimpleResult> {
  const [a, b] = await Promise.all([
    localDb.jugadas_abp.get(idA),
    localDb.jugadas_abp.get(idB),
  ]);
  if (!a || !b) return { success: true };
  // Si tuvieran el mismo orden (importadas a la vez no, pero por si acaso), se
  // separan para que el intercambio tenga efecto.
  const ordenA = a.orden === b.orden ? b.orden + 1 : a.orden;
  await localDb.jugadas_abp.update(a.id, { orden: b.orden });
  await queueMutation("jugadas_abp", "update", a.id, { orden: b.orden });
  await localDb.jugadas_abp.update(b.id, { orden: ordenA });
  await queueMutation("jugadas_abp", "update", b.id, { orden: ordenA });
  return { success: true };
}

// ---- Hoja de partido --------------------------------------------------------

const nombreCorto = (j: { alias: string | null; nombre: string }) =>
  (j.alias || j.nombre).toUpperCase();

/**
 * Hoja nueva de un partido, ya con la cabecera y — si hay — la alineación y
 * los suplentes que ya se hayan puesto en la sección Partidos.
 */
async function hojaInicial(partidoId: string): Promise<HojaPartidoDatos> {
  const hoja = hojaVacia();
  const partido = await localDb.partidos.get(partidoId);
  if (partido) {
    hoja.cabecera.dia = fechaHoja(partido.fecha);
    hoja.cabecera.hora = (partido.hora ?? "").slice(0, 5);
    hoja.cabecera.rival = partido.rival.toUpperCase();
    hoja.cabecera.lugar = (partido.lugar ?? "").toUpperCase();
  }

  const [alineacion, convocatoria, jugadores] = await Promise.all([
    localDb.alineaciones.where("partido_id").equals(partidoId).toArray(),
    localDb.convocatorias.where("partido_id").equals(partidoId).toArray(),
    localDb.jugadores.toArray(),
  ]);
  const porId = new Map(jugadores.map((j) => [j.id, j]));
  const rango = (id: string | null) => {
    const dem = demarcacionDePosicion(id ? (porId.get(id)?.posicion ?? null) : null);
    const i = dem ? DEMARCACION_ORDEN.indexOf(dem) : DEMARCACION_ORDEN.length;
    return i < 0 ? DEMARCACION_ORDEN.length : i;
  };

  const titulares = alineacion
    .filter((a) => a.titular)
    .sort((a, b) => rango(a.jugador_id) - rango(b.jugador_id));
  const idsTitulares = new Set(titulares.map((a) => a.jugador_id));
  const nombreDe = (a: { jugador_id: string | null; nombre_libre: string | null }) => {
    const j = a.jugador_id ? porId.get(a.jugador_id) : undefined;
    return j ? nombreCorto(j) : (a.nombre_libre ?? "").toUpperCase();
  };
  const suplentes = convocatoria
    .filter((c) => c.convocado && !idsTitulares.has(c.jugador_id))
    .map((c) => porId.get(c.jugador_id))
    .filter((j): j is NonNullable<typeof j> => !!j)
    .sort((a, b) => rango(a.id) - rango(b.id));

  if (titulares.length > 0 || suplentes.length > 0) {
    const nuestra = alineacionVacia(clubConfig.nombreEquipo);
    titulares
      .slice(0, NUM_TITULARES)
      .forEach((a, i) => (nuestra.titulares[i] = nombreDe(a)));
    suplentes
      .slice(0, NUM_SUPLENTES)
      .forEach((j, i) => (nuestra.suplentes[i] = nombreCorto(j)));
    hoja.derecha = nuestra;
  }
  if (partido) hoja.izquierda.titulo = partido.rival;
  // Locales a la izquierda, visitantes a la derecha.
  return ponerNuestroEquipoEn(
    hoja,
    partido?.local_visitante === "local" ? "izquierda" : "derecha",
  );
}

/** La hoja de un partido; si todavía no existe, se crea con lo que ya se sabe. */
export async function obtenerOCrearHojaLocal(
  partidoId: string,
): Promise<LocalHojaPartido> {
  const existente = await localDb.hojas_partido
    .where("partido_id")
    .equals(partidoId)
    .first();
  if (existente) return existente;

  const row: LocalHojaPartido = {
    id: crypto.randomUUID(),
    partido_id: partidoId,
    datos: hojaAJson(await hojaInicial(partidoId)),
    created_at: new Date().toISOString(),
  };
  await localDb.hojas_partido.put(row);
  await queueMutation("hojas_partido", "insert", row.id, row);
  return row;
}

export async function guardarHojaLocal(
  id: string,
  datos: HojaPartidoDatos,
): Promise<SimpleResult> {
  const patch = { datos: hojaAJson(datos) };
  await localDb.hojas_partido.update(id, patch);
  await queueMutation("hojas_partido", "update", id, patch);
  return { success: true };
}

export { leerHoja };
