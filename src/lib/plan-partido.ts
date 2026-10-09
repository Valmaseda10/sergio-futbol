// Plan de partido: jugadas de ABP (balón parado) y hoja de partido. Los
// formatos de las columnas jsonb de `jugadas_abp` y `hojas_partido`.

import type { Json } from "@/lib/types/database.types";
import { clubConfig } from "@/lib/club-config";
import type { Diagrama, RolesAbp } from "@/lib/ficha-entrenamiento";

export type { RolesAbp };

// ---- ABP --------------------------------------------------------------------

export type FaseAbp = "ofensivo" | "defensivo";

export const FASES_ABP: { value: FaseAbp; label: string; color: string }[] = [
  { value: "ofensivo", label: "Ofensivo", color: "#15803d" },
  { value: "defensivo", label: "Defensivo", color: "#b91c1c" },
];

export type TipoAbp = "corner" | "falta_directa" | "falta_lateral" | "falta_frontal";

export const TIPOS_ABP: { value: TipoAbp; label: string; plural: string }[] = [
  { value: "corner", label: "Córner", plural: "Córners" },
  { value: "falta_directa", label: "Falta directa", plural: "Faltas directas" },
  { value: "falta_lateral", label: "Falta lateral", plural: "Faltas laterales" },
  { value: "falta_frontal", label: "Falta frontal", plural: "Faltas frontales" },
];

/** Las jugadas guardadas antes de existir el tipo no lo traen: son córners. */
export function tipoDeJugada(tipo: string | null | undefined): TipoAbp {
  return TIPOS_ABP.some((t) => t.value === tipo) ? (tipo as TipoAbp) : "corner";
}

// Estado de un jugador en el partido con el que se sincroniza la jugada: titular
// (verde) o suplente/convocado (rojo).
export type EstadoPartido = "titular" | "suplente";

export const COLOR_ESTADO_PARTIDO: Record<EstadoPartido, string> = {
  titular: "#16a34a",
  suplente: "#dc2626",
};

// Grupos de piezas de una jugada por color de camiseta.
export type ClasePieza = "rojo" | "azul" | "portero";

export const COLOR_CLASE: Record<ClasePieza | "lanzador", string> = {
  rojo: "#ff0000",
  azul: "#1e3a8a",
  portero: "#7f1d1d",
  lanzador: "#0070c0",
};

export function clasePieza(color: string | undefined): ClasePieza {
  if (color === "#1e3a8a") return "azul";
  if (color === "#7f1d1d") return "portero";
  return "rojo";
}

/**
 * En el córner defensivo hay marcas individuales pegadas al rival y el nombre
 * debajo de la camiseta no se ve: ahí sale a la derecha de la camiseta.
 */
export function nombreAlLadoAbp(tipo: string | null | undefined, fase: string | null | undefined): boolean {
  return tipoDeJugada(tipo) === "corner" && fase === "defensivo";
}

/** Papel de cada grupo en un córner ofensivo: rematan los rojos, los azules recogen el rechace. */
export const ROLES_CORNER_OFENSIVO: RolesAbp = {
  rojo: "Rematar",
  azul: "Rechace y cerrar 2ª jugada",
  lanzador: "Lanzador",
};

export function rolesPorDefecto(tipo: TipoAbp, fase: FaseAbp): RolesAbp {
  return tipo === "corner" && fase === "ofensivo" ? { ...ROLES_CORNER_OFENSIVO } : {};
}

/** Una fila numerada de la jugada: qué hace cada uno y quién lo hace. */
export interface JugadorAbp {
  etiqueta: string; // "1", "Lanzador", "Zurdo"...
  jugador_id: string | null; // jugador de la plantilla, o null
  texto: string; // nombre escrito a mano (si no hay jugador_id)
}

export function leerJugadoresAbp(json: Json | null | undefined): JugadorAbp[] {
  if (!Array.isArray(json)) return [];
  return (json as unknown as Partial<JugadorAbp>[]).map((j) => ({
    etiqueta: j.etiqueta ?? "",
    jugador_id: j.jugador_id ?? null,
    texto: j.texto ?? "",
  }));
}

export function leerDiagramaAbp(json: Json | null | undefined): Diagrama | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  return json as unknown as Diagrama;
}

// ---- Hoja de partido --------------------------------------------------------

export interface CabeceraHoja {
  dia: string;
  jornada: string;
  hora: string;
  rival: string;
  lugar: string;
  observaciones: string;
  convocatoria: string;
}

export interface AlineacionHoja {
  titulo: string;
  titulares: string[]; // 11
  suplentes: string[]; // 5
  observaciones: string;
}

export interface AnalisisHoja {
  fase_defensiva: string;
  fase_ofensiva: string;
  transicion_defensiva: string;
  transicion_ofensiva: string;
  abp_defensivo: string;
  abp_ofensivo: string;
  observaciones: string;
}

export type LadoHoja = "izquierda" | "derecha";

export interface HojaPartidoDatos {
  cabecera: CabeceraHoja;
  izquierda: AlineacionHoja; // la lista de la izquierda de la hoja
  derecha: AlineacionHoja;
  // En qué lado está nuestro equipo: a la izquierda si jugamos de local, a la
  // derecha si somos visitantes.
  nuestro_lado: LadoHoja;
  cambios: string[]; // 5 filas x 2 columnas, por filas
  analisis: AnalisisHoja;
}

export const NUM_TITULARES = 11;
export const NUM_SUPLENTES = 5;
export const FILAS_CAMBIOS = 5;

const vacias = (n: number) => Array.from({ length: n }, () => "");

export function alineacionVacia(titulo: string): AlineacionHoja {
  return {
    titulo,
    titulares: vacias(NUM_TITULARES),
    suplentes: vacias(NUM_SUPLENTES),
    observaciones: "",
  };
}

export function hojaVacia(): HojaPartidoDatos {
  return {
    cabecera: {
      dia: "",
      jornada: "",
      hora: "",
      rival: "",
      lugar: "",
      observaciones: "",
      convocatoria: "",
    },
    izquierda: alineacionVacia("Rival"),
    derecha: alineacionVacia(clubConfig.nombreEquipo),
    nuestro_lado: "derecha",
    cambios: vacias(FILAS_CAMBIOS * 2),
    analisis: {
      fase_defensiva: "",
      fase_ofensiva: "",
      transicion_defensiva: "",
      transicion_ofensiva: "",
      abp_defensivo: "",
      abp_ofensivo: "",
      observaciones: "",
    },
  };
}

function ajustar(lista: unknown, n: number): string[] {
  const base = Array.isArray(lista) ? lista.map((x) => String(x ?? "")) : [];
  return Array.from({ length: n }, (_, i) => base[i] ?? "");
}

/** Mezcla lo guardado con la hoja vacía para que nunca falte un campo. */
export function leerHoja(json: Json | null | undefined): HojaPartidoDatos {
  const v = hojaVacia();
  if (!json || typeof json !== "object" || Array.isArray(json)) return v;
  const d = json as unknown as Partial<HojaPartidoDatos>;
  const lado = (x: Partial<AlineacionHoja> | undefined, def: AlineacionHoja) => ({
    titulo: x?.titulo ?? def.titulo,
    titulares: ajustar(x?.titulares, NUM_TITULARES),
    suplentes: ajustar(x?.suplentes, NUM_SUPLENTES),
    observaciones: x?.observaciones ?? "",
  });
  return {
    cabecera: { ...v.cabecera, ...d.cabecera },
    izquierda: lado(d.izquierda, v.izquierda),
    derecha: lado(d.derecha, v.derecha),
    nuestro_lado: d.nuestro_lado === "izquierda" ? "izquierda" : "derecha",
    cambios: ajustar(d.cambios, FILAS_CAMBIOS * 2),
    analisis: { ...v.analisis, ...d.analisis },
  };
}

export function hojaAJson(h: HojaPartidoDatos): Json {
  return JSON.parse(JSON.stringify(h)) as Json;
}

/** Pasa nuestro equipo al otro lado de la hoja (con su observación y suplentes). */
export function ponerNuestroEquipoEn(
  datos: HojaPartidoDatos,
  lado: LadoHoja,
): HojaPartidoDatos {
  if (datos.nuestro_lado === lado) return datos;
  return {
    ...datos,
    izquierda: datos.derecha,
    derecha: datos.izquierda,
    nuestro_lado: lado,
  };
}

/** "2026-10-03" -> "03/10/2026", como en la hoja de Word. */
export function fechaHoja(fecha: string): string {
  const [a, m, d] = fecha.split("-");
  return `${d}/${m}/${a}`;
}
