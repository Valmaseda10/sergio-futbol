import { Crest } from "@/components/branding/crest";

// Marca de agua para los informes exportados a PDF: el escudo del club muy
// tenue, centrado en la página. Solo se pinta al imprimir (la vista en
// pantalla no la necesita) y va detrás del resto del contenido, así que se
// ve sobre todo en los huecos entre tarjetas.
export function PdfWatermark() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 hidden items-center justify-center opacity-[0.07] print:flex"
    >
      <Crest size={380} />
    </div>
  );
}
