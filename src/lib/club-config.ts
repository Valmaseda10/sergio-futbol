// Todo lo que identifica a un club/equipo concreto, en un solo sitio.
//
// La app está pensada para desplegarse una vez por club (cada uno con su
// propio proyecto de Vercel + Supabase): para adaptarla a un club nuevo no
// hace falta tocar código, solo rellenar estas variables de entorno en ese
// despliegue. Sin ninguna configurada, se usan los valores del Infantil B
// de la Cultural y Deportiva Leonesa (el club para el que se hizo la app).
//
// Variables de entorno (todas NEXT_PUBLIC_, van al bundle del cliente):
//   NEXT_PUBLIC_CLUB_NOMBRE        — nombre del club, p. ej. "Cultural y Deportiva Leonesa"
//   NEXT_PUBLIC_EQUIPO_NOMBRE      — nombre del equipo, p. ej. "Infantil B"
//   NEXT_PUBLIC_ESCUDO_INICIALES   — 1-3 letras para el escudo genérico, p. ej. "IB"
//   NEXT_PUBLIC_COLOR_PRIMARIO     — color principal en hex, p. ej. "#e0141d"
//   NEXT_PUBLIC_COLOR_SECUNDARIO   — color secundario/dorado en hex, p. ej. "#c9971f"
//   NEXT_PUBLIC_LUGAR_ENTRENO_DEFECTO — lugar que aparece precargado al crear un entrenamiento

function envONull(valor: string | undefined): string | null {
  return valor && valor.trim() !== "" ? valor.trim() : null;
}

export const clubConfig = {
  nombreClub:
    envONull(process.env.NEXT_PUBLIC_CLUB_NOMBRE) ??
    "Cultural y Deportiva Leonesa",
  nombreEquipo: envONull(process.env.NEXT_PUBLIC_EQUIPO_NOMBRE) ?? "Infantil B",
  escudoIniciales:
    envONull(process.env.NEXT_PUBLIC_ESCUDO_INICIALES) ?? "IB",
  colorPrimario:
    envONull(process.env.NEXT_PUBLIC_COLOR_PRIMARIO) ?? "#e0141d",
  colorSecundario:
    envONull(process.env.NEXT_PUBLIC_COLOR_SECUNDARIO) ?? "#c9971f",
  lugarEntrenoDefecto:
    envONull(process.env.NEXT_PUBLIC_LUGAR_ENTRENO_DEFECTO) ??
    "Área Deportiva de Puente Castro",
};

/** "Infantil B 26/27" — nombre corto del equipo con la temporada. */
export function nombreEquipoConTemporada(temporadaCorta: string) {
  return `${clubConfig.nombreEquipo} ${temporadaCorta}`;
}
