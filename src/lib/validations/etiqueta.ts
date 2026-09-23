import { z } from "zod";

export const etiquetaSchema = z.object({
  nombre: z.string().trim().min(1, "Introduce un nombre"),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color no válido"),
  requiere_jugador: z.boolean(),
  requiere_zona: z.boolean(),
});

export type EtiquetaFormValues = z.infer<typeof etiquetaSchema>;

export function etiquetaFormDataToValues(formData: FormData): {
  nombre: string;
  color: string;
} {
  return {
    nombre: String(formData.get("nombre") ?? ""),
    color: String(formData.get("color") ?? "#e0141d"),
  };
}
