"use client";

// Barra de tiempo con dos tiradores (inicio/fin) para recortar un clip,
// al estilo del recorte de Clipchamp — pero solo recorte: el vídeo sigue
// viviendo en YouTube, no hay archivo que exportar ni editar de verdad.

import { useCallback, useRef, useState } from "react";
import { formatearDuracion } from "@/lib/youtube";
import { cn } from "@/lib/utils";

const HUECO_MINIMO = 1;

export function RecorteTimeline({
  duracion,
  inicio,
  fin,
  actual,
  onCambiarInicio,
  onCambiarFin,
  onBuscar,
}: {
  duracion: number;
  inicio: number;
  fin: number;
  actual: number;
  onCambiarInicio: (segundos: number) => void;
  onCambiarFin: (segundos: number) => void;
  onBuscar: (segundos: number) => void;
}) {
  const pistaRef = useRef<HTMLDivElement>(null);
  const [arrastrando, setArrastrando] = useState<"inicio" | "fin" | null>(null);

  const fraccionDe = useCallback(
    (segundos: number) => (duracion > 0 ? Math.min(1, Math.max(0, segundos / duracion)) : 0),
    [duracion],
  );

  const segundoDesdeClientX = useCallback(
    (clientX: number) => {
      const pista = pistaRef.current;
      if (!pista) return 0;
      const rect = pista.getBoundingClientRect();
      const fraccion = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return fraccion * duracion;
    },
    [duracion],
  );

  function iniciarArrastre(tirador: "inicio" | "fin") {
    return (e: React.PointerEvent) => {
      e.preventDefault();
      setArrastrando(tirador);

      function mover(ev: PointerEvent) {
        const t = segundoDesdeClientX(ev.clientX);
        if (tirador === "inicio") {
          onCambiarInicio(Math.min(t, fin - HUECO_MINIMO));
        } else {
          onCambiarFin(Math.max(t, inicio + HUECO_MINIMO));
        }
        onBuscar(t);
      }
      function soltar() {
        setArrastrando(null);
        window.removeEventListener("pointermove", mover);
        window.removeEventListener("pointerup", soltar);
      }
      window.addEventListener("pointermove", mover);
      window.addEventListener("pointerup", soltar);
    };
  }

  function clicEnPista(e: React.MouseEvent<HTMLDivElement>) {
    if (arrastrando) return;
    const t = segundoDesdeClientX(e.clientX);
    onBuscar(t);
  }

  return (
    <div className="space-y-1">
      <div
        ref={pistaRef}
        onClick={clicEnPista}
        className="relative h-10 w-full cursor-pointer rounded-md bg-muted"
      >
        <div
          className="absolute inset-y-0 rounded-md bg-primary/30"
          style={{
            left: `${fraccionDe(inicio) * 100}%`,
            right: `${100 - fraccionDe(fin) * 100}%`,
          }}
        />

        <div
          className="pointer-events-none absolute top-0 h-full w-0.5 bg-foreground/70"
          style={{ left: `${fraccionDe(actual) * 100}%` }}
        />

        {(["inicio", "fin"] as const).map((tirador) => (
          <div
            key={tirador}
            onPointerDown={iniciarArrastre(tirador)}
            role="slider"
            aria-label={tirador === "inicio" ? "Inicio del clip" : "Fin del clip"}
            aria-valuemin={0}
            aria-valuemax={duracion}
            aria-valuenow={tirador === "inicio" ? inicio : fin}
            className={cn(
              "absolute top-1/2 flex h-12 w-4 -translate-y-1/2 cursor-ew-resize touch-none items-center justify-center rounded-sm bg-primary shadow",
              arrastrando === tirador && "ring-2 ring-primary ring-offset-1",
            )}
            style={{
              left: `calc(${fraccionDe(tirador === "inicio" ? inicio : fin) * 100}% - 0.5rem)`,
            }}
          >
            <div className="h-5 w-0.5 rounded-full bg-primary-foreground/80" />
          </div>
        ))}
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0:00</span>
        <span>{formatearDuracion(duracion)}</span>
      </div>
    </div>
  );
}
