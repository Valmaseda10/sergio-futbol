import { z } from "zod";
import type { PiernaDominante } from "@/lib/types/database.types";

// Todos los campos llegan como string desde el <form> (FormData / inputs
// nativos); la conversión a number/null para la base de datos se hace en
// toJugadorInsert, no aquí. Mantiene el esquema simple para usarlo tanto en
// el formulario (react-hook-form) como en el server action.
export const jugadorSchema = z
  .object({
    nombre: z.string().trim().min(2, "Introduce el nombre"),
    apellidos: z.string().trim().min(2, "Introduce los apellidos"),
    alias: z.string().trim(),
    dorsal: z.string().trim(),
    posicion: z.string().trim(),
    pierna_dominante: z.enum(["", "izquierda", "derecha", "ambidiestro"]),
    fecha_nacimiento: z.string().trim(),
    equipo_anterior: z.string().trim(),
    contacto_padre_nombre: z.string().trim(),
    contacto_padre_telefono: z.string().trim(),
    contacto_madre_nombre: z.string().trim(),
    contacto_madre_telefono: z.string().trim(),
    contacto_email: z.string().trim(),
    notas_medicas: z.string().trim(),
    fecha_alta: z.string().trim().min(1, "Introduce la fecha de alta"),
  })
  .superRefine((data, ctx) => {
    if (data.dorsal !== "") {
      const n = Number(data.dorsal);
      if (!Number.isInteger(n) || n <= 0 || n > 99) {
        ctx.addIssue({
          code: "custom",
          path: ["dorsal"],
          message: "El dorsal debe ser un número entre 1 y 99",
        });
      }
    }
    if (
      data.contacto_email !== "" &&
      !z.string().email().safeParse(data.contacto_email).success
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["contacto_email"],
        message: "Email no válido",
      });
    }
  });

export type JugadorFormValues = z.infer<typeof jugadorSchema>;

export const JUGADOR_FORM_DEFAULTS: JugadorFormValues = {
  nombre: "",
  apellidos: "",
  alias: "",
  dorsal: "",
  posicion: "",
  pierna_dominante: "",
  fecha_nacimiento: "",
  equipo_anterior: "",
  contacto_padre_nombre: "",
  contacto_padre_telefono: "",
  contacto_madre_nombre: "",
  contacto_madre_telefono: "",
  contacto_email: "",
  notas_medicas: "",
  fecha_alta: "",
};

export function toJugadorInsert(values: JugadorFormValues) {
  return {
    nombre: values.nombre,
    apellidos: values.apellidos,
    alias: values.alias || null,
    dorsal: values.dorsal !== "" ? Number(values.dorsal) : null,
    posicion: values.posicion || null,
    pierna_dominante:
      values.pierna_dominante !== ""
        ? (values.pierna_dominante as PiernaDominante)
        : null,
    fecha_nacimiento: values.fecha_nacimiento || null,
    equipo_anterior: values.equipo_anterior || null,
    contacto_padre_nombre: values.contacto_padre_nombre || null,
    contacto_padre_telefono: values.contacto_padre_telefono || null,
    contacto_madre_nombre: values.contacto_madre_nombre || null,
    contacto_madre_telefono: values.contacto_madre_telefono || null,
    contacto_email: values.contacto_email || null,
    notas_medicas: values.notas_medicas || null,
    fecha_alta: values.fecha_alta,
  };
}

export function jugadorFormDataToValues(formData: FormData): JugadorFormValues {
  return {
    nombre: String(formData.get("nombre") ?? ""),
    apellidos: String(formData.get("apellidos") ?? ""),
    alias: String(formData.get("alias") ?? ""),
    dorsal: String(formData.get("dorsal") ?? ""),
    posicion: String(formData.get("posicion") ?? ""),
    pierna_dominante: String(
      formData.get("pierna_dominante") ?? "",
    ) as JugadorFormValues["pierna_dominante"],
    fecha_nacimiento: String(formData.get("fecha_nacimiento") ?? ""),
    equipo_anterior: String(formData.get("equipo_anterior") ?? ""),
    contacto_padre_nombre: String(formData.get("contacto_padre_nombre") ?? ""),
    contacto_padre_telefono: String(formData.get("contacto_padre_telefono") ?? ""),
    contacto_madre_nombre: String(formData.get("contacto_madre_nombre") ?? ""),
    contacto_madre_telefono: String(formData.get("contacto_madre_telefono") ?? ""),
    contacto_email: String(formData.get("contacto_email") ?? ""),
    notas_medicas: String(formData.get("notas_medicas") ?? ""),
    fecha_alta: String(formData.get("fecha_alta") ?? ""),
  };
}
