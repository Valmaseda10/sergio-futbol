// Tareas guardadas para reutilizar en otras sesiones: un instante de todos los
// campos de una tarea del formulario (sin los roles de los entrenadores, que
// son de cada sesión) más su diagrama dibujado y su rotación por equipos. La
// imagen va aparte, como archivo en el bucket (ver `imagen_url`).

import type { Json } from "@/lib/types/database.types";
import type { Diagrama, RotacionTarea } from "@/lib/ficha-entrenamiento";

// Campos de texto de una tarea; el nombre real en el formulario es
// `tarea_<n><sufijo>` (el título es `tarea_<n>` a secas).
export const SUFIJOS_TAREA = [
  "",
  "_categoria",
  "_minutos",
  "_dimension",
  "_series",
  "_tiempo",
  "_objetivos_def",
  "_objetivos_ofe",
  "_rotacion",
  "_reglas_provocacion",
  "_observaciones",
] as const;

export type SufijoTarea = (typeof SUFIJOS_TAREA)[number];

export interface DatosTareaGuardada {
  campos: Partial<Record<SufijoTarea, string>>;
  diagrama: Diagrama | null;
  equipos: RotacionTarea | null;
}

export function leerDatosTarea(json: Json | null | undefined): DatosTareaGuardada {
  const vacio: DatosTareaGuardada = { campos: {}, diagrama: null, equipos: null };
  if (!json || typeof json !== "object" || Array.isArray(json)) return vacio;
  const d = json as unknown as Partial<DatosTareaGuardada>;
  return {
    campos: d.campos ?? {},
    diagrama: d.diagrama ?? null,
    equipos: d.equipos ?? null,
  };
}

/** Primera línea del título de la tarea, como nombre por defecto al guardarla. */
export function nombreSugerido(titulo: string): string {
  return titulo.split("\n")[0].trim().slice(0, 80);
}
