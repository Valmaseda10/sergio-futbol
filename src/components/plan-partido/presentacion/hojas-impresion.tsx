"use client";

// Las diapositivas como páginas para imprimir (o guardar en PDF desde el diálogo de imprimir):
// cada una a una página del tamaño de una diapositiva 16:9. Solo se ve al imprimir.

import {
  Diapositiva1080,
  type ContextoPresentacion,
} from "@/components/plan-partido/presentacion/diapositiva-vista";
import type { Diapositiva } from "@/lib/presentacion-partido";

const ANCHO_MM = 297;
const ALTO_MM = 167;
// 297 mm = 1122,5 px a 96 ppp; la diapositiva mide 1920 px de ancho.
const ESCALA = ((ANCHO_MM / 25.4) * 96) / 1920;

export function HojasImpresion({
  diapositivas,
  ctx,
}: {
  diapositivas: Diapositiva[];
  ctx: ContextoPresentacion;
}) {
  return (
    <div className="hidden print:block">
      <style>{`@media print { @page { size: ${ANCHO_MM}mm ${ALTO_MM}mm; margin: 0; } }`}</style>
      {diapositivas.map((d, i) => (
        <div
          key={d.id}
          style={{
            width: `${ANCHO_MM}mm`,
            height: `${ALTO_MM}mm`,
            overflow: "hidden",
            position: "relative",
            breakAfter: i < diapositivas.length - 1 ? "page" : "auto",
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}
        >
          <div style={{ transform: `scale(${ESCALA})`, transformOrigin: "top left", width: 1920, height: 1080 }}>
            <Diapositiva1080 d={d} ctx={ctx} />
          </div>
        </div>
      ))}
    </div>
  );
}
