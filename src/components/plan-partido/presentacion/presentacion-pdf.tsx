// PDF de la presentación sin pasar por el diálogo de imprimir: cada diapositiva se pinta a su
// tamaño (1920 x 1080) y se mete como una página 16:9 de un PDF, para guardarlo, mandarlo por
// WhatsApp o proyectarlo desde cualquier sitio.

import { createRoot } from "react-dom/client";
import { capturarComoPng } from "@/lib/capturar-imagen";
import type { Diapositiva } from "@/lib/presentacion-partido";
import {
  ALTO,
  ANCHO,
  Diapositiva1080,
  type ContextoPresentacion,
} from "@/components/plan-partido/presentacion/diapositiva-vista";

async function esperarImagenes(raiz: HTMLElement) {
  await Promise.all(
    Array.from(raiz.querySelectorAll("img")).map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }),
    ),
  );
}

export async function descargarPresentacionPdf(
  diapositivas: Diapositiva[],
  ctx: ContextoPresentacion,
  nombreArchivo: string,
): Promise<void> {
  const contenedor = document.createElement("div");
  contenedor.setAttribute("aria-hidden", "true");
  contenedor.style.cssText = `position:fixed;left:-${ANCHO + 200}px;top:0;width:${ANCHO}px;pointer-events:none`;
  document.body.appendChild(contenedor);
  const raiz = createRoot(contenedor);

  try {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [297, 167] });

    for (let i = 0; i < diapositivas.length; i++) {
      raiz.render(<Diapositiva1080 d={diapositivas[i]} ctx={ctx} />);
      // Deja que React pinte y que carguen las imágenes y las fuentes.
      await new Promise((r) => setTimeout(r, 60));
      const nodo = contenedor.firstElementChild as HTMLElement | null;
      if (!nodo) throw new Error("No se pudo preparar la diapositiva");
      await esperarImagenes(nodo);
      await document.fonts.ready;
      const imagen = await capturarComoPng(nodo, 1, "jpeg");
      if (i > 0) pdf.addPage([297, 167], "landscape");
      pdf.addImage(imagen, "JPEG", 0, 0, 297, (297 * ALTO) / ANCHO);
    }

    const blob = pdf.output("blob");
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombreArchivo;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  } finally {
    raiz.unmount();
    contenedor.remove();
  }
}
