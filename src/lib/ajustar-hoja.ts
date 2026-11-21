// Ajusta una hoja A4 (la de partido) a lo que haya escrito en ella para que entre entera en una
// página: se rehace la altura de cada caja de texto al ancho real del papel, las cajas vacías
// del análisis se encogen y, si aún no cabe, se baja el tamaño de letra del análisis poco a
// poco. Solo si ni así cabe devuelve un factor de reducción para toda la hoja.
//
// Las cajas del análisis se marcan con `data-ajuste` y las que rellenan el hueco que queda al
// lado del campo con `data-llenar`.

const PX_POR_MM = 96 / 25.4;

export interface AjusteHoja {
  /** Reducción a aplicar a toda la hoja (1 = ninguna). */
  zoom: number;
  /** Deja las cajas como estaban antes del ajuste. */
  restaurar: () => void;
}

/** `el` debe estar ya al ancho de impresión (198 mm). */
export function ajustarHojaParaPagina(el: HTMLElement, altoMaxMm = 283): AjusteHoja {
  const areas = Array.from(el.querySelectorAll<HTMLTextAreaElement>("textarea[data-ajuste]"));
  const llenar = Array.from(el.querySelectorAll<HTMLTextAreaElement>("textarea[data-llenar]"));
  const guardado = [...areas, ...llenar].map((t) => ({
    t,
    h: t.style.height,
    f: t.style.fontSize,
    m: t.style.minHeight,
  }));
  const restaurar = () =>
    guardado.forEach(({ t, h, f, m }) => {
      t.style.height = h;
      t.style.fontSize = f;
      t.style.minHeight = m;
    });
  if (areas.length === 0) return { zoom: 1, restaurar };

  const alto = () => el.getBoundingClientRect().height / PX_POR_MM;
  const cabe = () => alto() <= altoMaxMm + 0.5;
  const remedir = () => {
    for (const t of [...areas, ...llenar]) t.style.height = "auto";
    for (const t of areas) t.style.height = `${t.scrollHeight}px`;
    for (const t of llenar) {
      const hueco = t.parentElement ? t.parentElement.clientHeight : 0;
      t.style.height = `${Math.max(t.scrollHeight, hueco)}px`;
    }
  };

  remedir();
  if (cabe()) return { zoom: 1, restaurar };

  // 1) Las cajas vacías o con poco texto no necesitan el alto mínimo.
  for (const t of areas) t.style.minHeight = "2.2rem";
  remedir();
  // 2) Letra más pequeña en el análisis, hasta que quepa.
  for (const px of [11.5, 11, 10.5, 10, 9.5, 9, 8.5, 8]) {
    if (cabe()) break;
    for (const t of areas) t.style.fontSize = `${px}px`;
    remedir();
  }
  const a = alto();
  return { zoom: a > altoMaxMm + 0.5 ? altoMaxMm / a : 1, restaurar };
}
