// Lee el texto de un PDF de sesión (exportado de Word/Canva/Google Docs, no
// una foto escaneada) y detecta líneas del tipo "Tarea — N min" para
// proponer un borrador de las 4 tareas del entrenamiento con su categoría y
// minutos ya rellenos, que el entrenador confirma o corrige antes de
// guardar — nunca se aplica nada sin que lo vea primero.

import type { TextItem } from "pdfjs-dist/types/src/display/api";
import type { CategoriaTarea } from "@/lib/types/database.types";
import { detectarCategoriaPorTexto } from "@/lib/validations/categoria-tarea";

export interface TareaDetectada {
  texto: string;
  minutos: number;
  categoria: CategoriaTarea | null;
}

// Números seguidos de "min", "minutos" o el símbolo de minuto (') — con
// límite de palabra para no confundir con dorsales, resultados, etc.
const PATRON_MINUTOS = /(\d{1,3})\s*(?:min(?:utos)?|')\b/i;

function agruparLineasDePagina(items: TextItem[]): string[] {
  // El texto de pdf.js llega como fragmentos sueltos con su posición (x, y)
  // dentro de la página, no como líneas: se reconstruyen agrupando los
  // fragmentos que comparten la misma altura (y) y ordenándolos por x.
  const filas = new Map<number, { x: number; str: string }[]>();
  for (const item of items) {
    if (!item.str.trim()) continue;
    const y = Math.round(item.transform[5]);
    const fila = filas.get(y) ?? [];
    fila.push({ x: item.transform[4], str: item.str });
    filas.set(y, fila);
  }
  return Array.from(filas.entries())
    .sort((a, b) => b[0] - a[0]) // de arriba a abajo (y decrece en pdf.js)
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

function parsearTareas(lineas: string[]): TareaDetectada[] {
  const detectadas: TareaDetectada[] = [];
  for (const linea of lineas) {
    const match = linea.match(PATRON_MINUTOS);
    if (!match || match.index == null) continue;
    const minutos = Number(match[1]);
    if (!minutos || minutos <= 0 || minutos > 180) continue;

    let texto = linea.slice(0, match.index).trim();
    // Quita separadores sueltos al final ("Activación —", "Activación:"...)
    texto = texto.replace(/[-–—:·|]+$/, "").trim();
    if (!texto) continue;

    detectadas.push({
      texto,
      minutos,
      categoria: detectarCategoriaPorTexto(texto),
    });
  }
  return detectadas.slice(0, 4);
}

/** Devuelve [] si el PDF no tiene texto extraíble (p. ej. es una foto
 * escaneada) o si no se reconoce ninguna línea con formato "tarea — min". */
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

  const lineas: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const pagina = await pdf.getPage(i);
    const contenido = await pagina.getTextContent();
    const items = contenido.items.filter(
      (item): item is TextItem => "str" in item,
    );
    lineas.push(...agruparLineasDePagina(items));
  }

  return parsearTareas(lineas);
}
