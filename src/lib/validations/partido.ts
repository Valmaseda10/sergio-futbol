import { z } from "zod";

export const partidoSchema = z.object({
  fecha: z.string().trim().min(1, "Introduce la fecha"),
  hora: z.string().trim(),
  competicion: z.enum(["liga", "amistoso", "copa"]),
  rival: z.string().trim().min(1, "Introduce el rival"),
  local_visitante: z.enum(["local", "visitante"]),
  lugar: z.string().trim(),
  resultado_favor: z.string().trim(),
  resultado_contra: z.string().trim(),
  notas: z.string().trim(),
});

export type PartidoFormValues = z.infer<typeof partidoSchema>;

export const PARTIDO_FORM_DEFAULTS: PartidoFormValues = {
  fecha: "",
  hora: "",
  competicion: "liga",
  rival: "",
  local_visitante: "local",
  lugar: "",
  resultado_favor: "",
  resultado_contra: "",
  notas: "",
};

export function toPartidoInsert(values: PartidoFormValues) {
  return {
    fecha: values.fecha,
    hora: values.hora || null,
    competicion: values.competicion,
    rival: values.rival,
    local_visitante: values.local_visitante,
    lugar: values.lugar || null,
    resultado_favor:
      values.resultado_favor !== "" ? Number(values.resultado_favor) : null,
    resultado_contra:
      values.resultado_contra !== "" ? Number(values.resultado_contra) : null,
    notas: values.notas || null,
  };
}

export function partidoFormDataToValues(formData: FormData): PartidoFormValues {
  return {
    fecha: String(formData.get("fecha") ?? ""),
    hora: String(formData.get("hora") ?? ""),
    competicion: String(
      formData.get("competicion") ?? "liga",
    ) as PartidoFormValues["competicion"],
    rival: String(formData.get("rival") ?? ""),
    local_visitante: String(
      formData.get("local_visitante") ?? "local",
    ) as PartidoFormValues["local_visitante"],
    lugar: String(formData.get("lugar") ?? ""),
    resultado_favor: String(formData.get("resultado_favor") ?? ""),
    resultado_contra: String(formData.get("resultado_contra") ?? ""),
    notas: String(formData.get("notas") ?? ""),
  };
}
