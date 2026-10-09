// Datos extra de la ficha de sesión (columna jsonb `entrenamientos.ficha`):
// cabecera (nº de sesión, convocados), tabla de objetivos y diagramas
// dibujados en la app. Todo opcional: una sesión antigua tiene `ficha` null.

import type { Json } from "@/lib/types/database.types";

export type TipoElemento =
  | "jugador"
  | "porteria"
  | "cono"
  | "pica"
  | "balon"
  | "texto"
  | "flecha"
  | "zona";

export type TipoCampo = "medio" | "completo";

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
}

export interface Diagrama {
  campo: TipoCampo;
  elementos: ElementoDiagrama[];
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

export const COLORES_DIAGRAMA: { valor: string; nombre: string }[] = [
  { valor: "#dc2626", nombre: "Rojo" },
  { valor: "#1e3a8a", nombre: "Azul" },
  { valor: "#facc15", nombre: "Amarillo" },
  { valor: "#4ade80", nombre: "Verde" },
  { valor: "#111111", nombre: "Negro" },
  { valor: "#ffffff", nombre: "Blanco" },
  { valor: "#f97316", nombre: "Naranja" },
];

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

// Punto de control de una flecha curva (curva cuadrática).
function controlCurva(e: ElementoDiagrama): { cx: number; cy: number } {
  const x2 = e.x2 ?? e.x;
  const y2 = e.y2 ?? e.y;
  const k = e.curva ?? 0;
  return {
    cx: (e.x + x2) / 2 - (y2 - e.y) * k,
    cy: (e.y + y2) / 2 + (x2 - e.x) * k,
  };
}

function flechaSvg(e: ElementoDiagrama, grosor = 3): string {
  const x2 = e.x2 ?? e.x;
  const y2 = e.y2 ?? e.y;
  const color = e.color ?? "#dc2626";
  const curva = !!e.curva;
  const { cx, cy } = controlCurva(e);
  const ang = curva ? Math.atan2(y2 - cy, x2 - cx) : Math.atan2(y2 - e.y, x2 - e.x);
  const punta = 11;
  const a1 = ang + Math.PI - 0.45;
  const a2 = ang + Math.PI + 0.45;
  const p1 = `${x2 + punta * Math.cos(a1)},${y2 + punta * Math.sin(a1)}`;
  const p2 = `${x2 + punta * Math.cos(a2)},${y2 + punta * Math.sin(a2)}`;
  const dash = e.discontinua ? ' stroke-dasharray="7 5"' : "";
  const trazo = curva
    ? `<path d="M${e.x} ${e.y} Q${cx} ${cy} ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="${grosor}"${dash} stroke-linecap="round"/>`
    : `<line x1="${e.x}" y1="${e.y}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${grosor}"${dash} stroke-linecap="round"/>`;
  return `${trazo}
    <polygon points="${x2},${y2} ${p1} ${p2}" fill="${color}"/>`;
}

function elementoSvg(e: ElementoDiagrama): string {
  const c = e.color ?? "#dc2626";
  switch (e.tipo) {
    case "jugador": {
      const txt = e.etiqueta
        ? `<text x="${e.x}" y="${e.y + 4}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="${
            c === "#ffffff" || c === "#facc15" || c === "#4ade80" ? "#111111" : "#ffffff"
          }">${esc(e.etiqueta)}</text>`
        : "";
      return `<circle cx="${e.x}" cy="${e.y}" r="12" fill="${c}" stroke="#111111" stroke-width="1.5"/>${txt}`;
    }
    case "porteria":
      return `<rect x="${e.x - 24}" y="${e.y - 7}" width="48" height="14" fill="#ffffff" fill-opacity="0.35" stroke="#e5e7eb" stroke-width="2"/>
        <line x1="${e.x - 24}" y1="${e.y}" x2="${e.x + 24}" y2="${e.y}" stroke="#e5e7eb" stroke-width="1"/>`;
    case "cono":
      return `<polygon points="${e.x},${e.y - 10} ${e.x - 9},${e.y + 8} ${e.x + 9},${e.y + 8}" fill="${
        e.color ?? "#f97316"
      }" stroke="#111111" stroke-width="1"/>`;
    case "pica":
      return `<rect x="${e.x - 4}" y="${e.y - 13}" width="8" height="26" rx="3" fill="${
        e.color ?? "#facc15"
      }" stroke="#111111" stroke-width="1"/>`;
    case "balon":
      return `<circle cx="${e.x}" cy="${e.y}" r="7.5" fill="#ffffff" stroke="#111111" stroke-width="1.5"/>
        <circle cx="${e.x}" cy="${e.y}" r="2.6" fill="#111111"/>`;
    case "texto":
      return `<text x="${e.x}" y="${e.y}" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="${
        e.color ?? "#ffffff"
      }" stroke="#111111" stroke-width="0.6" paint-order="stroke">${esc(e.etiqueta ?? "")}</text>`;
    case "flecha":
      return flechaSvg(e);
    case "zona": {
      const x2 = e.x2 ?? e.x;
      const y2 = e.y2 ?? e.y;
      return `<rect x="${Math.min(e.x, x2)}" y="${Math.min(e.y, y2)}" width="${Math.abs(
        x2 - e.x,
      )}" height="${Math.abs(y2 - e.y)}" fill="none" stroke="${
        e.color ?? "#111111"
      }" stroke-width="2.5" stroke-dasharray="8 6"/>`;
    }
  }
}

export function diagramaASvg(
  d: Diagrama,
  opciones?: { seleccionId?: string | null; borrador?: ElementoDiagrama | null },
): string {
  // Zonas y flechas debajo, jugadores/material encima.
  const orden: Record<TipoElemento, number> = {
    zona: 0,
    porteria: 1,
    flecha: 2,
    cono: 3,
    pica: 3,
    balon: 4,
    jugador: 5,
    texto: 6,
  };
  const elementos = [...d.elementos].sort((a, b) => orden[a.tipo] - orden[b.tipo]);
  const sel = opciones?.seleccionId
    ? d.elementos.find((e) => e.id === opciones.seleccionId)
    : null;
  let resalte = "";
  if (sel) {
    if (sel.tipo === "flecha" || sel.tipo === "zona") {
      resalte = `<circle cx="${sel.x}" cy="${sel.y}" r="6" fill="none" stroke="#38bdf8" stroke-width="2"/>
        <circle cx="${sel.x2 ?? sel.x}" cy="${sel.y2 ?? sel.y}" r="6" fill="none" stroke="#38bdf8" stroke-width="2"/>`;
    } else {
      resalte = `<circle cx="${sel.x}" cy="${sel.y}" r="19" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="4 3"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CAMPO_ANCHO} ${CAMPO_ALTO}" width="${CAMPO_ANCHO}" height="${CAMPO_ALTO}">
    <rect width="${CAMPO_ANCHO}" height="${CAMPO_ALTO}" fill="#2f8f3a"/>
    ${[0, 1, 2, 3, 4, 5]
      .map(
        (i) =>
          `<rect x="0" y="${i * 57}" width="${CAMPO_ANCHO}" height="28.5" fill="#ffffff" fill-opacity="0.04"/>`,
      )
      .join("")}
    ${lineasCampo(d.campo)}
    ${elementos.map(elementoSvg).join("\n")}
    ${opciones?.borrador ? elementoSvg(opciones.borrador) : ""}
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
  let mejor: ElementoDiagrama | null = null;
  let mejorDist = Infinity;
  for (let i = d.elementos.length - 1; i >= 0; i--) {
    const e = d.elementos[i];
    let dist: number;
    if (e.tipo === "flecha") {
      if (e.curva) {
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
        dist += 4;
      } else {
        dist = distanciaASegmento(x, y, e.x, e.y, e.x2 ?? e.x, e.y2 ?? e.y) + 4;
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
      dist = (dentro ? dBorde : Math.hypot(Math.max(x1 - x, 0, x - x2), Math.max(y1 - y, 0, y - y2))) + 8;
    } else if (e.tipo === "porteria") {
      dist = Math.hypot(Math.max(Math.abs(x - e.x) - 24, 0), Math.max(Math.abs(y - e.y) - 8, 0)) + 6;
    } else {
      dist = Math.hypot(x - e.x, y - e.y);
    }
    if (dist < 18 && dist < mejorDist) {
      mejor = e;
      mejorDist = dist;
    }
  }
  return mejor;
}

// Rasteriza el diagrama a un PNG (el mismo formato que las imágenes que ya se
// subían a mano), para guardarlo como imagen de la tarea.
export async function diagramaAPng(d: Diagrama, nombre: string): Promise<File> {
  const svg = diagramaASvg(d);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("No se ha podido generar la imagen del diagrama"));
      img.src = url;
    });
    const escala = 2;
    const canvas = document.createElement("canvas");
    canvas.width = CAMPO_ANCHO * escala;
    canvas.height = CAMPO_ALTO * escala;
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
