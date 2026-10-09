"use client";

// Botones Descargar PDF / Compartir / Imprimir para cualquier documento
// maquetado en hojas A4 marcadas con `data-hoja-pdf` (ver ficha-pdf.ts).

import { useEffect, useRef, useState, type RefObject } from "react";
import { Download, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generarPdfFicha } from "@/lib/ficha-pdf";

export function AccionesPdf({
  contenedorRef,
  nombreArchivo,
  deshabilitado = false,
  clave,
}: {
  contenedorRef: RefObject<HTMLElement | null>;
  /** Con la extensión, p. ej. "Hoja de partido J3 03-10-2026.pdf". */
  nombreArchivo: string;
  deshabilitado?: boolean;
  /** Cualquier valor que cambie cuando cambia el contenido: descarta el PDF ya generado. */
  clave?: unknown;
}) {
  const [generando, setGenerando] = useState(false);
  // El PDF ya generado se guarda: en iPad/iPhone compartir solo funciona justo
  // tras tocar el botón, y generar tarda unos segundos.
  const pdfRef = useRef<File | null>(null);
  useEffect(() => {
    pdfRef.current = null;
  }, [clave]);
  const puedeCompartir =
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [new File([], "a.pdf", { type: "application/pdf" })] });

  async function obtenerPdf(): Promise<File | null> {
    if (pdfRef.current) return pdfRef.current;
    const hojas = Array.from(
      contenedorRef.current?.querySelectorAll<HTMLElement>("[data-hoja-pdf]") ?? [],
    );
    if (hojas.length === 0) {
      toast.error("No hay nada que descargar todavía");
      return null;
    }
    setGenerando(true);
    try {
      pdfRef.current = await generarPdfFicha(hojas, nombreArchivo);
      return pdfRef.current;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se ha podido generar el PDF");
      return null;
    } finally {
      setGenerando(false);
    }
  }

  async function descargar() {
    pdfRef.current = null; // por si se ha editado desde la última vez
    const archivo = await obtenerPdf();
    if (!archivo) return;
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = archivo.name;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  async function compartir() {
    const archivo = await obtenerPdf();
    if (!archivo) return;
    try {
      await navigator.share({ files: [archivo], title: archivo.name });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      // Safari exige que compartir salga directamente de un toque; si el PDF
      // ha tardado en generarse hay que volver a tocar (ya está listo).
      toast.message("PDF listo: pulsa Compartir otra vez");
    }
  }

  return (
    <div className="flex flex-wrap justify-end gap-2 print:hidden">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={generando || deshabilitado}
        onClick={descargar}
      >
        <Download className="size-4" />
        {generando ? "Generando…" : "Descargar PDF"}
      </Button>
      {puedeCompartir && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={generando || deshabilitado}
          onClick={compartir}
        >
          <Share2 className="size-4" />
          Compartir
        </Button>
      )}
      <Button type="button" size="sm" variant="ghost" onClick={() => window.print()}>
        <Printer className="size-4" />
        Imprimir
      </Button>
    </div>
  );
}
