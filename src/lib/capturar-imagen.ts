// toPng/toCanvas de html-to-image pueden quedarse colgados sin avisar (ni
// resuelven ni rechazan) al cargar la imagen intermedia que generan por
// dentro para pintarla en el canvas — comprobado en Chrome real, no es cosa
// solo de un entorno de pruebas. toSvg en cambio sí funciona bien siempre;
// el problema está en cómo esas otras dos cargan esa imagen. Aquí se hace a
// mano ese último paso con la carga de imagen "de toda la vida" (onload),
// que si funciona.
import { toSvg } from "html-to-image";

export async function capturarComoPng(
  nodo: HTMLElement,
  pixelRatio = 2,
): Promise<string> {
  const svgUrl = await toSvg(nodo);
  const rect = nodo.getBoundingClientRect();

  const imagen = new Image();
  await new Promise<void>((resolve, reject) => {
    imagen.onload = () => resolve();
    imagen.onerror = () => reject(new Error("No se pudo cargar la imagen generada"));
    imagen.src = svgUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = rect.width * pixelRatio;
  canvas.height = rect.height * pixelRatio;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo preparar el lienzo");
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(pixelRatio, pixelRatio);
  ctx.drawImage(imagen, 0, 0, rect.width, rect.height);

  return canvas.toDataURL("image/png");
}

export function descargarDataUrl(dataUrl: string, nombreArchivo: string) {
  const enlace = document.createElement("a");
  enlace.download = nombreArchivo;
  enlace.href = dataUrl;
  enlace.click();
}
