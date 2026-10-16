"use client";

// La presentación a pantalla completa, para enseñarla en la sesión de vídeo: flechas o toque a
// los lados para pasar de diapositiva, Esc o la X para salir.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ChevronRight, Maximize, X } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { leerPresentacion } from "@/lib/presentacion-partido";
import { DiapositivaEscalada } from "@/components/plan-partido/presentacion/diapositiva-vista";
import { useContextoPresentacion } from "@/components/plan-partido/presentacion/use-contexto-presentacion";

export function Presentador({ partidoId }: { partidoId: string }) {
  const router = useRouter();
  const ctx = useContextoPresentacion(partidoId);
  const filas = useLiveQuery(
    () => localDb.presentaciones_partido.where("partido_id").equals(partidoId).toArray(),
    [partidoId],
  );
  const diapos = filas?.[0] ? leerPresentacion(filas[0].diapositivas) : null;
  const [indice, setIndice] = useState(0);
  const total = diapos?.length ?? 0;

  const salir = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    router.push(`/plan-partido/presentacion/${partidoId}`);
  }, [router, partidoId]);

  const ir = useCallback(
    (delta: number) => setIndice((i) => Math.min(Math.max(0, total - 1), Math.max(0, i + delta))),
    [total],
  );

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        ir(1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        ir(-1);
      } else if (e.key === "Escape") {
        salir();
      } else if (e.key === "Home") setIndice(0);
      else if (e.key === "End") setIndice(Math.max(0, total - 1));
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [ir, salir, total]);

  function pantallaCompleta() {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  }

  const actual = diapos?.[Math.min(indice, Math.max(0, total - 1))];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      {ctx && actual ? (
        <div style={{ width: "min(100vw, calc(100vh * 16 / 9))" }}>
          <DiapositivaEscalada d={actual} ctx={ctx} />
        </div>
      ) : (
        <p className="text-sm text-white/70">
          {ctx === null || filas?.length === 0 ? "No hay presentación de este partido." : "Cargando..."}
        </p>
      )}

      {/* Zonas táctiles: izquierda atrás, derecha adelante. */}
      <button
        type="button"
        aria-label="Diapositiva anterior"
        onClick={() => ir(-1)}
        className="absolute inset-y-0 left-0 w-1/4 cursor-w-resize opacity-0"
      />
      <button
        type="button"
        aria-label="Diapositiva siguiente"
        onClick={() => ir(1)}
        className="absolute inset-y-0 right-0 w-1/4 cursor-e-resize opacity-0"
      />

      <div className="absolute top-3 right-3 flex items-center gap-2 opacity-40 transition-opacity hover:opacity-100">
        <button
          type="button"
          onClick={pantallaCompleta}
          aria-label="Pantalla completa"
          className="rounded-md bg-white/15 p-2 text-white hover:bg-white/30"
        >
          <Maximize className="size-5" />
        </button>
        <button
          type="button"
          onClick={salir}
          aria-label="Salir de la presentación"
          className="rounded-md bg-white/15 p-2 text-white hover:bg-white/30"
        >
          <X className="size-5" />
        </button>
      </div>
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-white/15 px-3 py-1 text-sm text-white opacity-40 transition-opacity hover:opacity-100">
        <button type="button" onClick={() => ir(-1)} aria-label="Anterior" disabled={indice === 0}>
          <ChevronLeft className="size-5" />
        </button>
        <span className="tabular-nums">
          {total === 0 ? 0 : Math.min(indice, total - 1) + 1} / {total}
        </span>
        <button type="button" onClick={() => ir(1)} aria-label="Siguiente" disabled={indice >= total - 1}>
          <ChevronRight className="size-5" />
        </button>
      </div>
    </div>
  );
}
