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
