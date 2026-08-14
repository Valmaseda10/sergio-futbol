import { z } from "zod";
import type { CategoriaJugadorDestacado } from "@/lib/types/database.types";

export const rivalScoutingSchema = z.object({
  nombre: z.string().trim().min(1, "Introduce el nombre del rival"),
  sistema_juego: z.string().trim(),
  fase_ofensiva: z.string().trim(),
  fase_defensiva: z.string().trim(),
  abp: z.string().trim(),
  notas: z.string().trim(),
});

export type RivalScoutingFormValues = z.infer<typeof rivalScoutingSchema>;

export const RIVAL_SCOUTING_FORM_DEFAULTS: RivalScoutingFormValues = {
  nombre: "",
  sistema_juego: "",
  fase_ofensiva: "",
  fase_defensiva: "",
  abp: "",
  notas: "",
};

export function toRivalScoutingInsert(values: RivalScoutingFormValues) {
  return {
    nombre: values.nombre,
    sistema_juego: values.sistema_juego || null,
    fase_ofensiva: values.fase_ofensiva || null,
    fase_defensiva: values.fase_defensiva || null,
    abp: values.abp || null,
    notas: values.notas || null,
  };
}

export const jugadorDestacadoSchema = z.object({
  nombre: z.string().trim().min(1, "Introduce el nombre"),
  dorsal: z.string().trim(),
  categoria: z.enum(["top", "flojo"]),
  notas: z.string().trim(),
});

export type JugadorDestacadoFormValues = z.infer<typeof jugadorDestacadoSchema>;

export const JUGADOR_DESTACADO_FORM_DEFAULTS: JugadorDestacadoFormValues = {
  nombre: "",
  dorsal: "",
  categoria: "top",
  notas: "",
};

export function toJugadorDestacadoInsert(values: JugadorDestacadoFormValues) {
  return {
    nombre: values.nombre,
    dorsal: values.dorsal !== "" ? Number(values.dorsal) : null,
    categoria: values.categoria as CategoriaJugadorDestacado,
    notas: values.notas || null,
  };
}
