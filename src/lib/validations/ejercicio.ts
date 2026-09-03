import { z } from "zod";

export const ejercicioSchema = z.object({
  nombre: z.string().trim().min(1, "Introduce un nombre"),
  descripcion: z.string().trim(),
});

export type EjercicioFormValues = z.infer<typeof ejercicioSchema>;

export function ejercicioFormDataToValues(
  formData: FormData,
): EjercicioFormValues {
  return {
    nombre: String(formData.get("nombre") ?? ""),
    descripcion: String(formData.get("descripcion") ?? ""),
  };
}
