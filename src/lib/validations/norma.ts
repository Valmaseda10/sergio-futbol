import { z } from "zod";
import type { CategoriaNorma } from "@/lib/types/database.types";

export const CATEGORIAS_NORMA: { value: CategoriaNorma; label: string }[] = [
  { value: "entrenamiento", label: "Entrenamiento" },
  { value: "partido", label: "Partido" },
  { value: "generales", label: "Generales" },
];

export const CATEGORIA_NORMA_LABEL: Record<CategoriaNorma, string> =
  Object.fromEntries(
    CATEGORIAS_NORMA.map((c) => [c.value, c.label]),
  ) as Record<CategoriaNorma, string>;

// El catálogo de faltas del régimen interno (todas valen 1 punto por defecto)
// vive en la tabla `normas` y se edita desde la página Normas.

// Castigos por puntos acumulados en el mes: al llegar a cada umbral toca el
// castigo correspondiente (el mayor alcanzado). Los puntos vuelven a 0 al
// empezar cada mes.
export const CASTIGOS: { puntos: number; texto: string }[] = [
  { puntos: 2, texto: "2 diagonales" },
  { puntos: 5, texto: "Pasillo de collejas" },
  { puntos: 8, texto: "Caja de rosquillas" },
];

// Primer umbral: a partir de aquí ya hay castigo.
export const PUNTOS_CASTIGO = CASTIGOS[0].puntos;

/** Castigo que toca con esos puntos (el del umbral más alto alcanzado). */
export function castigoDePuntos(puntos: number): string | null {
  const alcanzados = CASTIGOS.filter((c) => puntos >= c.puntos);
  return alcanzados.length > 0 ? alcanzados[alcanzados.length - 1].texto : null;
}

/** Mes en curso como "AAAA-MM", para contar solo los puntos de este mes. */
export function mesActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

export const multaSchema = z.object({
  jugador_id: z.string().min(1, "Selecciona un jugador"),
  categoria: z.enum(["entrenamiento", "partido", "generales"]),
  norma: z.string().trim().min(1, "Escribe la falta"),
  puntos: z.coerce.number().int().min(1, "Mínimo 1 punto").max(10, "Máximo 10 puntos"),
  notas: z.string().trim().optional(),
});

export const normaSchema = z.object({
  categoria: z.enum(["entrenamiento", "partido", "generales"]),
  texto: z.string().trim().min(1, "Escribe la falta"),
  puntos: z.coerce.number().int().min(1, "Mínimo 1 punto").max(10, "Máximo 10 puntos"),
});

export type NormaFormValues = z.infer<typeof normaSchema>;

export type MultaFormValues = z.infer<typeof multaSchema>;
