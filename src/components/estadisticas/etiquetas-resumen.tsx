"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { exportarEtiquetasExcel, type RegistroEtiquetaExport } from "@/lib/etiquetas-export";
import { Button } from "@/components/ui/button";

export function EtiquetasResumen({
  registros,
  temporada,
}: {
  registros: RegistroEtiquetaExport[];
  temporada: string;
}) {
  const [exportando, setExportando] = useState(false);

  const porEtiqueta = useMemo(() => {
    const conteo = new Map<string, number>();
    for (const r of registros) {
      conteo.set(r.etiqueta, (conteo.get(r.etiqueta) ?? 0) + 1);
    }
    return Array.from(conteo.entries())
      .map(([etiqueta, veces]) => ({ etiqueta, veces }))
      .sort((a, b) => b.veces - a.veces);
  }, [registros]);

  async function handleExportar() {
    setExportando(true);
    try {
      await exportarEtiquetasExcel(
        registros,
        `etiquetas-${temporada}.xlsx`,
      );
    } catch {
      toast.error("No se ha podido exportar el Excel");
    }
    setExportando(false);
  }

  if (registros.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Todavía no hay etiquetas registradas en ningún partido de esta
        temporada.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y rounded-md border">
        {porEtiqueta.map(({ etiqueta, veces }) => (
          <li
            key={etiqueta}
            className="flex items-center justify-between p-3 text-sm"
          >
            <span className="font-medium">{etiqueta}</span>
            <span className="font-heading tabular-nums text-muted-foreground">
              {veces}
            </span>
          </li>
        ))}
      </ul>
      <Button
        variant="outline"
        className="w-full"
        disabled={exportando}
        onClick={handleExportar}
      >
        <Download className="size-4" />
        {exportando ? "Generando..." : "Exportar a Excel"}
      </Button>
    </div>
  );
}
