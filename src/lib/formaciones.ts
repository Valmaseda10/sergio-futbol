// Formaciones de fútbol 11 con huecos fijos, en coordenadas porcentuales
// sobre un campo en vertical (ataque hacia arriba, portero abajo).
export interface HuecoFormacion {
  id: string;
  label: string;
  top: number;
  left: number;
}

export interface Formacion {
  value: string;
  label: string;
  huecos: HuecoFormacion[];
}

export const FORMACIONES: Formacion[] = [
  {
    value: "1-4-4-2",
    label: "1-4-4-2",
    huecos: [
      { id: "por", label: "Portero", top: 92, left: 50 },
      { id: "ld", label: "Lateral derecho", top: 72, left: 82 },
      { id: "dfc1", label: "Central", top: 78, left: 61 },
      { id: "dfc2", label: "Central", top: 78, left: 39 },
      { id: "li", label: "Lateral izquierdo", top: 72, left: 18 },
      { id: "ed", label: "Interior derecho", top: 48, left: 80 },
      { id: "mc1", label: "Centrocampista", top: 53, left: 58 },
      { id: "mc2", label: "Centrocampista", top: 53, left: 42 },
      { id: "ei", label: "Interior izquierdo", top: 48, left: 20 },
      { id: "del1", label: "Delantero", top: 20, left: 62 },
      { id: "del2", label: "Delantero", top: 20, left: 38 },
    ],
  },
  {
    value: "1-4-3-3",
    label: "1-4-3-3",
    huecos: [
      { id: "por", label: "Portero", top: 92, left: 50 },
      { id: "ld", label: "Lateral derecho", top: 72, left: 82 },
      { id: "dfc1", label: "Central", top: 78, left: 61 },
      { id: "dfc2", label: "Central", top: 78, left: 39 },
      { id: "li", label: "Lateral izquierdo", top: 72, left: 18 },
      { id: "mc1", label: "Centrocampista", top: 55, left: 70 },
      { id: "mc2", label: "Centrocampista", top: 58, left: 50 },
      { id: "mc3", label: "Centrocampista", top: 55, left: 30 },
      { id: "ed", label: "Extremo derecho", top: 22, left: 80 },
      { id: "delc", label: "Delantero centro", top: 16, left: 50 },
      { id: "ei", label: "Extremo izquierdo", top: 22, left: 20 },
    ],
  },
  {
    value: "1-4-2-3-1",
    label: "1-4-2-3-1",
    huecos: [
      { id: "por", label: "Portero", top: 92, left: 50 },
      { id: "ld", label: "Lateral derecho", top: 72, left: 82 },
      { id: "dfc1", label: "Central", top: 78, left: 61 },
      { id: "dfc2", label: "Central", top: 78, left: 39 },
      { id: "li", label: "Lateral izquierdo", top: 72, left: 18 },
      { id: "mcd", label: "Mediocentro", top: 58, left: 61 },
      { id: "mci", label: "Mediocentro", top: 58, left: 39 },
      { id: "ed", label: "Extremo derecho", top: 34, left: 78 },
      { id: "mp", label: "Mediapunta", top: 32, left: 50 },
      { id: "ei", label: "Extremo izquierdo", top: 34, left: 22 },
      { id: "delc", label: "Delantero centro", top: 14, left: 50 },
    ],
  },
  {
    value: "1-3-5-2",
    label: "1-3-5-2",
    huecos: [
      { id: "por", label: "Portero", top: 92, left: 50 },
      { id: "dfc1", label: "Central", top: 76, left: 70 },
      { id: "dfc2", label: "Central", top: 80, left: 50 },
      { id: "dfc3", label: "Central", top: 76, left: 30 },
      { id: "cd", label: "Carrilero derecho", top: 55, left: 88 },
      { id: "mc1", label: "Centrocampista", top: 58, left: 64 },
      { id: "mc2", label: "Centrocampista", top: 62, left: 50 },
      { id: "mc3", label: "Centrocampista", top: 58, left: 36 },
      { id: "ci", label: "Carrilero izquierdo", top: 55, left: 12 },
      { id: "del1", label: "Delantero", top: 20, left: 62 },
      { id: "del2", label: "Delantero", top: 20, left: 38 },
    ],
  },
];
