// Exportación a Excel de lo registrado con el apartado de Etiquetas: una
// hoja con cada toque tal cual se registró y otra con el resumen jugador ×
// etiqueta, listas para abrir directamente sin tener que retocar nada.

export interface RegistroEtiquetaExport {
  fecha: string;
  rival: string;
  etiqueta: string;
  jugador: string;
  minuto: number | null;
  nota: string | null;
}

const COLOR_CABECERA = "FF8A1B24";
const COLOR_TEXTO_CABECERA = "FFFBF7F5";

export async function exportarEtiquetasExcel(
  registros: RegistroEtiquetaExport[],
  nombreArchivo: string,
) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Infantil B";
  workbook.created = new Date();

  function estilarCabecera(fila: import("exceljs").Row) {
    fila.font = { bold: true, color: { argb: COLOR_TEXTO_CABECERA } };
    fila.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLOR_CABECERA },
    };
  }

  const hojaRegistros = workbook.addWorksheet("Registros");
  hojaRegistros.columns = [
    { header: "Fecha", key: "fecha", width: 12 },
    { header: "Rival", key: "rival", width: 22 },
    { header: "Etiqueta", key: "etiqueta", width: 22 },
    { header: "Jugador", key: "jugador", width: 26 },
    { header: "Minuto", key: "minuto", width: 10 },
    { header: "Nota", key: "nota", width: 40 },
  ];
  estilarCabecera(hojaRegistros.getRow(1));
  for (const r of registros
    .slice()
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.minuto ?? 0) - (b.minuto ?? 0))) {
    hojaRegistros.addRow({
      fecha: r.fecha,
      rival: r.rival,
      etiqueta: r.etiqueta,
      jugador: r.jugador,
      minuto: r.minuto ?? "",
      nota: r.nota ?? "",
    });
  }
  hojaRegistros.autoFilter = {
    from: "A1",
    to: { row: 1, column: hojaRegistros.columns.length },
  };

  const etiquetasUnicas = Array.from(
    new Set(registros.map((r) => r.etiqueta)),
  ).sort((a, b) => a.localeCompare(b));
  const jugadoresUnicos = Array.from(
    new Set(registros.map((r) => r.jugador)),
  ).sort((a, b) => a.localeCompare(b));

  const hojaResumen = workbook.addWorksheet("Resumen");
  hojaResumen.columns = [
    { header: "Jugador", key: "jugador", width: 26 },
    ...etiquetasUnicas.map((etiqueta) => ({
      header: etiqueta,
      key: etiqueta,
      width: 16,
    })),
    { header: "Total", key: "__total", width: 10 },
  ];
  estilarCabecera(hojaResumen.getRow(1));

  for (const jugador of jugadoresUnicos) {
    const fila: Record<string, string | number> = { jugador };
    let total = 0;
    for (const etiqueta of etiquetasUnicas) {
      const veces = registros.filter(
        (r) => r.jugador === jugador && r.etiqueta === etiqueta,
      ).length;
      fila[etiqueta] = veces;
      total += veces;
    }
    fila.__total = total;
    hojaResumen.addRow(fila);
  }
  const filaTotales = hojaResumen.getRow(hojaResumen.rowCount + 1);
  filaTotales.getCell(1).value = "Total";
  filaTotales.font = { bold: true };
  etiquetasUnicas.forEach((etiqueta, i) => {
    filaTotales.getCell(i + 2).value = registros.filter(
      (r) => r.etiqueta === etiqueta,
    ).length;
  });
  filaTotales.getCell(etiquetasUnicas.length + 2).value = registros.length;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
