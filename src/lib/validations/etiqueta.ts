import { z } from "zod";

export const etiquetaSchema = z.object({
  nombre: z.string().trim().min(1, "Introduce un nombre"),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color no válido"),
});

export type EtiquetaFormValues = z.infer<typeof etiquetaSchema>;

export function etiquetaFormDataToValues(formData: FormData): EtiquetaFormValues {
  return {
    nombre: String(formData.get("nombre") ?? ""),
    color: String(formData.get("color") ?? "#8a1b24"),
  };
}
