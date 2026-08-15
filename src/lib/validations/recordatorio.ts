import { z } from "zod";

export const recordatorioSchema = z.object({
  texto: z.string().trim().min(1, "Escribe un recordatorio"),
});

export type RecordatorioFormValues = z.infer<typeof recordatorioSchema>;
