import { z } from "zod";
import type { CategoriaJugadorDestacado } from "@/lib/types/database.types";

export const rivalScoutingSchema = z.object({
  nombre: z.string().trim().min(1, "Introduce el nombre del rival"),
  sistema_juego: z.string().trim(),
  fase_ofensiva: z.string().trim(),
  fase_defensiva: z.string().trim(),
  transicion_ofensiva: z.string().trim(),
  transicion_defensiva: z.string().trim(),
  abp: z.string().trim(),
  notas: z.string().trim(),
});

export type RivalScoutingFormValues = z.infer<typeof rivalScoutingSchema>;

export const RIVAL_SCOUTING_FORM_DEFAULTS: RivalScoutingFormValues = {
  nombre: "",
  sistema_juego: "",
  fase_ofensiva: "",
  fase_defensiva: "",
  transicion_ofensiva: "",
  transicion_defensiva: "",
  abp: "",
  notas: "",
};

export function toRivalScoutingInsert(values: RivalScoutingFormValues) {
  return {
    nombre: values.nombre,
    sistema_juego: values.sistema_juego || null,
    fase_ofensiva: values.fase_ofensiva || null,
    fase_defensiva: values.fase_defensiva || null,
    transicion_ofensiva: values.transicion_ofensiva || null,
    transicion_defensiva: values.transicion_defensiva || null,
    abp: values.abp || null,
    notas: values.notas || null,
  };
}

export const jugadorDestacadoSchema = z.object({
  nombre: z.string().trim().min(1, "Introduce el nombre"),
  dorsal: z.string().trim(),
  categoria: z.enum(["top", "flojo"]),
  notas: z.string().trim(),
  // Enlace opcional con la plantilla del rival ya cargada: si se elige un
  // jugador de ahí, nombre/dorsal se rellenan solos (ver más abajo). Queda
  // en "" cuando se escribe el nombre a mano porque el jugador todavía no
  // está de alta en la plantilla.
  plantilla_id: z.string().trim(),
});

export type JugadorDestacadoFormValues = z.infer<typeof jugadorDestacadoSchema>;

export const JUGADOR_DESTACADO_FORM_DEFAULTS: JugadorDestacadoFormValues = {
  nombre: "",
  dorsal: "",
  categoria: "top",
  notas: "",
  plantilla_id: "",
};

export function toJugadorDestacadoInsert(values: JugadorDestacadoFormValues) {
  return {
    nombre: values.nombre,
    dorsal: values.dorsal !== "" ? Number(values.dorsal) : null,
    categoria: values.categoria as CategoriaJugadorDestacado,
    notas: values.notas || null,
    plantilla_id: values.plantilla_id || null,
  };
}

// Plantilla completa del rival: los jugadores dados de alta esta temporada
// (se consultan a mano en la ficha del club de la app de la federación),
// con su historial de la temporada anterior para tener contexto de scouting.
export const plantillaJugadorSchema = z.object({
  nombre: z.string().trim().min(1, "Introduce el nombre"),
  // "jugador" | "entrenador" | "delegado": el cuerpo técnico va en la misma
  // tabla pero se lista aparte de los jugadores en la ficha.
  rol: z.enum(["jugador", "entrenador", "delegado"]),
  // Curso dentro de Infantil: "1" (1er año, sube de Alevín) o "2" (2º año).
  // "" si no se sabe. Solo aplica a jugadores.
  curso: z.enum(["", "1", "2"]),
  dorsal: z.string().trim(),
  equipo_temporada_anterior: z.string().trim(),
  categoria_temporada_anterior: z.string().trim(),
  clasificacion_temporada_anterior: z.string().trim(),
  notas: z.string().trim(),
});

export type PlantillaJugadorFormValues = z.infer<typeof plantillaJugadorSchema>;

export const PLANTILLA_JUGADOR_FORM_DEFAULTS: PlantillaJugadorFormValues = {
  nombre: "",
  rol: "jugador",
  curso: "",
  dorsal: "",
  equipo_temporada_anterior: "",
  categoria_temporada_anterior: "",
  clasificacion_temporada_anterior: "",
  notas: "",
};

export function toPlantillaJugadorInsert(values: PlantillaJugadorFormValues) {
  const esJugador = values.rol === "jugador";
  return {
    nombre: values.nombre,
    rol: values.rol,
    curso: esJugador && values.curso !== "" ? Number(values.curso) : null,
    dorsal: esJugador && values.dorsal !== "" ? Number(values.dorsal) : null,
    equipo_temporada_anterior: values.equipo_temporada_anterior || null,
    categoria_temporada_anterior: values.categoria_temporada_anterior || null,
    clasificacion_temporada_anterior:
      values.clasificacion_temporada_anterior || null,
    notas: values.notas || null,
  };
}

// Inverso de toPlantillaJugadorInsert: para precargar el formulario al
// editar una fila ya guardada (jugador o cuerpo técnico).
export function plantillaJugadorFormValuesDesdeFila(fila: {
  nombre: string;
  rol: string;
  curso: number | null;
  dorsal: number | null;
  equipo_temporada_anterior: string | null;
  categoria_temporada_anterior: string | null;
  clasificacion_temporada_anterior: string | null;
  notas: string | null;
}): PlantillaJugadorFormValues {
  return {
    nombre: fila.nombre,
    rol: fila.rol as PlantillaJugadorFormValues["rol"],
    curso: fila.curso === 1 ? "1" : fila.curso === 2 ? "2" : "",
    dorsal: fila.dorsal != null ? String(fila.dorsal) : "",
    equipo_temporada_anterior: fila.equipo_temporada_anterior ?? "",
    categoria_temporada_anterior: fila.categoria_temporada_anterior ?? "",
    clasificacion_temporada_anterior:
      fila.clasificacion_temporada_anterior ?? "",
    notas: fila.notas ?? "",
  };
}
