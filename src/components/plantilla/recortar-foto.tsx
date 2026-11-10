"use client";

// Recorte de la foto de un jugador antes de subirla: se arrastra la foto y se ajusta el zoom
// hasta que la cara quede dentro del círculo; se sube un cuadrado ya recortado (así la cara se ve
// igual en todas las pantallas, sin depender de cómo se centre la foto original).

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const MARCO = 280; // px del recuadro de recorte en pantalla
const SALIDA = 640; // px del cuadrado que se sube

export function RecortarFoto({
  archivo,
  onCancelar,
  onConfirmar,
}: {
  archivo: File;
  onCancelar: () => void;
  onConfirmar: (recortada: File) => void;
}) {
  const [imagen, setImagen] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  // Posición de la esquina superior izquierda de la foto respecto al recuadro.
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const arrastre = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      setImagen(img);
      // Empieza centrada en horizontal y pegada arriba: ahí suele estar la cara.
      const escala = MARCO / Math.min(img.naturalWidth, img.naturalHeight);
      setPos({ x: (MARCO - img.naturalWidth * escala) / 2, y: 0 });
    };
    img.src = u;
    return () => URL.revokeObjectURL(u);
  }, [archivo]);

  const escalaBase = imagen ? MARCO / Math.min(imagen.naturalWidth, imagen.naturalHeight) : 1;
  const escala = escalaBase * zoom;
  const ancho = imagen ? imagen.naturalWidth * escala : 0;
  const alto = imagen ? imagen.naturalHeight * escala : 0;

  // La foto siempre cubre el recuadro entero.
  const limitar = (x: number, y: number) => ({
    x: Math.min(0, Math.max(MARCO - ancho, x)),
    y: Math.min(0, Math.max(MARCO - alto, y)),
  });

  function cambiarZoom(nuevo: number) {
    if (!imagen) return;
    // El zoom se hace sobre un punto centrado y algo por encima del medio, que es donde suele
    // estar la cara, para que al acercar no se salga del círculo.
    const ay = MARCO * 0.35;
    const nuevaEscala = escalaBase * nuevo;
    const cx = (MARCO / 2 - pos.x) / escala;
    const cy = (ay - pos.y) / escala;
    const w = imagen.naturalWidth * nuevaEscala;
    const h = imagen.naturalHeight * nuevaEscala;
    setZoom(nuevo);
    setPos({
      x: Math.min(0, Math.max(MARCO - w, MARCO / 2 - cx * nuevaEscala)),
      y: Math.min(0, Math.max(MARCO - h, ay - cy * nuevaEscala)),
    });
  }

  function confirmar() {
    if (!imagen) return;
    const canvas = document.createElement("canvas");
    canvas.width = SALIDA;
    canvas.height = SALIDA;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, SALIDA, SALIDA);
    ctx.drawImage(imagen, -pos.x / escala, -pos.y / escala, MARCO / escala, MARCO / escala, 0, 0, SALIDA, SALIDA);
    canvas.toBlob(
      (blob) => {
        if (blob) onConfirmar(new File([blob], "foto.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Recortar foto"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="w-full max-w-sm space-y-4 rounded-lg bg-background p-4">
        <div>
          <h2 className="text-lg font-semibold">Recortar foto</h2>
          <p className="text-sm text-muted-foreground">
            Arrastra la foto y ajusta el zoom hasta que la cara quede dentro del círculo.
          </p>
        </div>

        <div
          className="relative mx-auto touch-none overflow-hidden bg-muted"
          style={{ width: MARCO, height: MARCO }}
          onPointerDown={(e) => {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            arrastre.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y };
          }}
          onPointerMove={(e) => {
            const a = arrastre.current;
            if (!a) return;
            setPos(limitar(a.x + e.clientX - a.px, a.y + e.clientY - a.py));
          }}
          onPointerUp={() => (arrastre.current = null)}
          onPointerCancel={() => (arrastre.current = null)}
        >
          {imagen && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imagen.src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute left-0 top-0 max-w-none select-none"
              style={{ width: ancho, height: alto, transform: `translate(${pos.x}px, ${pos.y}px)` }}
            />
          )}
          {/* Círculo guía: lo de fuera se oscurece */}
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{ boxShadow: "0 0 0 400px rgba(0,0,0,0.55)", border: "2px solid #fff" }}
          />
        </div>

        <label className="flex items-center gap-3 text-sm">
          <span className="shrink-0 text-muted-foreground">Zoom</span>
          <input
            type="range"
            min={1}
            max={4}
            step={0.02}
            value={zoom}
            onChange={(e) => cambiarZoom(Number(e.target.value))}
            className="w-full"
            aria-label="Zoom"
          />
        </label>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button type="button" onClick={confirmar} disabled={!imagen}>
            Usar foto
          </Button>
        </div>
      </div>
    </div>
  );
}
