import type { TipoAbp, TipoGol } from "@/lib/types/database.types";

export const TIPOS_GOL: { value: TipoGol; label: string }[] = [
  { value: "juego_asociativo", label: "Juego asociativo" },
  { value: "transicion_ofensiva", label: "Transición ofensiva" },
  { value: "juego_vertical", label: "Juego vertical" },
  { value: "centro_lateral", label: "Centro lateral" },
  { value: "error_propio", label: "Error jugador" },
  { value: "abp", label: "ABP" },
  { value: "situacion_1v1", label: "Situación 1vs1" },
];

export const TIPO_GOL_LABEL: Record<TipoGol, string> = Object.fromEntries(
  TIPOS_GOL.map((t) => [t.value, t.label]),
) as Record<TipoGol, string>;

export const TIPOS_ABP: { value: TipoAbp; label: string }[] = [
  { value: "corner", label: "Córner" },
  { value: "falta_lateral", label: "Falta lateral" },
  { value: "falta_directa", label: "Falta directa" },
  { value: "saque_banda", label: "Saque de banda" },
  { value: "penalti", label: "Penalti" },
];

export const TIPO_ABP_LABEL: Record<TipoAbp, string> = Object.fromEntries(
  TIPOS_ABP.map((t) => [t.value, t.label]),
) as Record<TipoAbp, string>;
