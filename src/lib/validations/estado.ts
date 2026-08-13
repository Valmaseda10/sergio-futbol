import { z } from "zod";

export const estadoSchema = z.object({
  nombre: z.string().trim().min(1, "Introduce un nombre"),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color no válido"),
  tipo: z.enum(["entrenamiento", "general"]),
});

export type EstadoFormValues = z.infer<typeof estadoSchema>;

export function estadoFormDataToValues(formData: FormData): EstadoFormValues {
  return {
    nombre: String(formData.get("nombre") ?? ""),
    color: String(formData.get("color") ?? "#94a3b8"),
    tipo: String(formData.get("tipo") ?? "general") as EstadoFormValues["tipo"],
  };
}
