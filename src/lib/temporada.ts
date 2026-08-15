// Una temporada de fútbol base va de agosto a junio/julio. Se deriva de la
// fecha real (nunca se guarda un año fijo en ningún sitio), tal y como pide
// CLAUDE.md, para que la app siga sirviendo en temporadas futuras sin tocar
// código.
const MES_INICIO_TEMPORADA = 8; // agosto

export function temporadaDeFecha(fechaISO: string): string {
  const [anioStr, mesStr] = fechaISO.split("-");
  const anio = Number(anioStr);
  const mes = Number(mesStr);
  const inicio = mes >= MES_INICIO_TEMPORADA ? anio : anio - 1;
  return `${inicio}-${inicio + 1}`;
}

export function rangoTemporada(temporada: string): { desde: string; hasta: string } {
  const [inicio] = temporada.split("-").map(Number);
  return {
    desde: `${inicio}-08-01`,
    hasta: `${inicio + 1}-07-31`,
  };
}

export function temporadaActual(hoyISO: string): string {
  return temporadaDeFecha(hoyISO);
}

export function temporadasDisponibles(fechas: string[]): string[] {
  const set = new Set(fechas.filter(Boolean).map(temporadaDeFecha));
  return Array.from(set).sort((a, b) => b.localeCompare(a));
}

export function enTemporada(fechaISO: string, temporada: string): boolean {
  const { desde, hasta } = rangoTemporada(temporada);
  return fechaISO >= desde && fechaISO <= hasta;
}

// "2026-2027" -> "26/27", para mostrar la temporada en la marca de la app.
export function temporadaCorta(temporada: string): string {
  const partes = temporada.split("-");
  if (partes.length !== 2 || !/^\d{4}$/.test(partes[0]) || !/^\d{4}$/.test(partes[1])) {
    return temporada;
  }
  return `${partes[0].slice(2)}/${partes[1].slice(2)}`;
}
