import { createClient } from "@/lib/supabase/client";

// Bucket privado compartido para fotos/documentos de entrenamientos,
// partidos y scouting (los jugadores tienen su propio bucket "jugadores").
// Igual que la foto de jugador: subir un archivo requiere conexión, ya que
// Supabase Storage no se puede encolar de forma sencilla en el outbox.
export async function subirArchivoPrivado(
  path: string,
  archivo: File,
): Promise<string> {
  if (!navigator.onLine) {
    throw new Error(
      "Sin conexión: el resto de los datos se ha guardado, pero el archivo no se puede subir ahora. Añádelo cuando vuelvas a tener cobertura.",
    );
  }

  const supabase = createClient();
  const { error } = await supabase.storage
    .from("adjuntos")
    .upload(path, archivo, {
      upsert: true,
      contentType: contentTypeDeArchivo(archivo),
    });

  if (error) {
    throw new Error(`No se ha podido subir el archivo: ${error.message}`);
  }

  return path;
}

export function extensionDeArchivo(archivo: File): string {
  if (archivo.type === "application/pdf") return "pdf";
  const fromName = archivo.name.split(".").pop();
  return fromName && fromName.length <= 5 ? fromName.toLowerCase() : "jpg";
}

// El navegador no siempre rellena `archivo.type` de forma fiable —
// especialmente en iPad, cuando el archivo viene de Files/iCloud, un .pptx
// puede llegar con el tipo vacío o genérico. Si se sube así tal cual, el
// archivo se guarda en Supabase Storage con un content-type incorrecto y el
// iPad ya no sabe abrirlo como PDF/PowerPoint al pincharlo — lo trata como
// un enlace cualquiera. Se determina el tipo por la extensión del nombre en
// vez de confiar en `archivo.type`.
const CONTENT_TYPE_POR_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
};

function contentTypeDeArchivo(archivo: File): string {
  const extension = archivo.name.split(".").pop()?.toLowerCase();
  const porExtension = extension && CONTENT_TYPE_POR_EXTENSION[extension];
  return porExtension || archivo.type || "application/octet-stream";
}

export function esPdf(path: string | null): boolean {
  return !!path && path.toLowerCase().endsWith(".pdf");
}
