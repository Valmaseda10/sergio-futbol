// Grupos fijos de quién entrena cada día de la semana — para que la ficha
// de la sesión sepa solo, según la fecha, qué jugadores tocan ese día, sin
// tener que teclearlo cada vez. Índice = Date.getDay() (0 = domingo).
export const GRUPOS_ENTRENO_POR_DIA: Partial<Record<number, string[]>> = {
  2: ["Iker", "Gabriel", "Carlos", "Erik", "Diego", "Teo"], // martes
  4: ["Oliver", "Manu", "Leo", "Alex", "Gonzalo"], // jueves
  5: ["Bruno", "Pablo", "Nico", "Alejandro", "Barrera"], // viernes
};

export function grupoEntrenoDeFecha(fecha: string): string[] | null {
  const dia = new Date(`${fecha}T00:00:00`).getDay();
  return GRUPOS_ENTRENO_POR_DIA[dia] ?? null;
}
