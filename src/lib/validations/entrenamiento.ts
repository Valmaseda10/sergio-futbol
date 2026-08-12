import { z } from "zod";

export const entrenamientoSchema = z.object({
  fecha: z.string().trim().min(1, "Introduce la fecha"),
  hora_inicio: z.string().trim(),
  hora_fin: z.string().trim(),
  lugar: z.string().trim(),
  objetivos: z.string().trim(),
  ejercicios: z.string().trim(),
  notas: z.string().trim(),
});

export type EntrenamientoFormValues = z.infer<typeof entrenamientoSchema>;

export const ENTRENAMIENTO_FORM_DEFAULTS: EntrenamientoFormValues = {
  fecha: "",
  hora_inicio: "17:45",
  hora_fin: "19:15",
  lugar: "Área Deportiva de Puente Castro",
  objetivos: "",
  ejercicios: "",
  notas: "",
};

export function toEntrenamientoInsert(values: EntrenamientoFormValues) {
  return {
    fecha: values.fecha,
    hora_inicio: values.hora_inicio || null,
    hora_fin: values.hora_fin || null,
    lugar: values.lugar || null,
    objetivos: values.objetivos || null,
    ejercicios: values.ejercicios || null,
    notas: values.notas || null,
  };
}

export function entrenamientoFormDataToValues(
  formData: FormData,
): EntrenamientoFormValues {
  return {
    fecha: String(formData.get("fecha") ?? ""),
    hora_inicio: String(formData.get("hora_inicio") ?? ""),
    hora_fin: String(formData.get("hora_fin") ?? ""),
    lugar: String(formData.get("lugar") ?? ""),
    objetivos: String(formData.get("objetivos") ?? ""),
    ejercicios: String(formData.get("ejercicios") ?? ""),
    notas: String(formData.get("notas") ?? ""),
  };
}

export const DIAS_SEMANA = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
] as const;

export const generarSchema = z
  .object({
    fecha_inicio: z.string().trim().min(1, "Introduce la fecha de inicio"),
    fecha_fin: z.string().trim().min(1, "Introduce la fecha de fin"),
    dias: z.array(z.number()).min(1, "Selecciona al menos un día"),
    hora_inicio: z.string().trim(),
    hora_fin: z.string().trim(),
    lugar: z.string().trim(),
  })
  .refine((data) => data.fecha_inicio <= data.fecha_fin, {
    message: "La fecha de inicio debe ser anterior a la de fin",
    path: ["fecha_fin"],
  });

export type GenerarFormValues = z.infer<typeof generarSchema>;
