// PDF de la ficha de sesión sin pasar por el diálogo de imprimir: cada hoja
// se pinta como imagen y se mete en una página A4 de un PDF, para poder
// guardarlo en Archivos, subirlo a una carpeta o mandarlo por WhatsApp.
//
// La ficha se maqueta para imprimir con variantes `print:` de Tailwind, que
// en pantalla no se aplican. Para que el PDF salga igual que el papel, las
// hojas se copian a un iframe invisible cuyas hojas de estilo son las de la
// app con `@media print` convertido en `@media all`.

import { capturarComoPng } from "@/lib/capturar-imagen";

const ANCHO_HOJA_MM = 198; // A4 (210) menos márgenes de 6 mm, como en @page
const MARGEN_MM = 6;

// Las rutas de las fuentes e imágenes de una hoja de estilo son relativas a
// ella (p. ej. ../media/x.woff2); al pasar el CSS a otro documento hay que
// convertirlas en absolutas.
function absolutizarUrls(css: string, base: string | null): string {
  if (!base) return css;
  return css.replace(
    /url\(\s*(["']?)(?!data:|https?:|\/\/|#)([^"')]+)\1\s*\)/g,
    (_, comilla: string, ruta: string) =>
      `url(${comilla}${new URL(ruta, base).href}${comilla})`,
  );
}

function estilosDeLaApp(): string {
  const partes: string[] = [];
  for (const hoja of Array.from(document.styleSheets)) {
    try {
      partes.push(
        Array.from(hoja.cssRules)
          .map((r) => absolutizarUrls(r.cssText, hoja.href))
          .join("\n"),
      );
    } catch {
      // hoja de otro origen: no se puede leer, y la app no depende de ninguna
    }
  }
  return partes.join("\n").replace(/@media print/g, "@media all");
}

// La imagen que se pinta dentro del SVG no puede usar las fuentes de la
// página, así que se le pasan incrustadas (en base64): las de la fuente del
// cuerpo, que son las que usa la ficha. Se calcula una vez.
let fuentesIncrustadas: Promise<string> | null = null;

function aDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result));
    lector.onerror = () => reject(lector.error);
    lector.readAsDataURL(blob);
  });
}

function cssFuentes(): Promise<string> {
  if (fuentesIncrustadas) return fuentesIncrustadas;
  fuentesIncrustadas = (async () => {
    const reglas: string[] = [];
    for (const hoja of Array.from(document.styleSheets)) {
      try {
        for (const regla of Array.from(hoja.cssRules)) {
          if (
            regla instanceof CSSFontFaceRule &&
            /Public Sans/.test(regla.cssText) &&
            !/Fallback/.test(regla.cssText)
          ) {
            let css = absolutizarUrls(regla.cssText, hoja.href);
            for (const [, url] of Array.from(css.matchAll(/url\("?([^")]+)"?\)/g))) {
              const respuesta = await fetch(url);
              const dataUrl = await aDataUrl(await respuesta.blob());
              css = css.replace(url, dataUrl);
            }
            reglas.push(css);
          }
        }
      } catch {
        // hoja ilegible o fuente que no se puede descargar: se sigue sin ella
      }
    }
    return reglas.join("\n");
  })();
  return fuentesIncrustadas;
}

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

export async function generarPdfFicha(
  hojas: HTMLElement[],
  nombreArchivo: string,
): Promise<File> {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = `position:fixed;left:-10000px;top:0;border:0;width:${ANCHO_HOJA_MM}mm;height:420mm;visibility:hidden`;
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    if (!doc) throw new Error("No se pudo preparar el PDF");
    doc.open();
    doc.write(
      `<!doctype html><html class="${document.documentElement.className}"><head><meta charset="utf-8"><style>${estilosDeLaApp()}</style></head><body class="${document.body.className}" style="margin:0;background:#fff"></body></html>`,
    );
    doc.close();
    await doc.fonts.ready;

    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    for (let i = 0; i < hojas.length; i++) {
      const contenedor = doc.createElement("div");
      contenedor.style.cssText = `width:${ANCHO_HOJA_MM}mm;background:#fff;position:relative;color:#171717;-webkit-print-color-adjust:exact;print-color-adjust:exact`;
      const copia = hojas[i].cloneNode(true) as HTMLElement;
      contenedor.appendChild(copia);

      // Marca de agua del escudo, igual que al imprimir.
      const marca = doc.createElement("div");
      marca.style.cssText =
        "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0.07;pointer-events:none";
      const escudo = doc.createElement("img");
      escudo.src = "/escudo-cultural.png";
      escudo.style.cssText = "width:340px;height:auto";
      marca.appendChild(escudo);
      contenedor.appendChild(marca);

      doc.body.replaceChildren(contenedor);
      await esperarImagenes(contenedor);
      await doc.fonts.ready;

      const imagen = await capturarComoPng(contenedor, 2, "jpeg", {
        fontEmbedCSS: await cssFuentes(),
      });
      const rect = contenedor.getBoundingClientRect();
      const alto = (ANCHO_HOJA_MM * rect.height) / rect.width;

      if (i > 0) pdf.addPage();
      pdf.addImage(imagen, "JPEG", MARGEN_MM, MARGEN_MM, ANCHO_HOJA_MM, alto);
    }

    const blob = pdf.output("blob");
    return new File([blob], nombreArchivo, { type: "application/pdf" });
  } finally {
    iframe.remove();
  }
}
