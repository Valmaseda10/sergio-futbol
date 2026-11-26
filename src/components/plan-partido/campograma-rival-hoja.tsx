"use client";

// Campograma del rival de la página 2 de la hoja de partido: su once dibujado en
// el campo (fichas con dorsal y nombre que se arrastran), con la lista para
// escribir los nombres, el sistema y unas notas. Lo que se ve en pantalla es lo
// que se imprime; los controles de edición no salen en el papel.

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FORMACIONES } from "@/lib/formaciones";
import { alineacionRivalDesdeFichaLocal } from "@/app/(app)/plan-partido/local-actions";
import type { CampogramaRival, FichaCampogramaRival } from "@/lib/plan-partido";
import { AreaAuto } from "@/components/plan-partido/hoja-campos";

const BORDE = "border-neutral-900";
const MARGEN = 5;

const nuevoId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `f${Date.now()}${Math.random().toString(16).slice(2)}`;

const limitar = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** "13 BASTIÁN" -> { numero: "13", nombre: "BASTIÁN" }; sin número, el puesto de la lista. */
function separarNumero(texto: string, posicion: number) {
  const m = texto.trim().match(/^(\d{1,2})\s*[-.·:]?\s+(.+)$/);
  if (m) return { numero: m[1], nombre: m[2].trim() };
  const t = texto.trim();
  return /^\d{1,2}$/.test(t)
    ? { numero: t, nombre: "" }
    : { numero: t ? String(posicion + 1) : "", nombre: t };
}

function Campo() {
  const l = { stroke: "#ffffff", strokeWidth: 0.6, fill: "none" } as const;
  return (
    <svg
      viewBox="0 0 75 100"
      preserveAspectRatio="none"
      className="absolute inset-0 size-full"
      role="img"
      aria-label="Campo"
    >
      <rect width="75" height="100" fill="#4fcf50" />
      <g {...l}>
        <rect x="2" y="2" width="71" height="96" />
        <line x1="2" y1="50" x2="73" y2="50" />
        <circle cx="37.5" cy="50" r="9.5" />
        <rect x="15" y="2" width="45" height="15" />
        <rect x="26.5" y="2" width="22" height="5.5" />
        <rect x="15" y="83" width="45" height="15" />
        <rect x="26.5" y="92.5" width="22" height="5.5" />
      </g>
      <circle cx="37.5" cy="50" r="0.7" fill="#ffffff" />
    </svg>
  );
}

export function CampogramaRivalHoja({
  datos,
  onCambio,
  partidoId,
  titularesRival,
}: {
  datos: CampogramaRival;
  onCambio: (c: CampogramaRival) => void;
  partidoId: string;
  /** Lo escrito en la columna del rival de la hoja ("13 BASTIÁN"…), para ponerle nombre a las fichas. */
  titularesRival: string[];
}) {
  const campoRef = useRef<HTMLDivElement>(null);
  const arrastre = useRef<{ id: string; x: number; y: number; movido: boolean } | null>(null);
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const [formacion, setFormacion] = useState(FORMACIONES[0].value);

  const fichas = datos.fichas;
  const actualizar = (id: string, parche: Partial<FichaCampogramaRival>) =>
    onCambio({ ...datos, fichas: fichas.map((f) => (f.id === id ? { ...f, ...parche } : f)) });

  function colocar() {
    const f = FORMACIONES.find((x) => x.value === formacion);
    if (!f) return;
    onCambio({
      ...datos,
      sistema: datos.sistema.trim() ? datos.sistema : f.label,
      fichas: f.huecos.map((h, i) => {
        // Se conserva lo ya escrito (por orden) y, si no hay nada, se usa la lista de la hoja.
        const previa = fichas[i];
        const hoja = separarNumero(titularesRival[i] ?? "", i);
        return {
          id: previa?.id ?? nuevoId(),
          numero: previa?.numero || hoja.numero,
          nombre: previa?.nombre || hoja.nombre,
          left: h.left,
          top: h.top,
        };
      }),
    });
    setSeleccionada(null);
  }

  async function traerDeLaFicha() {
    const ficha = await alineacionRivalDesdeFichaLocal(partidoId);
    if (!ficha || ficha.fichas.length === 0) {
      toast.error("La ficha del rival no tiene alineación dibujada (Rivales → Alineación contra nosotros).");
      return;
    }
    onCambio({
      ...datos,
      sistema: datos.sistema.trim() ? datos.sistema : ficha.sistema,
      fichas: ficha.fichas.map((f) => ({ id: nuevoId(), ...f })),
    });
    setSeleccionada(null);
    toast.success(`Traídas ${ficha.fichas.length} fichas de la ficha del rival.`);
  }

  function alPulsar(e: React.PointerEvent<HTMLButtonElement>, id: string) {
    e.currentTarget.setPointerCapture(e.pointerId);
    arrastre.current = { id, x: e.clientX, y: e.clientY, movido: false };
  }

  function alMover(e: React.PointerEvent<HTMLButtonElement>, id: string) {
    const a = arrastre.current;
    if (!a || a.id !== id) return;
    if (!a.movido && Math.hypot(e.clientX - a.x, e.clientY - a.y) < 5) return;
    const r = campoRef.current?.getBoundingClientRect();
    if (!r) return;
    a.movido = true;
    actualizar(id, {
      left: Math.round(limitar(((e.clientX - r.left) / r.width) * 100, MARGEN, 100 - MARGEN) * 10) / 10,
      top: Math.round(limitar(((e.clientY - r.top) / r.height) * 100, MARGEN, 100 - MARGEN) * 10) / 10,
    });
  }

  function alSoltar(id: string) {
    const a = arrastre.current;
    arrastre.current = null;
    if (a && a.id === id && !a.movido) setSeleccionada((s) => (s === id ? null : id));
  }

  return (
    <div>
      <div className={`flex h-6 items-center justify-center border-b text-[13px] font-bold uppercase underline ${BORDE}`}>
        Campograma del rival
      </div>

      {/* Controles de edición: no salen en el papel */}
      <div className={`flex flex-wrap items-center gap-2 border-b px-2 py-1.5 print:hidden ${BORDE}`}>
        <select
          value={formacion}
          onChange={(e) => setFormacion(e.target.value)}
          aria-label="Formación del rival"
          className="h-8 rounded-md border bg-background px-2 text-xs"
        >
          {FORMACIONES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <Button type="button" size="sm" variant="outline" onClick={colocar}>
          Colocar once
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={traerDeLaFicha}>
          Traer de la ficha del rival
        </Button>
        {fichas.length > 0 && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              onCambio({ ...datos, fichas: [] });
              setSeleccionada(null);
            }}
          >
            Vaciar
          </Button>
        )}
        <span className="text-[11px] text-muted-foreground">
          Arrastra las fichas; toca una para quitarla de en medio o cambiar su nombre en la lista.
        </span>
      </div>

      <div className="grid grid-cols-[1.15fr_1fr]">
        {/* Campo */}
        <div className={`border-r p-1.5 ${BORDE}`}>
          <div
            ref={campoRef}
            className="relative aspect-[3/4] w-full touch-none select-none overflow-hidden bg-[#4fcf50]"
          >
            <Campo />
            {fichas.length === 0 && (
              <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-xs text-white/90 print:hidden">
                Elige una formación y pulsa «Colocar once», o trae la alineación dibujada en la ficha del rival.
              </p>
            )}
            {fichas.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-label={`Ficha ${f.numero || ""} ${f.nombre}`.trim()}
                onPointerDown={(e) => alPulsar(e, f.id)}
                onPointerMove={(e) => alMover(e, f.id)}
                onPointerUp={() => alSoltar(f.id)}
                onPointerCancel={() => {
                  arrastre.current = null;
                }}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 cursor-grab flex-col items-center gap-0.5 active:cursor-grabbing"
                style={{ left: `${f.left}%`, top: `${f.top}%` }}
              >
                <span
                  className={`flex size-7 items-center justify-center rounded-full border-2 bg-red-600 text-[12px] font-bold tabular-nums text-white shadow ${
                    seleccionada === f.id ? "border-yellow-300" : "border-white"
                  }`}
                >
                  {f.numero || "?"}
                </span>
                {f.nombre && (
                  <span className="max-w-[5.5rem] truncate rounded bg-black/65 px-1 text-[9px] leading-tight font-bold uppercase text-white">
                    {f.nombre}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Sistema, lista de fichas y notas */}
        <div className="flex min-w-0 flex-col">
          <div className={`grid h-6 grid-cols-[4.5rem_1fr] border-b ${BORDE}`}>
            <span className={`flex items-center border-r px-1.5 text-[11px] font-bold uppercase ${BORDE}`}>
              Sistema
            </span>
            <input
              value={datos.sistema}
              aria-label="Sistema del rival"
              onChange={(e) => onCambio({ ...datos, sistema: e.target.value })}
              className="h-full w-full min-w-0 bg-transparent px-1.5 text-[12px] font-semibold outline-none focus:bg-yellow-50 print:focus:bg-transparent"
            />
          </div>

          {fichas.length > 0 && (
            <div className={`border-b print:hidden ${BORDE}`}>
              {fichas.map((f) => (
                <div
                  key={f.id}
                  className={`grid h-6 grid-cols-[2rem_1fr_1.4rem] border-b last:border-b-0 ${BORDE} ${
                    seleccionada === f.id ? "bg-yellow-50" : ""
                  }`}
                >
                  <input
                    value={f.numero}
                    inputMode="numeric"
                    aria-label="Dorsal"
                    onChange={(e) => actualizar(f.id, { numero: e.target.value })}
                    onFocus={() => setSeleccionada(f.id)}
                    className={`h-full w-full min-w-0 border-r bg-transparent px-1 text-center text-[12px] font-semibold outline-none ${BORDE}`}
                  />
                  <input
                    value={f.nombre}
                    aria-label="Nombre"
                    onChange={(e) => actualizar(f.id, { nombre: e.target.value })}
                    onFocus={() => setSeleccionada(f.id)}
                    className="h-full w-full min-w-0 bg-transparent px-1.5 text-[12px] font-semibold uppercase outline-none"
                  />
                  <button
                    type="button"
                    aria-label="Quitar ficha"
                    onClick={() => {
                      onCambio({ ...datos, fichas: fichas.filter((x) => x.id !== f.id) });
                      setSeleccionada(null);
                    }}
                    className="flex items-center justify-center text-[13px] text-muted-foreground hover:text-destructive"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className={`flex h-6 items-center justify-center border-b text-[12px] font-bold uppercase ${BORDE}`}>
            Notas del once
          </div>
          <div className="flex min-h-[6rem] flex-1 flex-col">
            <AreaAuto
              llenar
              valor={datos.notas}
              etiqueta="Notas del once del rival"
              className="flex-1 text-[12px]"
              onCambio={(v) => onCambio({ ...datos, notas: v })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
