// Lista cerrada de posiciones para poder agrupar la plantilla por demarcación
// (porteros/defensas/mediocentros/extremos/delanteros) de forma fiable.
export type Demarcacion =
  | "portero"
  | "defensa"
  | "mediocentro"
  | "extremo"
  | "delantero";

export interface PosicionOption {
  value: string;
  label: string;
  demarcacion: Demarcacion;
}

export const POSICIONES: PosicionOption[] = [
  { value: "portero", label: "Portero", demarcacion: "portero" },
  { value: "central", label: "Central", demarcacion: "defensa" },
  { value: "lateral derecho", label: "Lateral derecho", demarcacion: "defensa" },
  { value: "lateral izquierdo", label: "Lateral izquierdo", demarcacion: "defensa" },
  {
    value: "mediocentro defensivo",
    label: "Mediocentro defensivo",
    demarcacion: "mediocentro",
  },
  { value: "mediocentro", label: "Mediocentro", demarcacion: "mediocentro" },
  { value: "mediapunta", label: "Mediapunta", demarcacion: "mediocentro" },
  {
    value: "extremo derecho",
    label: "Extremo derecho",
    demarcacion: "extremo",
  },
  {
    value: "extremo izquierdo",
    label: "Extremo izquierdo",
    demarcacion: "extremo",
  },
  {
    value: "delantero centro",
    label: "Delantero centro",
    demarcacion: "delantero",
  },
];

export const DEMARCACION_ORDEN: Demarcacion[] = [
  "portero",
  "defensa",
  "mediocentro",
  "extremo",
  "delantero",
];

export const DEMARCACION_LABEL: Record<Demarcacion, string> = {
  portero: "Porteros",
  defensa: "Defensas",
  mediocentro: "Mediocentros",
  extremo: "Extremos",
  delantero: "Delanteros",
};

export function demarcacionDePosicion(
  posicion: string | null,
): Demarcacion | null {
  if (!posicion) return null;
  return POSICIONES.find((p) => p.value === posicion)?.demarcacion ?? null;
}

export function posicionLabel(posicion: string | null): string {
  if (!posicion) return "Sin posición";
  return POSICIONES.find((p) => p.value === posicion)?.label ?? posicion;
}
