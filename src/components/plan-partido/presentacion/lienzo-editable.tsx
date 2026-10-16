"use client";

// La diapositiva en grande con sus cajas de texto libres encima: se tocan para elegirlas, se
// arrastran para moverlas, la esquina inferior derecha las agranda y con doble toque se escribe
// directamente en ellas. Mientras se arrastra, la posición se lleva en local y solo se guarda al
// soltar (para no repintar toda la lista de miniaturas a cada movimiento).

import { useEffect, useRef, useState } from "react";
import {
  CAMPO_ONCE,
  DiapositivaEscalada,
  FichaCampo,
  estiloElementoLibre,
  fichasDeOnce,
  posicionEnCampo,
  ALTO,
  ANCHO,
  type ContextoPresentacion,
} from "@/components/plan-partido/presentacion/diapositiva-vista";
import type { Diapositiva, ElementoLibre, FichaOnce } from "@/lib/presentacion-partido";

type Gesto = {
  id: string;
  modo: "mover" | "redimensionar";
  inicioX: number;
  inicioY: number;
  original: ElementoLibre;
};

export function LienzoEditable({
  d,
  ctx,
  seleccionId,
  onSeleccion,
  onCambiarElemento,
  onMoverFicha,
}: {
  d: Diapositiva;
  ctx: ContextoPresentacion;
  seleccionId: string | null;
  onSeleccion: (id: string | null) => void;
  onCambiarElemento: (id: string, parche: Partial<ElementoLibre>) => void;
  /** Mueve una ficha del once (posición en % del campo). */
  onMoverFicha?: (id: string, parche: Partial<FichaOnce>) => void;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(0.5);
  const [gesto, setGesto] = useState<Gesto | null>(null);
  const [temporal, setTemporal] = useState<Partial<ElementoLibre> | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [gestoFicha, setGestoFicha] = useState<{ id: string; inicioX: number; inicioY: number; original: FichaOnce } | null>(
    null,
  );
  const [fichaTemp, setFichaTemp] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    const medir = () => setEscala(el.clientWidth / ANCHO);
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  function empezar(e: React.PointerEvent, el: ElementoLibre, modo: Gesto["modo"]) {
    if (editandoId === el.id) return;
    e.stopPropagation();
    onSeleccion(el.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setGesto({ id: el.id, modo, inicioX: e.clientX, inicioY: e.clientY, original: el });
    setTemporal(null);
  }

  function moverGesto(e: React.PointerEvent) {
    if (gestoFicha) {
      // De píxeles del lienzo a % del campo (el área de juego es el 92 % del ancho y el 88 % del alto).
      const dx = ((e.clientX - gestoFicha.inicioX) / escala / (CAMPO_ONCE.ancho * (480 / 520))) * 100;
      const dy = ((e.clientY - gestoFicha.inicioY) / escala / (CAMPO_ONCE.alto * (300 / 340))) * 100;
      setFichaTemp({
        x: Math.round(Math.min(100, Math.max(0, gestoFicha.original.x + dx)) * 10) / 10,
        y: Math.round(Math.min(100, Math.max(0, gestoFicha.original.y + dy)) * 10) / 10,
      });
      return;
    }
    mover(e);
  }

  function mover(e: React.PointerEvent) {
    if (!gesto) return;
    const dx = (e.clientX - gesto.inicioX) / escala;
    const dy = (e.clientY - gesto.inicioY) / escala;
    const o = gesto.original;
    if (gesto.modo === "mover") {
      setTemporal({
        x: Math.round(Math.min(ANCHO - 40, Math.max(-o.w + 40, o.x + dx))),
        y: Math.round(Math.min(ALTO - 30, Math.max(-o.h + 30, o.y + dy))),
      });
    } else {
      setTemporal({
        w: Math.round(Math.max(60, o.w + dx)),
        h: Math.round(Math.max(40, o.h + dy)),
      });
    }
  }

  function soltar() {
    if (gesto && temporal) onCambiarElemento(gesto.id, temporal);
    if (gestoFicha && fichaTemp) onMoverFicha?.(gestoFicha.id, fichaTemp);
    setGesto(null);
    setTemporal(null);
    setGestoFicha(null);
    setFichaTemp(null);
  }

  const extras = d.extras ?? [];
  const fichas = d.tipo === "rival_once" ? fichasDeOnce(d, ctx).filter((f) => !f.suplente) : [];

  return (
    <div ref={contenedor} className="relative w-full select-none" style={{ aspectRatio: "16 / 9" }}>
      {/* La diapositiva sin sus cajas: esas se dibujan debajo, interactivas. */}
      <DiapositivaEscalada d={d.tipo === "rival_once" ? { ...d, extras: [], sinFichas: true } : { ...d, extras: [] }} ctx={ctx} />
      <div
        onPointerDown={() => {
          onSeleccion(null);
          setEditandoId(null);
        }}
        onPointerMove={moverGesto}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: ANCHO,
          height: ALTO,
          transform: `scale(${escala})`,
          transformOrigin: "top left",
          touchAction: "none",
        }}
      >
        {fichas.map((f) => {
          const vivo = gestoFicha?.id === f.id && fichaTemp ? { ...f, ...fichaTemp } : f;
          return (
            <div
              key={f.id}
              onPointerDown={(e) => {
                e.stopPropagation();
                onSeleccion(null);
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                setGestoFicha({ id: f.id, inicioX: e.clientX, inicioY: e.clientY, original: f });
                setFichaTemp(null);
              }}
              style={{ cursor: "grab" }}
            >
              <FichaCampo f={vivo} ancla={posicionEnCampo(vivo.x, vivo.y)} />
            </div>
          );
        })}
        {extras.map((el) => {
          const vivo = gesto?.id === el.id && temporal ? { ...el, ...temporal } : el;
          const elegido = seleccionId === el.id;
          const editando = editandoId === el.id;
          return (
            <div
              key={el.id}
              onPointerDown={(e) => empezar(e, el, "mover")}
              onDoubleClick={() => {
                onSeleccion(el.id);
                setEditandoId(el.id);
              }}
              style={{
                ...estiloElementoLibre(vivo),
                overflow: "visible",
                cursor: editando ? "text" : "move",
                outline: elegido ? "4px dashed #2563eb" : "2px dashed rgba(37,99,235,0.35)",
                outlineOffset: 4,
              }}
            >
              {editando ? (
                <textarea
                  autoFocus
                  value={el.texto}
                  onChange={(e) => onCambiarElemento(el.id, { texto: e.target.value })}
                  onBlur={() => setEditandoId(null)}
                  onPointerDown={(e) => e.stopPropagation()}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    resize: "none",
                    border: "none",
                    outline: "none",
                    background: "rgba(255,255,255,0.85)",
                    font: "inherit",
                    color: "inherit",
                    textAlign: vivo.alinear,
                    padding: "inherit",
                    boxSizing: "border-box",
                    lineHeight: "inherit",
                  }}
                />
              ) : (
                <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>{el.texto}</div>
              )}
              {elegido && !editando && (
                <div
                  onPointerDown={(e) => empezar(e, el, "redimensionar")}
                  style={{
                    position: "absolute",
                    right: -22,
                    bottom: -22,
                    width: 44,
                    height: 44,
                    borderRadius: 8,
                    background: "#2563eb",
                    border: "5px solid #ffffff",
                    cursor: "nwse-resize",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
