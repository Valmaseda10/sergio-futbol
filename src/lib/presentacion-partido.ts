// Presentación de partido: las diapositivas (estilo PowerPoint) que se enseñan o se imprimen el
// día antes del partido, en la sesión de vídeo. Formato de la columna jsonb
// `presentaciones_partido.diapositivas`: una lista de diapositivas de distintos tipos.
//
// Las que empiezan por "rival_" y "nuestro_once" y la de ABP se rellenan solas con lo que ya hay
// en la app (ficha del rival, alineación, ABP del partido); el resto se escribe a mano.

import type { Json } from "@/lib/types/database.types";
import { clubConfig } from "@/lib/club-config";
import { temporadaDeFecha } from "@/lib/temporada";
import type { Diagrama } from "@/lib/ficha-entrenamiento";
import { fechaHoja } from "@/lib/plan-partido";

export type ColorTitulo = "rojo" | "verde" | "negro";

export const COLORES_TITULO: { value: ColorTitulo; label: string; hex: string }[] = [
  { value: "rojo", label: "Rojo", hex: "#ee1c25" },
  { value: "verde", label: "Verde", hex: "#00a651" },
  { value: "negro", label: "Negro", hex: "#111111" },
];

export function hexTitulo(c: ColorTitulo | undefined): string {
  return COLORES_TITULO.find((x) => x.value === c)?.hex ?? "#ee1c25";
}

/** Caja de texto o recuadro colocado a mano sobre una diapositiva (coordenadas del lienzo 1920 x 1080). */
export interface ElementoLibre {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  texto: string;
  /** Tamaño de la letra en px del lienzo. */
  tamano: number;
  color: string;
  negrita: boolean;
  cursiva: boolean;
  alinear: "left" | "center" | "right";
  /** Color de fondo ("" = transparente). */
  fondo: string;
  /** Con borde del color de la letra. */
  borde: boolean;
}

export function nuevoElementoLibre(parche?: Partial<ElementoLibre>): ElementoLibre {
  return {
    id: nuevoId(),
    x: 560,
    y: 420,
    w: 800,
    h: 160,
    texto: "Escribe aquí",
    tamano: 48,
    color: "#111111",
    negrita: false,
    cursiva: false,
    alinear: "left",
    fondo: "",
    borde: false,
    ...parche,
  };
}

function leerElementoLibre(crudo: unknown): ElementoLibre | null {
  if (!crudo || typeof crudo !== "object") return null;
  const e = crudo as Partial<ElementoLibre>;
  const num = (v: unknown, def: number) => (typeof v === "number" && Number.isFinite(v) ? v : def);
  const base = nuevoElementoLibre();
  return {
    id: typeof e.id === "string" ? e.id : base.id,
    x: num(e.x, base.x),
    y: num(e.y, base.y),
    w: Math.max(40, num(e.w, base.w)),
    h: Math.max(30, num(e.h, base.h)),
    texto: typeof e.texto === "string" ? e.texto : "",
    tamano: Math.min(300, Math.max(10, num(e.tamano, base.tamano))),
    color: typeof e.color === "string" ? e.color : base.color,
    negrita: !!e.negrita,
    cursiva: !!e.cursiva,
    alinear: e.alinear === "center" || e.alinear === "right" ? e.alinear : "left",
    fondo: typeof e.fondo === "string" ? e.fondo : "",
    borde: !!e.borde,
  };
}

interface Base {
  id: string;
  /** Cajas de texto y recuadros puestos a mano encima de la diapositiva. */
  extras?: ElementoLibre[];
}

export interface DPortada extends Base {
  tipo: "portada";
  titulo: string;
  subtitulo: string;
  pie: string;
}

export interface DInforme extends Base {
  tipo: "informe";
  titulo: string;
  competicion: string;
  jornada: string;
  dia: string;
  hora: string;
  lugar: string;
  superficie: string;
  citacion: string;
  equipacion: string;
  arbitros: string;
}

export interface DTexto extends Base {
  tipo: "texto";
  titulo: string;
  color: ColorTitulo;
  /** Un renglón por línea. */
  texto: string;
}

export interface DPizarra extends Base {
  tipo: "pizarra";
  titulo: string;
  color: ColorTitulo;
  pie: string;
  colorPie: ColorTitulo;
  diagrama: Diagrama | null;
}

export interface BloqueDiapositiva {
  titulo: string;
  /** Color de la cabecera del bloque (hex). */
  color: string;
  texto: string;
  diagrama: Diagrama | null;
}

export interface DBloques extends Base {
  tipo: "bloques";
  titulo: string;
  color: ColorTitulo;
  bloques: BloqueDiapositiva[];
}

export interface DRivalPlantilla extends Base {
  tipo: "rival_plantilla";
  titulo: string;
}

export interface DRivalGoles extends Base {
  tipo: "rival_goles";
  titulo: string;
  /** Gráfica de barras por tramos (por defecto sí). */
  grafica: boolean;
  /** Tabla de goles por tramos con los totales (por defecto sí). */
  tabla: boolean;
}

export interface DRivalOnce extends Base {
  tipo: "rival_once";
  titulo: string;
}

export interface DNuestroOnce extends Base {
  tipo: "nuestro_once";
  titulo: string;
}

export interface DAbp extends Base {
  tipo: "abp";
  titulo: string;
  /** Jugadas del partido que salen (vacío = todas). */
  jugadas: string[];
  /** Jugadas por fila (1 a 4). */
  columnas: number;
}

export interface DLibre extends Base {
  tipo: "libre";
  titulo: string;
  color: ColorTitulo;
  /** Con título arriba (como las demás) o sin cabecera, solo el fondo del club. */
  conTitulo: boolean;
}

export type Diapositiva =
  | DLibre
  | DPortada
  | DInforme
  | DTexto
  | DPizarra
  | DBloques
  | DRivalPlantilla
  | DRivalGoles
  | DRivalOnce
  | DNuestroOnce
  | DAbp;

export type TipoDiapositiva = Diapositiva["tipo"];

export const TIPOS_DIAPOSITIVA: { value: TipoDiapositiva; label: string; descripcion: string }[] = [
  { value: "libre", label: "En blanco", descripcion: "Vacía, para escribir y colocar cajas de texto a tu manera" },
  { value: "pizarra", label: "Pizarra táctica", descripcion: "Campo dibujado con título y texto al pie" },
  { value: "texto", label: "Texto", descripcion: "Título y líneas de texto" },
  { value: "bloques", label: "Bloques (transiciones)", descripcion: "Varios bloques con cabecera de color, texto y dibujo" },
  { value: "abp", label: "ABP del partido", descripcion: "Las jugadas de balón parado de este partido" },
  { value: "nuestro_once", label: "Nuestro once", descripcion: "Nuestra alineación sobre el campo" },
  { value: "rival_once", label: "Once del rival", descripcion: "La alineación del rival de su ficha" },
  { value: "rival_plantilla", label: "Plantilla del rival", descripcion: "Jugadores del rival con los destacados" },
  { value: "rival_goles", label: "Goles del rival por tramos", descripcion: "Gráfica de goles a favor y en contra" },
  { value: "informe", label: "Datos del partido", descripcion: "Jornada, día, hora, lugar, citación y árbitros" },
  { value: "portada", label: "Portada", descripcion: "Equipo, club y temporada" },
];

function nuevoId(): string {
  return crypto.randomUUID();
}

/** Diapositiva nueva de un tipo, con lo mínimo escrito. */
export function nuevaDiapositiva(tipo: TipoDiapositiva): Diapositiva {
  const id = nuevoId();
  switch (tipo) {
    case "libre":
      return { id, tipo, titulo: "", color: "rojo", conTitulo: false };
    case "portada":
      return {
        id,
        tipo,
        titulo: clubConfig.nombreEquipo.toUpperCase(),
        subtitulo: clubConfig.nombreClub.toUpperCase(),
        pie: "",
      };
    case "informe":
      return {
        id,
        tipo,
        titulo: "INFORME RIVAL",
        competicion: "",
        jornada: "",
        dia: "",
        hora: "",
        lugar: "",
        superficie: "",
        citacion: "",
        equipacion: "",
        arbitros: "",
      };
    case "texto":
      return { id, tipo, titulo: "PLAN PARTIDO", color: "rojo", texto: "" };
    case "pizarra":
      return {
        id,
        tipo,
        titulo: "PLAN PARTIDO – FASE DEF",
        color: "rojo",
        pie: "",
        colorPie: "rojo",
        diagrama: null,
      };
    case "bloques":
      return {
        id,
        tipo,
        titulo: "PLAN PARTIDO",
        color: "rojo",
        bloques: [
          { titulo: "TRANSICIÓN OFENSIVA", color: "#92d050", texto: "", diagrama: null },
          { titulo: "TRANSICIÓN DEFENSIVA", color: "#ff0000", texto: "", diagrama: null },
        ],
      };
    case "rival_plantilla":
      return { id, tipo, titulo: "INFORME RIVAL" };
    case "rival_goles":
      return { id, tipo, titulo: "INFORME RIVAL", grafica: true, tabla: true };
    case "rival_once":
      return { id, tipo, titulo: "INFORME RIVAL" };
    case "nuestro_once":
      return { id, tipo, titulo: "NUESTRO ONCE" };
    case "abp":
      return { id, tipo, titulo: "PLAN PARTIDO", jugadas: [], columnas: 4 };
  }
}

/** Texto del pie de cada diapositiva: "Cultural y Deportiva Leonesa – Infantil B 2026 / 2027". */
export function pieDiapositiva(fecha: string | null | undefined): string {
  const t = fecha ? temporadaDeFecha(fecha).replace("-", " / ") : "";
  return `${clubConfig.nombreClub} – ${clubConfig.nombreEquipo}${t ? ` ${t}` : ""}`;
}

interface DatosPartido {
  fecha: string;
  hora: string | null;
  rival: string;
  lugar: string | null;
  competicion?: string;
}

const NOMBRE_DIA = ["DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"];

/** La presentación de un partido nuevo: la misma secuencia que el PowerPoint de siempre. */
export function presentacionInicial(p: DatosPartido): Diapositiva[] {
  const portada = nuevaDiapositiva("portada") as DPortada;
  portada.pie = `TEMPORADA ${temporadaDeFecha(p.fecha).replace("-", "/").replace(/^\d{2}(\d{2})\/\d{2}(\d{2})$/, "$1/$2")}`;

  const informe = nuevaDiapositiva("informe") as DInforme;
  informe.dia = `${NOMBRE_DIA[new Date(`${p.fecha}T00:00:00`).getDay()]} ${fechaHoja(p.fecha)}`;
  informe.hora = p.hora ? `${p.hora.slice(0, 5)}h` : "";
  informe.lugar = (p.lugar ?? "").toUpperCase();
  informe.competicion = "LIGA 1ª PROVINCIAL INFANTIL";

  const plan = nuevaDiapositiva("texto") as DTexto;
  plan.texto = [
    `RIVAL: ${p.rival.toUpperCase()}`,
    "FASE DEF: ",
    "FASE OFE: ",
    "NOSOTROS: ",
  ].join("\n");

  const def = nuevaDiapositiva("pizarra") as DPizarra;
  def.titulo = "PLAN PARTIDO – FASE DEF";
  def.color = "rojo";
  def.colorPie = "rojo";
  def.pie = "ZONA 1: ";

  const ofe = nuevaDiapositiva("pizarra") as DPizarra;
  ofe.titulo = "PLAN PARTIDO – FASE OFE";
  ofe.color = "verde";
  ofe.colorPie = "verde";
  ofe.pie = "ZONA 1: ";

  return [
    portada,
    informe,
    nuevaDiapositiva("rival_plantilla"),
    nuevaDiapositiva("rival_goles"),
    nuevaDiapositiva("rival_once"),
    plan,
    def,
    ofe,
    nuevaDiapositiva("bloques"),
    nuevaDiapositiva("abp"),
  ];
}

const TIPOS_CONOCIDOS = new Set<string>(TIPOS_DIAPOSITIVA.map((t) => t.value));

/** Lee lo guardado; descarta lo que no sea una diapositiva reconocible y rellena lo que falte. */
export function leerPresentacion(json: Json | null | undefined): Diapositiva[] {
  if (!Array.isArray(json)) return [];
  const lista: Diapositiva[] = [];
  for (const crudo of json as unknown[]) {
    if (!crudo || typeof crudo !== "object") continue;
    const d = crudo as Partial<Diapositiva> & { tipo?: string };
    if (!d.tipo || !TIPOS_CONOCIDOS.has(d.tipo)) continue;
    const base = nuevaDiapositiva(d.tipo as TipoDiapositiva);
    const mezcla = { ...base, ...d, id: d.id ?? base.id } as Diapositiva;
    mezcla.extras = (Array.isArray(d.extras) ? d.extras : [])
      .map(leerElementoLibre)
      .filter((x): x is ElementoLibre => !!x);
    if (mezcla.tipo === "bloques" && Array.isArray((d as Partial<DBloques>).bloques)) {
      mezcla.bloques = ((d as Partial<DBloques>).bloques ?? []).map((b) => ({
        titulo: b?.titulo ?? "",
        color: b?.color ?? "#ff0000",
        texto: b?.texto ?? "",
        diagrama: b?.diagrama ?? null,
      }));
    }
    if (mezcla.tipo === "abp") {
      mezcla.jugadas = Array.isArray(mezcla.jugadas) ? mezcla.jugadas : [];
      mezcla.columnas = Math.min(4, Math.max(1, Number(mezcla.columnas) || 4));
    }
    lista.push(mezcla);
  }
  return lista;
}

export function presentacionAJson(d: Diapositiva[]): Json {
  return JSON.parse(JSON.stringify(d)) as Json;
}

/** Nombre corto de una diapositiva para la lista de la izquierda. */
export function resumenDiapositiva(d: Diapositiva): string {
  switch (d.tipo) {
    case "libre":
      return d.titulo || d.extras?.find((x) => x.texto.trim())?.texto.split(/\r?\n/)[0] || "En blanco";
    case "portada":
      return "Portada";
    case "informe":
      return "Datos del partido";
    case "rival_plantilla":
      return "Plantilla del rival";
    case "rival_goles":
      return "Goles del rival";
    case "rival_once":
      return "Once del rival";
    case "nuestro_once":
      return "Nuestro once";
    case "abp":
      return "ABP";
    case "texto":
    case "bloques":
      return d.titulo || "Texto";
    case "pizarra":
      return d.pie.split("\n")[0] || d.titulo || "Pizarra";
  }
}
