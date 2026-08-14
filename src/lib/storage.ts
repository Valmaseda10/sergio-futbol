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
    .upload(path, archivo, { upsert: true, contentType: archivo.type });

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

export function esPdf(path: string | null): boolean {
  return !!path && path.toLowerCase().endsWith(".pdf");
}
