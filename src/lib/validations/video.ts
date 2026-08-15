import { z } from "zod";
import type { TipoVideo } from "@/lib/types/database.types";

export const videoSchema = z.object({
  titulo: z.string().trim().min(1, "Introduce un título"),
  url: z
    .string()
    .trim()
    .min(1, "Introduce un enlace")
    .refine((v) => {
      try {
        new URL(v);
        return true;
      } catch {
        return false;
      }
    }, "El enlace no es válido"),
  tipo: z.enum(["partido", "clip"]),
  partido_id: z.string().trim(),
  evento_id: z.string().trim(),
  segundo_inicio: z.string().trim(),
  segundo_fin: z.string().trim(),
  fecha: z.string().trim().min(1, "Introduce la fecha"),
  notas: z.string().trim(),
});

export type VideoFormValues = z.infer<typeof videoSchema>;

export function videoFormDataToValues(formData: FormData): VideoFormValues {
  return {
    titulo: String(formData.get("titulo") ?? ""),
    url: String(formData.get("url") ?? ""),
    tipo: String(formData.get("tipo") ?? "clip") as TipoVideo,
    partido_id: String(formData.get("partido_id") ?? ""),
    evento_id: String(formData.get("evento_id") ?? ""),
    segundo_inicio: String(formData.get("segundo_inicio") ?? ""),
    segundo_fin: String(formData.get("segundo_fin") ?? ""),
    fecha: String(formData.get("fecha") ?? ""),
    notas: String(formData.get("notas") ?? ""),
  };
}

export function toVideoInsert(values: VideoFormValues) {
  return {
    titulo: values.titulo,
    url: values.url,
    tipo: values.tipo,
    partido_id: values.partido_id || null,
    evento_id: values.evento_id || null,
    segundo_inicio: values.segundo_inicio ? Number(values.segundo_inicio) : null,
    segundo_fin: values.segundo_fin ? Number(values.segundo_fin) : null,
    fecha: values.fecha,
    notas: values.notas || null,
  };
}
