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
// vive en la tabla `normas` y se edita desde la página Normas. Al llegar al
// umbral (ver PUNTOS_CASTIGO) toca castigo.
// A partir de este total de puntos sin resolver, toca castigo (recoger
// material o traer algo para compartir).
export const PUNTOS_CASTIGO = 5;

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
