import { z } from "zod";

export const notaSchema = z.object({
  texto: z.string().trim().min(1, "Escribe una nota"),
});

export type NotaFormValues = z.infer<typeof notaSchema>;
