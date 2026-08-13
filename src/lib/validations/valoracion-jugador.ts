import { z } from "zod";

export const valoracionJugadorSchema = z.object({
  fecha: z.string().trim().min(1, "Introduce la fecha"),
  tecnica: z.string().trim(),
  fisico: z.string().trim(),
  tactica: z.string().trim(),
  actitud: z.string().trim(),
  notas: z.string().trim(),
});

export type ValoracionJugadorFormValues = z.infer<
  typeof valoracionJugadorSchema
>;

function toNota(value: string) {
  return value !== "" ? Number(value) : null;
}

export function toValoracionJugadorInsert(
  jugadorId: string,
  values: ValoracionJugadorFormValues,
) {
  return {
    jugador_id: jugadorId,
    fecha: values.fecha,
    tecnica: toNota(values.tecnica),
    fisico: toNota(values.fisico),
    tactica: toNota(values.tactica),
    actitud: toNota(values.actitud),
    notas: values.notas || null,
  };
}

export function valoracionJugadorFormDataToValues(
  formData: FormData,
): ValoracionJugadorFormValues {
  return {
    fecha: String(formData.get("fecha") ?? ""),
    tecnica: String(formData.get("tecnica") ?? ""),
    fisico: String(formData.get("fisico") ?? ""),
    tactica: String(formData.get("tactica") ?? ""),
    actitud: String(formData.get("actitud") ?? ""),
    notas: String(formData.get("notas") ?? ""),
  };
}
