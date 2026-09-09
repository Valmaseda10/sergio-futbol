// Lee el texto de un PDF de sesión (exportado de Word/Canva/Google Docs, no
// una foto escaneada) y detecta hasta 4 tareas con su categoría y minutos ya
// rellenos, que el entrenador confirma o corrige antes de guardar — nunca se
// aplica nada sin que lo vea primero.
//
// Se soportan dos formatos, probados los dos:
// 1. Plantilla de sesión con tabla "D ... E ... T ..." por bloque y el
//    nombre de la tarea en una pestaña girada 90º a un lado (el formato real
//    que usa el club) — ver tareasDePaginaEnTabla.
// 2. Texto libre línea a línea tipo "Activación — 10 min" (fallback, por si
//    el PDF viene de otro sitio) — ver parsearTareasEnTextoLibre.

import type { TextItem } from "pdfjs-dist/types/src/display/api";
import type { CategoriaTarea } from "@/lib/types/database.types";
import { detectarCategoriaPorTexto } from "@/lib/validations/categoria-tarea";

export interface TareaDetectada {
  texto: string;
  // null cuando se ve la tarea pero no se puede fiar la duración (p. ej. "3
  // x 5 series", donde "series" no es una unidad de tiempo) — mejor no
  // inventar minutos que rellenar con un número que no está en el PDF.
  minutos: number | null;
  categoria: CategoriaTarea | null;
}

interface Fragmento {
  x: number;
  y: number;
  str: string;
  width: number;
}

// --- Duración de un bloque ("D ... E ... T ...") ---------------------------

// La celda "T" trae la duración como "2x 4’" (series x minutos, se
// multiplican), "2 x 10’" o un solo número con "min"/"minutos". La comilla
// de minuto suele salir tipográfica (’) al exportar desde Word/PowerPoint,
// no la recta ('), así que se aceptan las dos variantes (y el prima ′).
const UNIDAD_MINUTOS = "(?:min(?:utos)?|['’′])";
const PATRON_MINUTOS_DOBLE = new RegExp(
  `(\\d{1,3})\\s*[x×]\\s*(\\d{1,3})\\s*${UNIDAD_MINUTOS}`,
  "i",
);
const PATRON_MINUTOS_SIMPLE = new RegExp(`(\\d{1,3})\\s*${UNIDAD_MINUTOS}`, "i");

function extraerMinutos(texto: string): number | null {
  const doble = texto.match(PATRON_MINUTOS_DOBLE);
  if (doble) {
    const series = Number(doble[1]);
    const minutos = Number(doble[2]);
    const total = series * minutos;
    if (series > 0 && minutos > 0 && total <= 180) return total;
  }
  const simple = texto.match(PATRON_MINUTOS_SIMPLE);
  if (simple) {
    const minutos = Number(simple[1]);
    if (minutos > 0 && minutos <= 180) return minutos;
  }
  return null;
}

// --- Formato 1: plantilla con tabla D/E/T + pestaña lateral ---------------

// Agrupa fragmentos horizontales en líneas por cercanía de Y (no por
// Math.round a una rejilla fija): en PDFs reales las celdas de una misma
// fila no comparten siempre el mismo baseline exacto -- hay saltos de hasta
// ~0.4pt entre celdas de la misma fila que con una rejilla fija a veces caen
// justo a los dos lados de un límite de bucket.
function agruparLineasHorizontales(
  fragmentos: Fragmento[],
  tolerancia = 1.5,
): { y: number; texto: string }[] {
  const ordenados = fragmentos.slice().sort((a, b) => b.y - a.y);
  const grupos: { y: number; items: Fragmento[] }[] = [];
  let actual: { y: number; items: Fragmento[] } | null = null;
  for (const f of ordenados) {
    if (actual && actual.y - f.y < tolerancia) {
      actual.items.push(f);
    } else {
      actual = { y: f.y, items: [f] };
      grupos.push(actual);
    }
  }
  return grupos
    .map((g) => {
      const porX = g.items.slice().sort((a, b) => a.x - b.x);
      // Las celdas de una tabla no traen espacio propio entre ellas (cada
      // una se posiciona por coordenadas, no por texto): se inserta uno solo
      // cuando hay un hueco real entre el final de una celda y el principio
      // de la siguiente, para no separar palabras que sí venían partidas en
      // varios fragmentos seguidos sin hueco (p. ej. "Ca" + "mpos").
      let texto = "";
      let finAnterior: number | null = null;
      for (const f of porX) {
        if (finAnterior !== null && f.x - finAnterior > 1) texto += " ";
        texto += f.str;
        finAnterior = f.x + f.width;
      }
      return { y: g.y, texto: texto.replace(/\s+/g, " ").trim() };
    })
    .filter((l) => l.texto.length > 0);
}

// Un texto girado 90º (la pestaña lateral con el nombre de la tarea, p. ej.
// "HÁBITO: RUEDA DE PASES") tiene la matriz de transformación sin escala
// horizontal/vertical normal (los dos primeros valores quedan ~0 porque el
// texto avanza en el eje Y en vez del X).
function esVertical(transform: number[]): boolean {
  return (
    Math.abs(transform[0]) < 1 &&
    Math.abs(transform[3]) < 1 &&
    (Math.abs(transform[1]) >= 1 || Math.abs(transform[2]) >= 1)
  );
}

// La cabecera de la plantilla ("SESIÓN DE ENTRENAMIENTO", "INFANTIL B -
// 2026 /2027"...) también sale como texto girado en la página 1, en
// fragmentos sueltos de una sola palabra o número: se descarta antes de
// agrupar por si acaso, para no colarla como si fuera el nombre de una
// tarea real (que siempre llega como una frase completa en un solo
// fragmento).
const ETIQUETA_CABECERA =
  /^(sesi[oó]n|de|entrenamiento|infantil|[a-z]|-|\d{4}|\/\d{4})$/i;

// Agrupa las pestañas verticales por bloque: cercanas en X (misma columna
// lateral) Y en Y (mismo bloque) — a diferencia de las líneas horizontales,
// agrupar solo por X juntaría las pestañas de TODOS los bloques de la
// página, porque todas viven en la misma columna de margen izquierdo.
function agruparEtiquetasVerticales(
  fragmentos: Fragmento[],
): { y: number; texto: string }[] {
  const ordenados = fragmentos.slice().sort((a, b) => b.y - a.y);
  const grupos: { x: number; y: number; items: Fragmento[] }[] = [];
  let actual: { x: number; y: number; items: Fragmento[] } | null = null;
  for (const f of ordenados) {
    if (actual && Math.abs(f.x - actual.x) < 5 && actual.y - f.y < 20) {
      actual.items.push(f);
      actual.y = f.y;
    } else {
      actual = { x: f.x, y: f.y, items: [f] };
      grupos.push(actual);
    }
  }
  return grupos
    .map((g) => ({
      y: g.items[0].y,
      texto: g.items
        .slice()
        .sort((a, b) => a.y - b.y)
        .map((f) => f.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    }))
    .filter((l) => l.texto.length > 2);
}

const PATRON_FILA_DET = /^D\s+\S.*?\bE\b\s*\d+\s*\bT\b\s*(.+)$/i;

function tareasDePaginaEnTabla(items: TextItem[]): TareaDetectada[] {
  const normales: Fragmento[] = [];
  const verticales: Fragmento[] = [];
  for (const item of items) {
    if (!item.str.trim()) continue;
    const frag: Fragmento = {
      x: item.transform[4],
      y: item.transform[5],
      str: item.str,
      width: item.width,
    };
    if (esVertical(item.transform)) {
      if (!ETIQUETA_CABECERA.test(item.str.trim())) verticales.push(frag);
    } else {
      normales.push(frag);
    }
  }

  const filasDuracion = agruparLineasHorizontales(normales)
    .map((l) => l.texto.match(PATRON_FILA_DET))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => m[1]);

  const etiquetas = agruparEtiquetasVerticales(verticales).map((e) => e.texto);

  // Cada bloque tiene una pestaña y una fila D/E/T, en el mismo orden de
  // arriba a abajo (las dos listas ya vienen ordenadas así) — no hace falta
  // casar por coordenadas exactas, solo emparejar por posición.
  const n = Math.min(filasDuracion.length, etiquetas.length);
  const tareas: TareaDetectada[] = [];
  for (let i = 0; i < n; i++) {
    const texto = etiquetas[i];
    tareas.push({
      texto,
      minutos: extraerMinutos(filasDuracion[i]),
      categoria: detectarCategoriaPorTexto(texto),
    });
  }
  return tareas;
}

// --- Formato 2 (fallback): texto libre "Tarea — N min" ---------------------

const PATRON_MINUTOS_LIBRE = /(\d{1,3})\s*(?:min(?:utos)?|['’′])\b/i;

function agruparLineasSimples(items: TextItem[]): string[] {
  const filas = new Map<number, { x: number; str: string }[]>();
  for (const item of items) {
    if (!item.str.trim()) continue;
    const y = Math.round(item.transform[5]);
    const fila = filas.get(y) ?? [];
    fila.push({ x: item.transform[4], str: item.str });
    filas.set(y, fila);
  }
  return Array.from(filas.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([, fragmentos]) =>
      fragmentos
        .sort((a, b) => a.x - b.x)
        .map((f) => f.str)
        .join("")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((linea) => linea.length > 0);
}

function parsearTareasEnTextoLibre(lineas: string[]): TareaDetectada[] {
  const detectadas: TareaDetectada[] = [];
  for (const linea of lineas) {
    const match = linea.match(PATRON_MINUTOS_LIBRE);
    if (!match || match.index == null) continue;
    const minutos = Number(match[1]);
    if (!minutos || minutos <= 0 || minutos > 180) continue;

    let texto = linea.slice(0, match.index).trim();
    texto = texto.replace(/[-–—:·|]+$/, "").trim();
    if (!texto) continue;

    detectadas.push({
      texto,
      minutos,
      categoria: detectarCategoriaPorTexto(texto),
    });
  }
  return detectadas;
}

/** Devuelve [] si el PDF no tiene texto extraíble (p. ej. es una foto
 * escaneada) o si no se reconoce ninguna tarea en ningún formato. */
export async function extraerTareasDePdf(
  file: File,
): Promise<TareaDetectada[]> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const tareasEnTabla: TareaDetectada[] = [];
  const lineasSimples: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const pagina = await pdf.getPage(i);
    const contenido = await pagina.getTextContent();
    const items = contenido.items.filter(
      (item): item is TextItem => "str" in item,
    );
    tareasEnTabla.push(...tareasDePaginaEnTabla(items));
    lineasSimples.push(...agruparLineasSimples(items));
  }

  if (tareasEnTabla.length > 0) return tareasEnTabla.slice(0, 4);
  return parsearTareasEnTextoLibre(lineasSimples).slice(0, 4);
}
