// Datos extra de la ficha de sesión (columna jsonb `entrenamientos.ficha`):
// cabecera (nº de sesión, convocados), tabla de objetivos y diagramas
// dibujados en la app. Todo opcional: una sesión antigua tiene `ficha` null.

import type { Json } from "@/lib/types/database.types";
import {
  CAMISETA_BLANCA,
  CAMISETA_GRANATE,
  CAMISETA_LANZADOR,
  CAMPO_ABP_IMG,
  ESCUDO_ABP_IMG,
} from "@/lib/camisetas";

export type TipoElemento =
  | "jugador"
  | "porteria"
  | "cono"
  | "pica"
  | "balon"
  | "texto"
  | "flecha"
  | "zona"
  | "icono";

// "abp" es el campo de las jugadas a balón parado: el medio campo del
// PowerPoint (líneas negras sobre blanco, 1056 x 723) con las camisetas de la
// Cultural.
export type TipoCampo = "medio" | "completo" | "abp";

export type Icono = "lanzador" | "ojo-portero" | "prohibido";

export interface ElementoDiagrama {
  id: string;
  tipo: TipoElemento;
  x: number;
  y: number;
  // Solo flecha y zona: segundo punto (extremo de la flecha / esquina opuesta).
  x2?: number;
  y2?: number;
  color?: string;
  etiqueta?: string;
  discontinua?: boolean;
  // Solo flecha: curvatura del trazo (fracción de su largo; 0 o sin definir =
  // recta; positivo y negativo, hacia lados opuestos). Para centros y pases.
  curva?: number;
  // Flecha y zona: grosor del trazo en px (por defecto 3 y 2,5).
  grosor?: number;
  // Flecha sin punta (una simple línea).
  sinPunta?: boolean;
  // Zona con el borde continuo en vez de discontinuo.
  solida?: boolean;
  // Flecha curva con el punto de control dado (anula `curva`); lo usan los
  // pases curvos copiados del PowerPoint, que no son simétricos.
  cx?: number;
  cy?: number;
  // Jugador (camiseta): tamaño relativo (1 = normal), jugador de la plantilla
  // o nombre escrito a mano que sale junto a la camiseta, su color y su
  // posición respecto al centro de la camiseta.
  escala?: number;
  jugador_id?: string | null;
  nombre?: string;
  colorNombre?: string;
  nombreDx?: number;
  nombreDy?: number;
  // Solo "icono".
  icono?: Icono;
}

// Papel que cumple cada grupo de piezas de una jugada de ABP, por color de camiseta.
export interface RolesAbp {
  rojo?: string;
  azul?: string;
  portero?: string;
  lanzador?: string;
}

export interface Diagrama {
  campo: TipoCampo;
  elementos: ElementoDiagrama[];
  roles?: RolesAbp;
}

export interface ParPrincipio {
  principio: string;
  subprincipio: string;
  subsubprincipio: string;
}

// Misma estructura que la tabla "Contenido / Principio / Subprincipio /
// Sub-subprincipio" de la plantilla (Psicológico, Táctico con OF/DF/TO/TD/ABP,
// Técnico y Físico).
export interface ObjetivosTabla {
  psicologico: { contenido: string; principio: string };
  tactico: {
    contenido_of_df: string;
    contenido_to_td: string;
    contenido_abp: string;
    of: ParPrincipio;
    df: ParPrincipio;
    to: ParPrincipio;
    td: ParPrincipio;
    abp_df: string;
    abp_of: string;
  };
  tecnico: { contenido: string; df: string; of: string };
  fisico: { contenido: string; principio: string };
}

// Rotación de una tarea por equipos con color: cada equipo lleva los
// jugadores elegidos de la plantilla (ids) y, opcionalmente, una nota.
export interface EquipoRotacion {
  nombre: string;
  color: string;
  jugadores: string[];
  texto?: string;
}

export interface RotacionTarea {
  equipos: EquipoRotacion[];
}

export const COLORES_EQUIPO: { valor: string; nombre: string }[] = [
  { valor: "#dc2626", nombre: "Rojo" },
  { valor: "#2563eb", nombre: "Azul" },
  { valor: "#16a34a", nombre: "Verde" },
  { valor: "#111111", nombre: "Negro" },
  { valor: "#ea580c", nombre: "Naranja" },
  { valor: "#9333ea", nombre: "Morado" },
];

export interface FichaEntrenamiento {
  numero_sesion?: string;
  // Obsoleto: ahora el recuento (p. ej. 14+1P) se calcula con la lista.
  convocados?: string;
  tabla_objetivos?: ObjetivosTabla;
  // Ruta en el bucket "adjuntos" de una imagen de la tabla de objetivos
  // (p. ej. captura de la plantilla); si existe, sustituye a la tabla.
  tabla_imagen_url?: string;
  diagramas?: (Diagrama | null)[];
  // Una por tarea (índice 0 = tarea 1).
  rotaciones?: (RotacionTarea | null)[];
  // Jugadas de ABP (ids de la sección Plan de partido) que se trabajan en cada
  // tarea (índice 0 = tarea 1); salen dibujadas en su hueco de la ficha.
  abp_jugadas?: string[][];
}

const par = (): ParPrincipio => ({
  principio: "",
  subprincipio: "",
  subsubprincipio: "",
});

export function objetivosTablaVacia(): ObjetivosTabla {
  return {
    psicologico: { contenido: "", principio: "" },
    tactico: {
      contenido_of_df: "",
      contenido_to_td: "",
      contenido_abp: "",
      of: par(),
      df: par(),
      to: par(),
      td: par(),
      abp_df: "",
      abp_of: "",
    },
    tecnico: { contenido: "", df: "", of: "" },
    fisico: { contenido: "", principio: "" },
  };
}

// Mezcla lo guardado con la plantilla vacía para que una tabla a medias (o de
// una versión anterior) nunca deje campos sin definir.
export function normalizarObjetivosTabla(
  t: Partial<ObjetivosTabla> | undefined,
): ObjetivosTabla {
  const v = objetivosTablaVacia();
  if (!t) return v;
  return {
    psicologico: { ...v.psicologico, ...t.psicologico },
    tactico: {
      ...v.tactico,
      ...t.tactico,
      of: { ...v.tactico.of, ...t.tactico?.of },
      df: { ...v.tactico.df, ...t.tactico?.df },
      to: { ...v.tactico.to, ...t.tactico?.to },
      td: { ...v.tactico.td, ...t.tactico?.td },
    },
    tecnico: { ...v.tecnico, ...t.tecnico },
    fisico: { ...v.fisico, ...t.fisico },
  };
}

export function objetivosTablaTieneContenido(t: ObjetivosTabla): boolean {
  return JSON.stringify(t) !== JSON.stringify(objetivosTablaVacia());
}

export function leerFicha(json: Json | null | undefined): FichaEntrenamiento {
  if (!json || typeof json !== "object" || Array.isArray(json)) return {};
  return json as unknown as FichaEntrenamiento;
}

export function fichaAJson(ficha: FichaEntrenamiento): Json {
  return JSON.parse(JSON.stringify(ficha)) as Json;
}

// ---------------------------------------------------------------------------
// Diagrama -> SVG. Una única función genera el dibujo para el editor, para la
// ficha y para exportar a PNG, así los tres coinciden exactamente.
// ---------------------------------------------------------------------------

export const CAMPO_ANCHO = 520;
export const CAMPO_ALTO = 340;

export const CAMPO_ABP_ANCHO = 1056;
export const CAMPO_ABP_ALTO = 723;

/** Tamaño del lienzo de cada tipo de campo y cuánto hay que agrandar los elementos. */
export function dimensionesCampo(campo: TipoCampo): { ancho: number; alto: number; k: number } {
  return campo === "abp"
    ? { ancho: CAMPO_ABP_ANCHO, alto: CAMPO_ABP_ALTO, k: CAMPO_ABP_ANCHO / CAMPO_ANCHO }
    : { ancho: CAMPO_ANCHO, alto: CAMPO_ALTO, k: 1 };
}

export const COLORES_DIAGRAMA: { valor: string; nombre: string }[] = [
  { valor: "#dc2626", nombre: "Rojo" },
  { valor: "#1e3a8a", nombre: "Azul" },
  { valor: "#facc15", nombre: "Amarillo" },
  { valor: "#4ade80", nombre: "Verde" },
  { valor: "#111111", nombre: "Negro" },
  { valor: "#ffffff", nombre: "Blanco" },
  { valor: "#f97316", nombre: "Naranja" },
  // En las jugadas de ABP (piezas con camiseta) es la camiseta granate del portero.
  { valor: "#7f1d1d", nombre: "Granate (portero)" },
];

export const COLOR_PORTERO = "#7f1d1d";

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function lineasCampo(campo: TipoCampo): string {
  const l = 'fill="none" stroke="#ffffff" stroke-width="2" stroke-opacity="0.85"';
  if (campo === "completo") {
    return `
      <rect x="20" y="20" width="480" height="300" ${l}/>
      <line x1="260" y1="20" x2="260" y2="320" ${l}/>
      <circle cx="260" cy="170" r="42" ${l}/>
      <circle cx="260" cy="170" r="2.5" fill="#ffffff"/>
      <rect x="20" y="95" width="82" height="150" ${l}/>
      <rect x="20" y="132" width="30" height="76" ${l}/>
      <rect x="418" y="95" width="82" height="150" ${l}/>
      <rect x="470" y="132" width="30" height="76" ${l}/>
      <path d="M102 140 A30 30 0 0 1 102 200" ${l}/>
      <path d="M418 140 A30 30 0 0 0 418 200" ${l}/>`;
  }
  return `
    <rect x="20" y="20" width="480" height="320" ${l}/>
    <rect x="130" y="20" width="260" height="120" ${l}/>
    <rect x="195" y="20" width="130" height="50" ${l}/>
    <path d="M205 140 A55 55 0 0 0 315 140" ${l}/>
    <circle cx="260" cy="105" r="2.5" fill="#ffffff"/>
    <path d="M200 340 A60 60 0 0 1 320 340" ${l}/>`;
}

// Campo de las jugadas de ABP: el del PowerPoint (líneas negras sobre blanco)
// con el escudo muy tenue de fondo.
function fondoAbp(): string {
  const w = CAMPO_ABP_ANCHO;
  const h = CAMPO_ABP_ALTO;
  const escudoAlto = h * 0.88;
  const escudoAncho = (escudoAlto * ESCUDO_ABP_IMG.ancho) / ESCUDO_ABP_IMG.alto;
  return `<rect width="${w}" height="${h}" fill="#ffffff"/>
    <image href="${CAMPO_ABP_IMG.src}" x="0" y="0" width="${w}" height="${(w * 769) / 1056}" preserveAspectRatio="none"/>
    <image href="${ESCUDO_ABP_IMG.src}" x="${(w - escudoAncho) / 2}" y="${h * 0.1}" width="${escudoAncho}" height="${escudoAlto}" opacity="0.11"/>`;
}

// Punto de control de una flecha curva (curva cuadrática).
function controlCurva(e: ElementoDiagrama): { cx: number; cy: number } {
  if (e.cx != null && e.cy != null) return { cx: e.cx, cy: e.cy };
  const x2 = e.x2 ?? e.x;
  const y2 = e.y2 ?? e.y;
  const k = e.curva ?? 0;
  return {
    cx: (e.x + x2) / 2 - (y2 - e.y) * k,
    cy: (e.y + y2) / 2 + (x2 - e.x) * k,
  };
}

function colorOscuro(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) < 150;
}

function colorClaro(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 170;
}

function esCurva(e: ElementoDiagrama): boolean {
  return !!e.curva || (e.cx != null && e.cy != null);
}

/** Punto por el que pasa una flecha a mitad de camino (donde va su asa de edición). */
export function puntoMedioFlecha(e: ElementoDiagrama): { x: number; y: number } {
  const x2 = e.x2 ?? e.x;
  const y2 = e.y2 ?? e.y;
  if (!esCurva(e)) return { x: (e.x + x2) / 2, y: (e.y + y2) / 2 };
  const { cx, cy } = controlCurva(e);
  return { x: 0.25 * e.x + 0.5 * cx + 0.25 * x2, y: 0.25 * e.y + 0.5 * cy + 0.25 * y2 };
}

function flechaSvg(e: ElementoDiagrama, k: number): string {
  const grosor = (e.grosor ?? 3) * k;
  const x2 = e.x2 ?? e.x;
  const y2 = e.y2 ?? e.y;
  const color = e.color ?? "#dc2626";
  const curva = esCurva(e);
  const { cx, cy } = controlCurva(e);
  const ang = curva ? Math.atan2(y2 - cy, x2 - cx) : Math.atan2(y2 - e.y, x2 - e.x);
  const punta = 11 * k + (grosor - 3 * k) * 2;
  const a1 = ang + Math.PI - 0.45;
  const a2 = ang + Math.PI + 0.45;
  const p1 = `${x2 + punta * Math.cos(a1)},${y2 + punta * Math.sin(a1)}`;
  const p2 = `${x2 + punta * Math.cos(a2)},${y2 + punta * Math.sin(a2)}`;
  const dash = e.discontinua ? ` stroke-dasharray="${7 * k} ${5 * k}"` : "";
  const trazo = curva
    ? `<path d="M${e.x} ${e.y} Q${cx} ${cy} ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="${grosor}"${dash} stroke-linecap="round"/>`
    : `<line x1="${e.x}" y1="${e.y}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${grosor}"${dash} stroke-linecap="round"/>`;
  if (e.sinPunta) return trazo;
  return `${trazo}
    <polygon points="${x2},${y2} ${p1} ${p2}" fill="${color}"/>`;
}

// Identificadores de las imágenes dentro de un SVG (únicos por dibujo, para que
// varios SVG en la misma página no se pisen).
interface IdsCamisetas {
  blanca: string;
  granate: string;
  lanzador: string;
}

/** Cómo se nombran los jugadores de la plantilla junto a su camiseta. */
export type NombresJugadores = Map<string, string>;

let contadorCamisetas = 0;

const ANCHO_CAMISETA = 30;

function defsCamisetas(ids: IdsCamisetas): string {
  return `<defs>
    <image id="${ids.blanca}" href="${CAMISETA_BLANCA.src}" width="${CAMISETA_BLANCA.ancho}" height="${CAMISETA_BLANCA.alto}"/>
    <image id="${ids.granate}" href="${CAMISETA_GRANATE.src}" width="${CAMISETA_GRANATE.ancho}" height="${CAMISETA_GRANATE.alto}"/>
    <image id="${ids.lanzador}" href="${CAMISETA_LANZADOR.src}" width="${CAMISETA_LANZADOR.ancho}" height="${CAMISETA_LANZADOR.alto}"/>
  </defs>`;
}

/** Nombre que sale junto a una camiseta: el del jugador elegido o el escrito a mano. */
export function nombreDePieza(e: ElementoDiagrama, nombres?: NombresJugadores): string {
  const delJugador = e.jugador_id ? nombres?.get(e.jugador_id) : undefined;
  return (delJugador ?? e.nombre ?? "").trim();
}

// Pieza de jugador como camiseta de la Cultural (blanca; granate si es portero)
// con su número o letra encima y, junto a ella, el nombre del jugador.
function camisetaSvg(
  e: ElementoDiagrama,
  ids: IdsCamisetas,
  k: number,
  nombres?: NombresJugadores,
  numeros: boolean | "rojas" = true,
  nombreAlLado = false,
  textoK = 1,
  subrayados?: Map<string, string>,
): string {
  const c = e.color ?? "#dc2626";
  const portero = c === COLOR_PORTERO;
  const base = portero ? CAMISETA_GRANATE : CAMISETA_BLANCA;
  const ancho = ANCHO_CAMISETA * k * (e.escala ?? 1);
  const escala = ancho / base.ancho;
  const alto = base.alto * escala;
  // Córner defensivo: los de la columna de la derecha (marcas individuales) llevan el
  // nombre a su derecha; los que defienden en zona, justo debajo.
  let colocacion: ColocacionNombre = nombreAlLado
    ? e.x > 520 * k * 0.75
      ? ancho
      : "debajo"
    : "libre";
  // Un nombre colocado a mano a la derecha de la camiseta se ajusta para no salirse del campo.
  if (colocacion === "libre" && k > 1 && e.nombreDx != null && e.nombreDx > ancho * 0.4) {
    colocacion = ancho;
  }
  const clara = !portero && (c === "#ffffff" || colorClaro(c));
  const relleno = portero ? "#ffffff" : clara ? "#111111" : c;
  // El número va a ~la mitad del ancho de la camiseta, sin pasar de un tamaño razonable en las grandes.
  const fuente = Math.min(ancho * 0.5, 17 * k);
  // "rojas": solo las piezas rojas (las de la lista numerada de la derecha).
  const verNumero = numeros === true || (numeros === "rojas" && c !== "#1e3a8a" && !portero);
  const txt = e.etiqueta && verNumero
    ? `<text x="${e.x}" y="${e.y + fuente * 0.3 + alto * 0.04}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fuente}" font-weight="800" fill="${relleno}" stroke="${
        portero ? "#7f1d1d" : "#ffffff"
      }" stroke-width="${fuente * 0.16}" stroke-linejoin="round" paint-order="stroke">${esc(e.etiqueta)}</text>`
    : "";
  return `<use href="#${portero ? ids.granate : ids.blanca}" transform="translate(${e.x - ancho / 2} ${
    e.y - alto / 2}) scale(${escala})"/>${txt}${nombreSvg(e, nombres, k, alto, colocacion, textoK, subrayadoDe(e, subrayados))}`;
}

// Dónde queda el nombre de una pieza:
//  - "libre": donde se colocó a mano (debajo si no se tocó).
//  - "debajo": justo debajo de la camiseta, sin tener en cuenta lo colocado a mano.
//  - un número: a la derecha de la camiseta (el número es el ancho de la camiseta).
type ColocacionNombre = "libre" | "debajo" | number;

// Márgenes del campo de ABP (las líneas de banda del dibujo), como fracción del ancho
// del lienzo: lo que se escribe fuera se corta al imprimir.
const CAMPO_ABP_MIN = 0.038;
const CAMPO_ABP_MAX = 0.956;

// Nombre del jugador junto a su camiseta (debajo por defecto). En los dibujos de ABP
// nunca sale de las líneas del campo: se desplaza, se achica o pasa al otro lado.
function nombreSvg(
  e: ElementoDiagrama,
  nombres: NombresJugadores | undefined,
  k: number,
  altoPieza: number,
  colocacion: ColocacionNombre = "libre",
  // Factor de tamaño de la letra (1 = normal; mayor en los dibujos pequeños).
  textoK = 1,
  // Color de la raya bajo el nombre (verde titular, rojo suplente) si se da.
  subraya?: string,
): string {
  const nombre = nombreDePieza(e, nombres);
  if (!nombre) return "";
  // Un nombre que es solo un número (los de la barrera: 1, 2, 3...) se escribe igual
  // que los textos "1-", "2-"... del lateral del dibujo: negro y del mismo tamaño.
  const numerico = e.tipo === "jugador" && /^\d+$/.test(nombre);
  let fs = (numerico ? 15 : 14 * textoK) * k;
  const ancho = 520 * k;
  const minX = ancho * CAMPO_ABP_MIN;
  const maxX = ancho * CAMPO_ABP_MAX;
  const dentro = k > 1;
  const medida = (f: number) => nombre.length * 0.72 * f;
  const y0 = e.y;
  let x = e.x;
  let y = e.y;
  let anclaje: "middle" | "start" | "end" = "middle";

  if (typeof colocacion === "number") {
    // A la derecha de la camiseta; si no cabe, se achica hasta el 85 % y, si aún no
    // cabe, pasa a su izquierda.
    const x0 = e.x + colocacion / 2 + 4 * k;
    const hueco = (dentro ? maxX : Infinity) - x0;
    if (medida(fs) > hueco) fs *= Math.max(0.85, hueco / medida(fs));
    if (medida(fs) > hueco) {
      anclaje = "end";
      x = e.x - colocacion / 2 - 4 * k;
    } else {
      anclaje = "start";
      x = x0;
    }
    y = y0 + 5 * k;
  } else {
    const dx = colocacion === "libre" ? (e.nombreDx ?? 0) : 0;
    const dy = colocacion === "libre" ? (e.nombreDy ?? altoPieza / 2 + 15 * k) : altoPieza / 2 + 15 * k;
    x = e.x + dx;
    y = e.y + dy;
    if (dentro) {
      const mitad = medida(fs) / 2;
      if (x + mitad > maxX) x = maxX - mitad;
      if (x - mitad < minX) x = minX + mitad;
    }
  }
  const colorPorDefecto = e.tipo === "icono" ? "#0070c0" : (e.color ?? "#111111");
  const relleno = numerico ? "#111111" : (e.colorNombre ?? colorPorDefecto);
  let raya = "";
  if (subraya) {
    const w = medida(fs);
    const x1 = anclaje === "middle" ? x - w / 2 : anclaje === "start" ? x : x - w;
    raya = `<line x1="${x1}" y1="${y + 4 * k}" x2="${x1 + w}" y2="${y + 4 * k}" stroke="${subraya}" stroke-width="${3 * k}" stroke-linecap="round"/>`;
  }
  return `<text x="${x}" y="${y}" text-anchor="${anclaje}" font-family="Arial, sans-serif" font-size="${fs}" font-weight="700" fill="${relleno}" stroke="#ffffff" stroke-width="${(numerico ? 3 : 2.2) * k}" stroke-linejoin="round" paint-order="stroke">${esc(nombre)}</text>${raya}`;
}

// Raya bajo el nombre de una pieza según el estado de su jugador en el partido.
function subrayadoDe(e: ElementoDiagrama, subrayados?: Map<string, string>): string | undefined {
  return e.jugador_id ? subrayados?.get(e.jugador_id) : undefined;
}

function iconoSvg(
  e: ElementoDiagrama,
  ids: IdsCamisetas | undefined,
  k: number,
  nombres?: NombresJugadores,
  textoK = 1,
  subrayados?: Map<string, string>,
): string {
  const esc1 = e.escala ?? 1;
  if (e.icono === "lanzador" && ids) {
    const ancho = 36 * k * esc1;
    const escala = ancho / CAMISETA_LANZADOR.ancho;
    const alto = CAMISETA_LANZADOR.alto * escala;
    return `<use href="#${ids.lanzador}" transform="translate(${e.x - ancho / 2} ${e.y - alto / 2}) scale(${escala})"/>${nombreSvg(e, nombres, k, alto, undefined, textoK, subrayadoDe(e, subrayados))}`;
  }
  if (e.icono === "ojo-portero") {
    const r = 14 * k * esc1;
    return `<circle cx="${e.x}" cy="${e.y}" r="${r}" fill="#0070c0"/>
      <path d="M${e.x - r * 0.9} ${e.y - r * 0.1} Q${e.x} ${e.y - r * 1.15} ${e.x + r * 0.9} ${e.y - r * 0.1}" fill="none" stroke="#111111" stroke-width="${r * 0.2}" stroke-linecap="round"/>`;
  }
  if (e.icono === "prohibido") {
    const r = 10 * k * esc1;
    return `<circle cx="${e.x}" cy="${e.y}" r="${r}" fill="none" stroke="#dc2626" stroke-width="${r * 0.28}"/>
      <line x1="${e.x - r * 0.7}" y1="${e.y - r * 0.7}" x2="${e.x + r * 0.7}" y2="${e.y + r * 0.7}" stroke="#dc2626" stroke-width="${r * 0.28}"/>`;
  }
  return "";
}

// Balón amarillo con el pentágono central, sus costuras y los gajos del borde.
function balonAmarillo(x: number, y: number): string {
  const r = 10;
  const punto = (rad: number, grados: number) =>
    `${(x + rad * Math.cos((grados * Math.PI) / 180)).toFixed(2)},${(y + rad * Math.sin((grados * Math.PI) / 180)).toFixed(2)}`;
  const angulos = [0, 1, 2, 3, 4].map((i) => -90 + 72 * i);
  const pentagono = angulos.map((a) => punto(3.8, a)).join(" ");
  const costuras = angulos
    .map((a) => {
      const [x1, y1] = punto(3.8, a).split(",");
      const [x2, y2] = punto(7.4, a).split(",");
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    })
    .join("");
  // Gajos del borde, al final de cada costura.
  const gajos = angulos
    .map((a) => `<polygon points="${punto(10, a - 14)} ${punto(7.4, a)} ${punto(10, a + 14)}"/>`)
    .join("");
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="#facc15" stroke="#111111" stroke-width="1.5"/>
    <g stroke="#111111" stroke-width="1.1" stroke-linecap="round">${costuras}</g>
    <g fill="#111111">${gajos}<polygon points="${pentagono}"/></g>`;
}

// Elementos "puntuales" (jugador, texto, material): se dibujan con el tamaño
// de 520 px de ancho y se agrandan alrededor de su punto cuando el campo es
// mayor (el de ABP).
function escalado(e: ElementoDiagrama, k: number, svg: string): string {
  if (k === 1) return svg;
  return `<g transform="translate(${e.x} ${e.y}) scale(${k}) translate(${-e.x} ${-e.y})">${svg}</g>`;
}

function elementoSvg(
  e: ElementoDiagrama,
  camisetas: IdsCamisetas | undefined,
  k: number,
  nombres?: NombresJugadores,
  numeros: boolean | "rojas" = true,
  nombreAlLado = false,
  textoK = 1,
  subrayados?: Map<string, string>,
): string {
  const c = e.color ?? "#dc2626";
  switch (e.tipo) {
    case "jugador": {
      if (camisetas) return camisetaSvg(e, camisetas, k, nombres, numeros, nombreAlLado, textoK, subrayados);
      const txt = e.etiqueta
        ? `<text x="${e.x}" y="${e.y + 4}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="${
            c === "#ffffff" || c === "#facc15" || c === "#4ade80" ? "#111111" : "#ffffff"
          }">${esc(e.etiqueta)}</text>`
        : "";
      return escalado(
        e,
        k,
        `<circle cx="${e.x}" cy="${e.y}" r="12" fill="${c}" stroke="#111111" stroke-width="1.5"/>${txt}`,
      );
    }
    case "icono":
      return iconoSvg(e, camisetas, k, nombres, textoK, subrayados);
    case "porteria":
      return escalado(
        e,
        k,
        `<rect x="${e.x - 24}" y="${e.y - 7}" width="48" height="14" fill="#ffffff" fill-opacity="0.35" stroke="#e5e7eb" stroke-width="2"/>
        <line x1="${e.x - 24}" y1="${e.y}" x2="${e.x + 24}" y2="${e.y}" stroke="#e5e7eb" stroke-width="1"/>`,
      );
    case "cono":
      return escalado(
        e,
        k,
        `<polygon points="${e.x},${e.y - 10} ${e.x - 9},${e.y + 8} ${e.x + 9},${e.y + 8}" fill="${
          e.color ?? "#f97316"
        }" stroke="#111111" stroke-width="1"/>`,
      );
    case "pica":
      return escalado(
        e,
        k,
        `<rect x="${e.x - 4}" y="${e.y - 13}" width="8" height="26" rx="3" fill="${
          e.color ?? "#facc15"
        }" stroke="#111111" stroke-width="1"/>`,
      );
    case "balon":
      // En las jugadas de ABP (k > 1) es un balón de verdad: amarillo con sus gajos negros.
      if (k !== 1) return escalado(e, k, balonAmarillo(e.x, e.y));
      return escalado(
        e,
        k,
        `<circle cx="${e.x}" cy="${e.y}" r="7.5" fill="#ffffff" stroke="#111111" stroke-width="1.5"/>
        <circle cx="${e.x}" cy="${e.y}" r="2.6" fill="#111111"/>`,
      );
    case "texto": {
      // Contorno del color contrario al del texto para que se lea sobre el césped
      // (blanco alrededor de los textos oscuros: rojo, azul, negro...).
      const relleno = e.color ?? "#ffffff";
      const oscuro = colorOscuro(relleno);
      return escalado(
        e,
        k,
        `<text x="${e.x}" y="${e.y}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${
          15 * (e.escala ?? 1)
        }" font-weight="700" fill="${relleno}" stroke="${oscuro ? "#ffffff" : "#111111"}" stroke-width="${
          oscuro ? 3 : 0.6
        }" stroke-linejoin="round" paint-order="stroke">${esc(e.etiqueta ?? "")}</text>`,
      );
    }
    case "flecha":
      return flechaSvg(e, k);
    case "zona": {
      const x2 = e.x2 ?? e.x;
      const y2 = e.y2 ?? e.y;
      return `<rect x="${Math.min(e.x, x2)}" y="${Math.min(e.y, y2)}" width="${Math.abs(
        x2 - e.x,
      )}" height="${Math.abs(y2 - e.y)}" fill="none" stroke="${
        e.color ?? "#111111"
      }" stroke-width="${(e.grosor ?? 2.5) * k}"${e.solida ? "" : ` stroke-dasharray="${8 * k} ${6 * k}"`}/>`;
    }
  }
}

export function diagramaASvg(
  d: Diagrama,
  opciones?: {
    seleccionId?: string | null;
    borrador?: ElementoDiagrama | null;
    /** Pinta a los jugadores como camisetas de la Cultural en vez de fichas. */
    camisetas?: boolean;
    /** Nombres de los jugadores de la plantilla (id -> nombre) para sus camisetas. */
    nombres?: NombresJugadores;
    /**
     * Número identificador sobre cada camiseta. Solo sirve para saber qué pieza es cuál
     * al editar: en lo que se ve y se imprime se quita para no confundirlo con el dorsal.
     */
    numeros?: boolean | "rojas";
    /** Los nombres salen a la derecha de la camiseta (no debajo), p. ej. en el córner defensivo. */
    nombreAlLado?: boolean;
    /** Factor de tamaño de los nombres (para dibujos que se imprimen pequeños). */
    textoK?: number;
    /** Raya de color bajo el nombre de cada jugador (id -> color): titular o suplente del partido. */
    subrayados?: Map<string, string>;
  },
): string {
  const { ancho, alto, k } = dimensionesCampo(d.campo);
  const camisetas = opciones?.camisetas || d.campo === "abp";
  const ids: IdsCamisetas | undefined = camisetas
    ? {
        blanca: `camisa-b-${++contadorCamisetas}`,
        granate: `camisa-g-${contadorCamisetas}`,
        lanzador: `camisa-l-${contadorCamisetas}`,
      }
    : undefined;
  // Zonas y flechas debajo, jugadores/material encima.
  const orden: Record<TipoElemento, number> =
    d.campo === "abp"
      ? // En las jugadas de ABP las flechas van por encima de las camisetas, como en el PowerPoint.
        { zona: 0, porteria: 1, icono: 1, cono: 2, pica: 2, jugador: 2, balon: 3, flecha: 4, texto: 5 }
      : { zona: 0, porteria: 1, flecha: 2, icono: 3, cono: 3, pica: 3, balon: 4, jugador: 5, texto: 6 };
  // En las jugadas de ABP el balón va junto al lanzador, hacia el centro del campo,
  // salvo que ya se haya dibujado uno.
  const extra: ElementoDiagrama[] = [];
  if (d.campo === "abp" && !d.elementos.some((e) => e.tipo === "balon")) {
    const l = d.elementos.find((e) => e.tipo === "icono" && e.icono === "lanzador");
    if (l) {
      const lado = l.x < ancho / 2 ? 1 : -1;
      const esc = l.escala ?? 1;
      extra.push({
        id: "balon-lanzador",
        tipo: "balon",
        x: l.x + lado * 22 * k * esc,
        y: l.y + 12 * k * esc,
      });
    }
  }
  const elementos = [...d.elementos, ...extra].sort((a, b) => orden[a.tipo] - orden[b.tipo]);
  const sel = opciones?.seleccionId
    ? d.elementos.find((e) => e.id === opciones.seleccionId)
    : null;
  let resalte = "";
  if (sel) {
    if (sel.tipo === "flecha" || sel.tipo === "zona") {
      resalte = `<circle cx="${sel.x}" cy="${sel.y}" r="${7 * k}" fill="#ffffff" fill-opacity="0.6" stroke="#38bdf8" stroke-width="${2 * k}"/>
        <circle cx="${sel.x2 ?? sel.x}" cy="${sel.y2 ?? sel.y}" r="${7 * k}" fill="#ffffff" fill-opacity="0.6" stroke="#38bdf8" stroke-width="${2 * k}"/>`;
      if (sel.tipo === "flecha") {
        // Asa del medio: arrastrarla curva la flecha.
        const m = puntoMedioFlecha(sel);
        resalte += `<rect x="${m.x - 6 * k}" y="${m.y - 6 * k}" width="${12 * k}" height="${12 * k}" rx="${2 * k}" fill="#38bdf8" stroke="#ffffff" stroke-width="${1.5 * k}"/>`;
      }
    } else {
      const radio = 19 * k * Math.max(1, sel.escala ?? 1);
      resalte = `<circle cx="${sel.x}" cy="${sel.y}" r="${radio}" fill="none" stroke="#38bdf8" stroke-width="${2 * k}" stroke-dasharray="${4 * k} ${3 * k}"/>`;
    }
  }
  const fondo =
    d.campo === "abp"
      ? fondoAbp()
      : `<rect width="${CAMPO_ANCHO}" height="${CAMPO_ALTO}" fill="#2f8f3a"/>
    ${[0, 1, 2, 3, 4, 5]
      .map(
        (i) =>
          `<rect x="0" y="${i * 57}" width="${CAMPO_ANCHO}" height="28.5" fill="#ffffff" fill-opacity="0.04"/>`,
      )
      .join("")}
    ${lineasCampo(d.campo)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ancho} ${alto}" width="${ancho}" height="${alto}">
    ${fondo}
    ${ids ? defsCamisetas(ids) : ""}
    ${elementos.map((e) => elementoSvg(e, ids, k, opciones?.nombres, opciones?.numeros ?? true, opciones?.nombreAlLado, opciones?.textoK, opciones?.subrayados)).join("\n")}
    ${opciones?.borrador ? elementoSvg(opciones.borrador, ids, k, opciones?.nombres, opciones?.numeros ?? true, opciones?.nombreAlLado, opciones?.textoK, opciones?.subrayados) : ""}
    ${resalte}
  </svg>`;
}

export function diagramaVacio(campo: TipoCampo = "medio"): Diagrama {
  return { campo, elementos: [] };
}

function distanciaASegmento(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Elemento más cercano al punto (o null), para seleccionar/mover en el editor.
export function elementoEn(d: Diagrama, x: number, y: number): ElementoDiagrama | null {
  const { k } = dimensionesCampo(d.campo);
  let mejor: ElementoDiagrama | null = null;
  let mejorDist = Infinity;
  for (let i = d.elementos.length - 1; i >= 0; i--) {
    const e = d.elementos[i];
    let dist: number;
    let umbral = 18 * k;
    if (e.tipo === "flecha") {
      if (esCurva(e)) {
        // Se mide contra varios puntos de la curva (el trazo se aleja de la recta).
        const { cx, cy } = controlCurva(e);
        const ex = e.x2 ?? e.x;
        const ey = e.y2 ?? e.y;
        dist = Infinity;
        for (let t = 0; t <= 1.0001; t += 0.1) {
          const u = 1 - t;
          const px = u * u * e.x + 2 * u * t * cx + t * t * ex;
          const py = u * u * e.y + 2 * u * t * cy + t * t * ey;
          dist = Math.min(dist, Math.hypot(x - px, y - py));
        }
        dist += 4 * k;
      } else {
        dist = distanciaASegmento(x, y, e.x, e.y, e.x2 ?? e.x, e.y2 ?? e.y) + 4 * k;
      }
    } else if (e.tipo === "zona") {
      const x1 = Math.min(e.x, e.x2 ?? e.x);
      const x2 = Math.max(e.x, e.x2 ?? e.x);
      const y1 = Math.min(e.y, e.y2 ?? e.y);
      const y2 = Math.max(e.y, e.y2 ?? e.y);
      const dentro = x >= x1 && x <= x2 && y >= y1 && y <= y2;
      const dBorde = Math.min(
        Math.abs(x - x1),
        Math.abs(x - x2),
        Math.abs(y - y1),
        Math.abs(y - y2),
      );
      dist = (dentro ? dBorde : Math.hypot(Math.max(x1 - x, 0, x - x2), Math.max(y1 - y, 0, y - y2))) + 8 * k;
    } else if (e.tipo === "porteria") {
      dist = Math.hypot(Math.max(Math.abs(x - e.x) - 24 * k, 0), Math.max(Math.abs(y - e.y) - 8 * k, 0)) + 6 * k;
    } else {
      dist = Math.hypot(x - e.x, y - e.y);
      // Una camiseta grande se agarra desde más lejos del centro.
      if (e.tipo === "jugador" || e.tipo === "icono") umbral *= Math.max(1, e.escala ?? 1);
    }
    if (dist < umbral && dist < mejorDist) {
      mejor = e;
      mejorDist = dist;
    }
  }
  return mejor;
}

// Rasteriza el diagrama a un PNG (el mismo formato que las imágenes que ya se
// subían a mano), para guardarlo como imagen de la tarea.
export async function diagramaAPng(
  d: Diagrama,
  nombre: string,
  nombres?: NombresJugadores,
): Promise<File> {
  const svg = diagramaASvg(d, { nombres });
  const { ancho, alto } = dimensionesCampo(d.campo);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("No se ha podido generar la imagen del diagrama"));
      img.src = url;
    });
    // 2 px por unidad en los campos pequeños; el de ABP ya viene en 1056 de ancho.
    const escala = d.campo === "abp" ? 1 : 2;
    const canvas = document.createElement("canvas");
    canvas.width = ancho * escala;
    canvas.height = alto * escala;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se ha podido generar la imagen del diagrama");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) throw new Error("No se ha podido generar la imagen del diagrama");
    return new File([blob], nombre, { type: "image/png" });
  } finally {
    URL.revokeObjectURL(url);
  }
}
