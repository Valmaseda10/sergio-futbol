import { z } from "zod";

export const lesionSchema = z.object({
  jugador_id: z.string().trim().min(1, "Selecciona un jugador"),
  fecha_inicio: z.string().trim().min(1, "Introduce la fecha de inicio"),
  tipo: z.string().trim().min(1, "Introduce el tipo de lesión"),
  mecanismo: z.string().trim(),
  fecha_prevista_alta: z.string().trim(),
  fecha_alta_real: z.string().trim(),
  notas: z.string().trim(),
});

export type LesionFormValues = z.infer<typeof lesionSchema>;

export const LESION_FORM_DEFAULTS: LesionFormValues = {
  jugador_id: "",
  fecha_inicio: "",
  tipo: "",
  mecanismo: "",
  fecha_prevista_alta: "",
  fecha_alta_real: "",
  notas: "",
};

export function toLesionInsert(values: LesionFormValues) {
  return {
    jugador_id: values.jugador_id,
    fecha_inicio: values.fecha_inicio,
    tipo: values.tipo,
    mecanismo: values.mecanismo || null,
    fecha_prevista_alta: values.fecha_prevista_alta || null,
    fecha_alta_real: values.fecha_alta_real || null,
    notas: values.notas || null,
  };
}

export const lesionSesionSchema = z.object({
  fecha: z.string().trim().min(1, "Introduce la fecha"),
  horario: z.string().trim(),
  notas: z.string().trim(),
});

export type LesionSesionFormValues = z.infer<typeof lesionSesionSchema>;

export const LESION_SESION_FORM_DEFAULTS: LesionSesionFormValues = {
  fecha: "",
  horario: "",
  notas: "",
};

export function toLesionSesionInsert(values: LesionSesionFormValues) {
  return {
    fecha: values.fecha,
    horario: values.horario || null,
    notas: values.notas || null,
  };
}
