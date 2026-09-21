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

// Régimen interno del equipo: mismo catálogo de faltas que otros equipos del
// club llevan con multas en euros, pero convertido a puntos (sin dinero de
// por medio). Al llegar al umbral (ver PUNTOS_CASTIGO) toca castigo.
export const NORMAS: { categoria: CategoriaNorma; texto: string; puntos: number }[] = [
  { categoria: "entrenamiento", texto: "Llegar tarde a la convocatoria", puntos: 1 },
  { categoria: "entrenamiento", texto: "Llegar tarde al entrenamiento ya iniciado", puntos: 2 },
  {
    categoria: "entrenamiento",
    texto: "Olvidar material (botas, espinilleras, medias, camiseta, sudadera, agua...)",
    puntos: 1,
  },
  { categoria: "entrenamiento", texto: "Olvidar el foam / no hacer el wellness a tiempo", puntos: 1 },
  { categoria: "entrenamiento", texto: "No pasar el RPE-TQR", puntos: 1 },
  {
    categoria: "entrenamiento",
    texto: "Insultos, palabras malsonantes o protestas a un compañero o al cuerpo técnico",
    puntos: 2,
  },
  { categoria: "entrenamiento", texto: "Falta no justificada", puntos: 3 },

  { categoria: "partido", texto: "Llegar tarde a la convocatoria", puntos: 2 },
  { categoria: "partido", texto: "Olvidar material", puntos: 2 },
  { categoria: "partido", texto: "Olvidar el foam", puntos: 1 },
  { categoria: "partido", texto: "No pasar el RPE-TQR", puntos: 1 },
  {
    categoria: "partido",
    texto: "Insultos, palabras malsonantes o protestas a un compañero o al cuerpo técnico",
    puntos: 3,
  },
  { categoria: "partido", texto: "Tarjeta amarilla por desplazar el balón", puntos: 1 },
  { categoria: "partido", texto: "Tarjeta amarilla por protestar", puntos: 2 },
  { categoria: "partido", texto: "Tarjeta roja", puntos: 3 },

  { categoria: "generales", texto: "Entrenar con pendientes, cadenas o anillos", puntos: 1 },
  { categoria: "generales", texto: "Móvil en el vestuario (salvo para poner música)", puntos: 1 },
  { categoria: "generales", texto: "Excederse en el tiempo post-entreno", puntos: 1 },
  { categoria: "generales", texto: "Uniformidad no correspondiente", puntos: 2 },
];

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

export type MultaFormValues = z.infer<typeof multaSchema>;
