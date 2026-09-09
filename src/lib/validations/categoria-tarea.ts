import type { CategoriaTarea } from "@/lib/types/database.types";

// Lista cerrada de categorías para clasificar cada tarea de un
// entrenamiento (Planificación → Tarea 1..4): son la "nomenclatura" fija que
// permite contar cuántas veces se ha trabajado cada una y sumar sus
// minutos, para CUALQUIER tarea (esté o no tomada de la biblioteca de
// ejercicios).
export const CATEGORIAS_TAREA: { value: CategoriaTarea; label: string }[] = [
  { value: "activacion", label: "Activación" },
  { value: "ataque_defensas", label: "Ataque-Defensas" },
  { value: "doble_areas", label: "Doble Áreas" },
  { value: "defensa", label: "Defensa" },
  { value: "posesion", label: "Posesión" },
  { value: "finalizacion", label: "Finalización" },
  { value: "partidos", label: "Partidos" },
  { value: "rueda_pases", label: "Rueda de Pases" },
  { value: "abp", label: "ABP" },
];

export const CATEGORIA_TAREA_LABEL: Record<CategoriaTarea, string> =
  Object.fromEntries(
    CATEGORIAS_TAREA.map((c) => [c.value, c.label]),
  ) as Record<CategoriaTarea, string>;

function quitarAcentos(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Palabras que, si aparecen en el texto de una tarea, hacen suponer su
// categoría sin que haga falta elegirla a mano (ver detectarCategoriaPorTexto
// más abajo). Ya sin acentos: la comparación también los quita.
const PALABRAS_CLAVE_CATEGORIA: Record<CategoriaTarea, string[]> = {
  activacion: ["activacion", "calentamiento", "movilidad"],
  ataque_defensas: [
    "ataque-defensas",
    "ataque defensas",
    "ataque vs defensa",
    "atacantes vs defensas",
    "ataque contra defensa",
    "atacantes contra defensas",
  ],
  doble_areas: ["doble area", "dobles areas", "doble porteria"],
  defensa: ["defensa", "defensivo", "repliegue", "presion"],
  posesion: [
    "posesion",
    "juego de posicion",
    // "JdPosición" es como abrevia el entrenador "Juego de Posición" en sus
    // plantillas de sesión.
    "jdposicion",
    "jd posicion",
    // Mismo lío, otra variante: "JUGO DEPOSICIÓN" en vez de "JUEGO DE
    // POSICIÓN".
    "jugo deposicion",
    "rondo",
    "mantenimiento",
    "circulacion",
    // Ejercicios de superioridad numérica (3vs2, 2vs1...) — "superioriad"
    // es como lo escribe el entrenador en sus plantillas (sin la "d").
    "superioridad",
    "superioriad",
  ],
  finalizacion: [
    "finalizacion",
    "remate",
    "definicion",
    "tiro a puerta",
    "tiro a porteria",
    // Ejercicios de "oleadas" (1vs0, 2vs1...): en sus propias plantillas de
    // sesión aparecen etiquetados como "Finalización — oleadas asimétricas".
    "oleadas",
  ],
  partidos: ["partido", "partidillo", "juego real", "juego global"],
  rueda_pases: [
    "rueda de pases",
    "rueda pases",
    // Typo/abreviatura habitual del entrenador ("RUED" en vez de "RUEDA").
    "rued de pases",
    "circuito de pases",
  ],
  abp: [
    "abp",
    "corner",
    "falta directa",
    "falta lateral",
    "penalti",
    "saque de banda",
    "estrategia",
  ],
};

/** Busca en el texto de una tarea alguna palabra clave de las categorías
 * fijas y devuelve la primera que encaja, o null si no reconoce ninguna. */
export function detectarCategoriaPorTexto(texto: string): CategoriaTarea | null {
  const normalizado = quitarAcentos(texto);
  if (!normalizado.trim()) return null;
  for (const categoria of CATEGORIAS_TAREA) {
    const palabras = PALABRAS_CLAVE_CATEGORIA[categoria.value];
    if (palabras.some((palabra) => normalizado.includes(palabra))) {
      return categoria.value;
    }
  }
  return null;
}
