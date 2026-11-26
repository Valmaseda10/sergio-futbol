// Plan de partido (ABP y hoja de partido): mismo patrón local-first que el
// resto de la app — se escribe en Dexie y se encola la mutación para Supabase.

import {
  localDb,
  type LocalHojaPartido,
  type LocalJugadaAbp,
  type LocalPresentacionPartido,
} from "@/lib/db/local-db";
import { queueMutation } from "@/lib/db/sync";
import {
  guardarAlineacionLocal,
  toggleConvocadoLocal,
} from "@/app/(app)/partidos/local-actions";
import { colocarTitulares, resolverCelda } from "@/lib/alineacion-desde-hoja";
import type { Diagrama } from "@/lib/ficha-entrenamiento";
import {
  alineacionVacia,
  fechaHoja,
  hojaAJson,
  hojaVacia,
  leerDiagramaAbp,
  leerHoja,
  leerJugadoresAbp,
  ponerNuestroEquipoEn,
  NUM_SUPLENTES,
  NUM_TITULARES,
  type FaseAbp,
  type AnalisisHoja,
  type TipoAbp,
  type HojaPartidoDatos,
  type JugadorAbp,
} from "@/lib/plan-partido";
import {
  presentacionAJson,
  presentacionInicial,
  type Diapositiva,
} from "@/lib/presentacion-partido";
import { DEMARCACION_ORDEN, demarcacionDePosicion } from "@/lib/posiciones";
import type { Json } from "@/lib/types/database.types";
import { clubConfig } from "@/lib/club-config";
import { claveEquipo } from "@/lib/clasificacion";

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
    orden: Math.max(0, ...existentes.filter((j) => !j.partido_id).map((j) => j.orden)) + 1,
    created_at: new Date().toISOString(),
    partido_id: null,
    origen_id: null,
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
 * Jornada de liga de un partido, sacada del calendario de la liga (`liga_partidos`):
 * el partido de nuestro equipo contra ese rival, mejor si además coincide la fecha.
 * Vacío si no es de liga o no se encuentra.
 */
async function jornadaDelPartido(partido: {
  rival: string;
  fecha: string;
  competicion: string | null;
}): Promise<string> {
  if (partido.competicion && partido.competicion !== "liga") return "";
  const propio = (n: string) => claveEquipo(n).includes("leonesa");
  const rivalKey = claveEquipo(partido.rival);
  const liga = await localDb.liga_partidos.toArray();
  const delRival = liga.filter((p) => {
    if (propio(p.local) === propio(p.visitante)) return false;
    const otro = claveEquipo(propio(p.local) ? p.visitante : p.local);
    return otro === rivalKey || otro.includes(rivalKey) || rivalKey.includes(otro);
  });
  const mismaFecha = delRival.filter((p) => p.fecha === partido.fecha);
  const elegido = mismaFecha.length === 1 ? mismaFecha[0] : delRival.length === 1 ? delRival[0] : null;
  return elegido ? String(elegido.jornada) : "";
}

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
    hoja.cabecera.jornada = await jornadaDelPartido(partido);
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
  if (existente) {
    // Las hojas ya creadas sin jornada la reciben del calendario (si no la escribieron a mano).
    const datos = leerHoja(existente.datos);
    const partido = datos.cabecera.jornada.trim() ? null : await localDb.partidos.get(partidoId);
    const jornada = partido ? await jornadaDelPartido(partido) : "";
    if (!jornada) return existente;
    const nuevos = { ...datos, cabecera: { ...datos.cabecera, jornada } };
    const actualizada = { ...existente, datos: hojaAJson(nuevos) };
    await guardarHojaLocal(existente.id, nuevos);
    return actualizada;
  }

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
  const anterior = await localDb.hojas_partido.get(id);
  const patch = { datos: hojaAJson(datos) };
  await localDb.hojas_partido.update(id, patch);
  await queueMutation("hojas_partido", "update", id, patch);

  // La alineación del día de partido sale de esta hoja: solo se vuelve a
  // sincronizar si lo que cambia son las casillas de nuestro equipo (así lo
  // que se retoque a mano en el campo no se pisa al escribir otras cosas).
  if (anterior) {
    const lista = (d: HojaPartidoDatos) => {
      const l = d[d.nuestro_lado];
      return JSON.stringify([l.titulares, l.suplentes]);
    };
    if (lista(leerHoja(anterior.datos)) !== lista(datos)) {
      try {
        await sincronizarAlineacionDesdeHojaLocal(anterior.partido_id);
      } catch {
        // La hoja ya está guardada; la sincronización se puede repetir a mano.
      }
    }
  }
  return { success: true };
}

/**
 * El análisis del rival de la hoja de partido según la ficha de scouting del rival (Rivales):
 * fase defensiva/ofensiva, transiciones, ABP y, en observaciones, el sistema de juego y las
 * notas. Solo devuelve los apartados que la ficha tiene escritos; quien llama decide cuáles
 * de la hoja rellena. `null` si el partido no tiene ficha de rival.
 */
export async function analisisDesdeRivalLocal(
  partidoId: string,
): Promise<Partial<AnalisisHoja> | null> {
  const partido = await localDb.partidos.get(partidoId);
  if (!partido) return null;
  let rival = partido.rival_scouting_id
    ? ((await localDb.rivales_scouting.get(partido.rival_scouting_id)) ?? null)
    : null;
  if (!rival) {
    const nombre = partido.rival.trim().toLowerCase();
    rival =
      (await localDb.rivales_scouting.filter((r) => r.nombre.trim().toLowerCase() === nombre).first()) ??
      null;
  }
  if (!rival) return null;

  const t = (s: string | null | undefined) => (s ?? "").trim();
  const out: Partial<AnalisisHoja> = {};
  if (t(rival.fase_defensiva)) out.fase_defensiva = t(rival.fase_defensiva);
  if (t(rival.fase_ofensiva)) out.fase_ofensiva = t(rival.fase_ofensiva);
  if (t(rival.transicion_defensiva)) out.transicion_defensiva = t(rival.transicion_defensiva);
  if (t(rival.transicion_ofensiva)) out.transicion_ofensiva = t(rival.transicion_ofensiva);
  // La ficha guarda el ABP del rival en un solo apartado: es cómo atacan a balón parado.
  if (t(rival.abp)) out.abp_ofensivo = t(rival.abp);
  const observaciones = [
    t(rival.sistema_juego) ? `Sistema: ${t(rival.sistema_juego)}` : "",
    t(rival.notas),
  ]
    .filter(Boolean)
    .join(String.fromCharCode(10));
  if (observaciones) out.observaciones = observaciones;
  return out;
}

export interface AlineacionRivalFicha {
  sistema: string;
  fichas: { numero: string; nombre: string; left: number; top: number }[];
}

/**
 * La alineación que el rival puso contra nosotros, dibujada en su ficha de Rivales
 * ("Alineación contra nosotros"), para llevarla al campograma de la hoja de partido.
 */
export async function alineacionRivalDesdeFichaLocal(
  partidoId: string,
): Promise<AlineacionRivalFicha | null> {
  const partido = await localDb.partidos.get(partidoId);
  if (!partido) return null;
  let rival = partido.rival_scouting_id
    ? ((await localDb.rivales_scouting.get(partido.rival_scouting_id)) ?? null)
    : null;
  if (!rival) {
    const nombre = partido.rival.trim().toLowerCase();
    rival =
      (await localDb.rivales_scouting.filter((r) => r.nombre.trim().toLowerCase() === nombre).first()) ??
      null;
  }
  if (!rival) return null;
  const filas = await localDb.rivales_alineacion.where("rival_id").equals(rival.id).sortBy("orden");
  return {
    sistema: (rival.sistema_juego ?? "").trim(),
    fichas: filas
      .filter((f) => !f.suplente)
      .slice(0, 11)
      .map((f) => ({
        numero: f.dorsal != null ? String(f.dorsal) : "",
        nombre: (f.nombre ?? "").trim(),
        left: f.pos_x,
        top: f.pos_y,
      })),
  };
}

export interface ResultadoSincronizacion {
  /** La hoja no existe o no tiene todavía a nadie de nuestro equipo. */
  sinDatos: boolean;
  /** La alineación guardada ya coincidía con la hoja (no se ha tocado). */
  sinCambios: boolean;
  titulares: number;
  suplentes: number;
  /** Casillas con un número sin dorsal en la plantilla, o ambiguas. */
  sinResolver: string[];
}

/**
 * Pone la alineación del partido (once inicial, suplentes y convocatoria) según la hoja de
 * partido: cada casilla de nuestro equipo se identifica por el dorsal (o por el nombre si no
 * hay número) y los titulares se colocan en el campo según su posición.
 */
export async function sincronizarAlineacionDesdeHojaLocal(
  partidoId: string,
  opciones: { forzar?: boolean } = {},
): Promise<ResultadoSincronizacion> {
  const vacio: ResultadoSincronizacion = {
    sinDatos: true,
    sinCambios: false,
    titulares: 0,
    suplentes: 0,
    sinResolver: [],
  };
  const fila = await localDb.hojas_partido.where("partido_id").equals(partidoId).first();
  if (!fila) return vacio;
  const datos = leerHoja(fila.datos);
  const lado = datos[datos.nuestro_lado];

  const jugadores = (await localDb.jugadores.toArray())
    .filter((j) => j.activo)
    .map((j) => ({
      id: j.id,
      nombre: j.nombre,
      apellidos: j.apellidos,
      alias: j.alias,
      dorsal: j.dorsal,
      posicion: j.posicion,
    }));
  const porId = new Map(jugadores.map((j) => [j.id, j]));

  const sinResolver: string[] = [];
  const idsVistos = new Set<string>();
  const leer = (textos: string[]) => {
    const reales: string[] = [];
    const libres: string[] = [];
    for (const texto of textos) {
      const r = resolverCelda(texto, jugadores);
      if (r.tipo === "jugador") {
        if (!idsVistos.has(r.id)) {
          idsVistos.add(r.id);
          reales.push(r.id);
        }
      } else if (r.tipo === "libre") libres.push(r.nombre);
      else if (r.tipo === "sin_resolver") sinResolver.push(r.texto);
    }
    return { reales, libres };
  };
  const tit = leer(lado.titulares);
  const sup = leer(lado.suplentes);
  if (tit.reales.length + tit.libres.length + sup.reales.length === 0) {
    return { ...vacio, sinResolver };
  }

  const resultado: ResultadoSincronizacion = {
    sinDatos: false,
    sinCambios: false,
    titulares: tit.reales.length + tit.libres.length,
    suplentes: sup.reales.length,
    sinResolver,
  };

  // ¿Ya está guardada así? Entonces no se toca (se respetan las posiciones movidas a mano).
  if (!opciones.forzar) {
    const existentes = await localDb.alineaciones.where("partido_id").equals(partidoId).toArray();
    const mismos = (a: string[], b: string[]) =>
      a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");
    const exTit = existentes.filter((a) => a.titular && a.jugador_id).map((a) => a.jugador_id as string);
    const exSup = existentes.filter((a) => !a.titular && a.jugador_id).map((a) => a.jugador_id as string);
    const exLibres = existentes
      .filter((a) => a.titular && !a.jugador_id)
      .map((a) => (a.nombre_libre ?? "").trim().toLowerCase());
    if (
      mismos(exTit, tit.reales) &&
      mismos(exSup, sup.reales) &&
      mismos(exLibres, tit.libres.map((n) => n.trim().toLowerCase()))
    ) {
      return { ...resultado, sinCambios: true };
    }
  }

  // Quien está en la hoja está convocado.
  const convocados = new Set(
    (await localDb.convocatorias.where("partido_id").equals(partidoId).toArray())
      .filter((c) => c.convocado)
      .map((c) => c.jugador_id),
  );
  for (const jugadorId of [...tit.reales, ...sup.reales]) {
    if (!convocados.has(jugadorId)) await toggleConvocadoLocal(partidoId, jugadorId, true);
  }

  const aColocar = [
    ...tit.reales.map((id) => ({ clave: id, posicion: porId.get(id)?.posicion ?? null })),
    ...tit.libres.map((_, i) => ({ clave: `libre:${i}`, posicion: null as string | null })),
  ];
  const { colocados } = colocarTitulares(aColocar);
  const huecoDe = new Map(colocados.map((c) => [c.clave, c.hueco]));
  const titulares = [
    ...tit.reales.map((id) => {
      const h = huecoDe.get(id);
      return { jugadorId: id as string | null, nombreLibre: null as string | null, posicion: h?.label ?? "", posX: h?.left, posY: h?.top };
    }),
    ...tit.libres.map((nombre, i) => {
      const h = huecoDe.get(`libre:${i}`);
      return { jugadorId: null as string | null, nombreLibre: nombre as string | null, posicion: h?.label ?? "", posX: h?.left, posY: h?.top };
    }),
  ];
  await guardarAlineacionLocal(partidoId, titulares, sup.reales);
  return resultado;
}

/**
 * Crea la jugada de ABP de un partido a partir de una de la biblioteca: copia el dibujo y
 * quién hace qué, y deja solo a los jugadores de la convocatoria y la alineación de ese
 * partido (los demás quedan sin asignar para elegirlos de nuevo).
 */
export async function crearJugadaAbpParaPartidoLocal(
  origenId: string,
  partidoId: string,
): Promise<ActionResult> {
  const origen = await localDb.jugadas_abp.get(origenId);
  if (!origen) return { error: "No se encuentra la jugada" };

  const convocatoria = await localDb.convocatorias.where("partido_id").equals(partidoId).toArray();
  const alineacion = await localDb.alineaciones.where("partido_id").equals(partidoId).toArray();
  const permitidos = new Set<string>([
    ...convocatoria.filter((c) => c.convocado).map((c) => c.jugador_id),
    ...alineacion.flatMap((a) => (a.jugador_id ? [a.jugador_id] : [])),
  ]);
  // Sin convocatoria ni alineación todavía no se puede filtrar: se deja tal cual.
  const vale = (id: string | null | undefined) => (!id ? null : permitidos.size === 0 || permitidos.has(id) ? id : null);

  const diagrama = leerDiagramaAbp(origen.diagrama);
  const diagramaCopia: Diagrama | null = diagrama
    ? {
        ...diagrama,
        elementos: diagrama.elementos.map((e) => ({
          ...e,
          jugador_id: vale(e.jugador_id),
          jugador2_id: vale(e.jugador2_id),
        })),
      }
    : null;
  const filas = leerJugadoresAbp(origen.jugadores).map((f) => ({
    ...f,
    jugador_id: vale(f.jugador_id),
    jugador2_id: vale(f.jugador2_id),
  }));

  const id = crypto.randomUUID();
  const row: LocalJugadaAbp = {
    id,
    nombre: origen.nombre,
    fase: origen.fase,
    tipo: origen.tipo,
    diagrama: diagramaCopia ? json(diagramaCopia) : null,
    jugadores: json(filas),
    notas: origen.notas,
    orden: origen.orden,
    created_at: new Date().toISOString(),
    partido_id: partidoId,
    origen_id: origenId,
  };
  await localDb.jugadas_abp.put(row);
  await queueMutation("jugadas_abp", "insert", id, row);
  return { success: true, id };
}

export { leerHoja };

// ---- Presentación de partido ------------------------------------------------

/** La presentación de un partido; si todavía no existe, se crea con las diapositivas de siempre. */
export async function obtenerOCrearPresentacionLocal(
  partidoId: string,
): Promise<LocalPresentacionPartido | null> {
  const existente = await localDb.presentaciones_partido
    .where("partido_id")
    .equals(partidoId)
    .first();
  if (existente) return existente;

  const partido = await localDb.partidos.get(partidoId);
  if (!partido) return null;
  const row: LocalPresentacionPartido = {
    id: crypto.randomUUID(),
    partido_id: partidoId,
    diapositivas: presentacionAJson(presentacionInicial(partido)),
    created_at: new Date().toISOString(),
  };
  await localDb.presentaciones_partido.put(row);
  await queueMutation("presentaciones_partido", "insert", row.id, row);
  return row;
}

export async function guardarPresentacionLocal(
  id: string,
  diapositivas: Diapositiva[],
): Promise<SimpleResult> {
  const patch = { diapositivas: presentacionAJson(diapositivas) };
  await localDb.presentaciones_partido.update(id, patch);
  await queueMutation("presentaciones_partido", "update", id, patch);
  return { success: true };
}
