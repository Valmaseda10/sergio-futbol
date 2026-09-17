// Quién recoge y lleva el material de entrenamiento cada día de la semana
// (todos los jugadores entrenan siempre; esto es solo el turno de material,
// por grupos fijos) — para que la ficha de la sesión sepa sola, según la
// fecha, a quién le toca ese día, sin tener que teclearlo cada vez. Índice =
// Date.getDay() (0 = domingo).
export const GRUPOS_MATERIAL_POR_DIA: Partial<Record<number, string[]>> = {
  2: ["Iker", "Gabriel", "Carlos", "Erik", "Diego", "Teo"], // martes
  4: ["Oliver", "Manu", "Leo", "Alex", "Gonzalo"], // jueves
  5: ["Bruno", "Pablo", "Nico", "Alejandro", "Barrera"], // viernes
};

export function grupoMaterialDeFecha(fecha: string): string[] | null {
  const dia = new Date(`${fecha}T00:00:00`).getDay();
  return GRUPOS_MATERIAL_POR_DIA[dia] ?? null;
}
