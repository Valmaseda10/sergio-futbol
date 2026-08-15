import { DIAS_SEMANA } from "@/lib/validations/entrenamiento";

export function capitalizarPrimera(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function diaSemanaDeFecha(fechaISO: string): string {
  const dow = new Date(`${fechaISO}T00:00:00`).getDay();
  return DIAS_SEMANA.find((d) => d.value === dow)?.label ?? "";
}
