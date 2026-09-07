import { z } from "zod";
import { clubConfig } from "@/lib/club-config";
import type { CategoriaTarea } from "@/lib/types/database.types";

// Los inputs nativos <input type="date"> a veces dejan pasar un valor mal
// formado si se teclea dígito a dígito muy rápido en vez de usar el selector
// (sobre todo en móvil): un "13-12-2026" a medio escribir puede colar un año
// como "1333". Aquí se comprueba que el año sea razonable para no arrastrar
// ese tipo de fecha rota hasta la base de datos.
function fechaRazonable(mensajeVacio: string) {
  return z
    .string()
    .trim()
    .min(1, mensajeVacio)
    .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), {
      message: "Formato de fecha no válido",
    })
    .refine(
      (v) => {
        const año = Number(v.slice(0, 4));
        return año >= 2020 && año <= 2099;
      },
      { message: "Revisa el año de la fecha, no parece correcto" },
    );
}

export const entrenamientoSchema = z.object({
  fecha: fechaRazonable("Introduce la fecha"),
  hora_inicio: z.string().trim(),
  hora_fin: z.string().trim(),
  lugar: z.string().trim(),
  objetivos: z.string().trim(),
  tarea_1: z.string().trim(),
  tarea_2: z.string().trim(),
  tarea_3: z.string().trim(),
  tarea_4: z.string().trim(),
  // Enlace opcional con la biblioteca de ejercicios: solo para copiar texto
  // rápido, no interviene en el recuento (ver tarea_N_categoria más abajo).
  tarea_1_ejercicio_id: z.string().trim(),
  tarea_2_ejercicio_id: z.string().trim(),
  tarea_3_ejercicio_id: z.string().trim(),
  tarea_4_ejercicio_id: z.string().trim(),
  // Categoría fija (ver CATEGORIAS_TAREA): es lo que permite contar cuántas
  // veces se ha trabajado cada una y sumar sus minutos, tanto si la tarea
  // viene de la biblioteca como si se ha escrito a mano.
  tarea_1_categoria: z.string().trim(),
  tarea_2_categoria: z.string().trim(),
  tarea_3_categoria: z.string().trim(),
  tarea_4_categoria: z.string().trim(),
  tarea_1_minutos: z.string().trim(),
  tarea_2_minutos: z.string().trim(),
  tarea_3_minutos: z.string().trim(),
  tarea_4_minutos: z.string().trim(),
  notas: z.string().trim(),
});

export type EntrenamientoFormValues = z.infer<typeof entrenamientoSchema>;

export const ENTRENAMIENTO_FORM_DEFAULTS: EntrenamientoFormValues = {
  fecha: "",
  hora_inicio: "17:45",
  hora_fin: "19:15",
  lugar: clubConfig.lugarEntrenoDefecto,
  objetivos: "",
  tarea_1: "",
  tarea_2: "",
  tarea_3: "",
  tarea_4: "",
  tarea_1_ejercicio_id: "",
  tarea_2_ejercicio_id: "",
  tarea_3_ejercicio_id: "",
  tarea_4_ejercicio_id: "",
  tarea_1_categoria: "",
  tarea_2_categoria: "",
  tarea_3_categoria: "",
  tarea_4_categoria: "",
  tarea_1_minutos: "",
  tarea_2_minutos: "",
  tarea_3_minutos: "",
  tarea_4_minutos: "",
  notas: "",
};

// Si se borra el texto de una tarea, se olvida también su enlace a la
// biblioteca, su categoría y sus minutos: no tiene sentido contarla como
// "trabajada" si ya no queda ni el texto.
function tareaInsert(
  texto: string,
  ejercicioId: string,
  categoria: string,
  minutos: string,
) {
  const limpio = texto.trim();
  if (!limpio) {
    return { texto: null, ejercicioId: null, categoria: null, minutos: null };
  }
  return {
    texto: limpio,
    ejercicioId: ejercicioId || null,
    // El desplegable del formulario solo ofrece valores de CATEGORIAS_TAREA,
    // así que este cast es seguro; el campo llega como string genérico
    // porque el formulario en sí no tipa por enum.
    categoria: (categoria || null) as CategoriaTarea | null,
    minutos: minutos !== "" ? Number(minutos) : null,
  };
}

export function toEntrenamientoInsert(values: EntrenamientoFormValues) {
  const t1 = tareaInsert(
    values.tarea_1,
    values.tarea_1_ejercicio_id,
    values.tarea_1_categoria,
    values.tarea_1_minutos,
  );
  const t2 = tareaInsert(
    values.tarea_2,
    values.tarea_2_ejercicio_id,
    values.tarea_2_categoria,
    values.tarea_2_minutos,
  );
  const t3 = tareaInsert(
    values.tarea_3,
    values.tarea_3_ejercicio_id,
    values.tarea_3_categoria,
    values.tarea_3_minutos,
  );
  const t4 = tareaInsert(
    values.tarea_4,
    values.tarea_4_ejercicio_id,
    values.tarea_4_categoria,
    values.tarea_4_minutos,
  );
  return {
    fecha: values.fecha,
    hora_inicio: values.hora_inicio || null,
    hora_fin: values.hora_fin || null,
    lugar: values.lugar || null,
    objetivos: values.objetivos || null,
    tarea_1: t1.texto,
    tarea_2: t2.texto,
    tarea_3: t3.texto,
    tarea_4: t4.texto,
    tarea_1_ejercicio_id: t1.ejercicioId,
    tarea_2_ejercicio_id: t2.ejercicioId,
    tarea_3_ejercicio_id: t3.ejercicioId,
    tarea_4_ejercicio_id: t4.ejercicioId,
    tarea_1_categoria: t1.categoria,
    tarea_2_categoria: t2.categoria,
    tarea_3_categoria: t3.categoria,
    tarea_4_categoria: t4.categoria,
    tarea_1_minutos: t1.minutos,
    tarea_2_minutos: t2.minutos,
    tarea_3_minutos: t3.minutos,
    tarea_4_minutos: t4.minutos,
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
    tarea_1: String(formData.get("tarea_1") ?? ""),
    tarea_2: String(formData.get("tarea_2") ?? ""),
    tarea_3: String(formData.get("tarea_3") ?? ""),
    tarea_4: String(formData.get("tarea_4") ?? ""),
    tarea_1_ejercicio_id: String(formData.get("tarea_1_ejercicio_id") ?? ""),
    tarea_2_ejercicio_id: String(formData.get("tarea_2_ejercicio_id") ?? ""),
    tarea_3_ejercicio_id: String(formData.get("tarea_3_ejercicio_id") ?? ""),
    tarea_4_ejercicio_id: String(formData.get("tarea_4_ejercicio_id") ?? ""),
    tarea_1_categoria: String(formData.get("tarea_1_categoria") ?? ""),
    tarea_2_categoria: String(formData.get("tarea_2_categoria") ?? ""),
    tarea_3_categoria: String(formData.get("tarea_3_categoria") ?? ""),
    tarea_4_categoria: String(formData.get("tarea_4_categoria") ?? ""),
    tarea_1_minutos: String(formData.get("tarea_1_minutos") ?? ""),
    tarea_2_minutos: String(formData.get("tarea_2_minutos") ?? ""),
    tarea_3_minutos: String(formData.get("tarea_3_minutos") ?? ""),
    tarea_4_minutos: String(formData.get("tarea_4_minutos") ?? ""),
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
    fecha_inicio: fechaRazonable("Introduce la fecha de inicio"),
    fecha_fin: fechaRazonable("Introduce la fecha de fin"),
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
