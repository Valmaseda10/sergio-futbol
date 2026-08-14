"use client";

import { useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { FORMACIONES } from "@/lib/formaciones";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Jugador {
  id: string;
  nombre: string;
  apellidos: string;
  alias: string | null;
  dorsal: number | null;
}

interface Posicion {
  top: number;
  left: number;
}

const MARGEN = 5;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function nombreFicha(j: Jugador) {
  return j.alias || j.apellidos;
}

export function PizarraTactica({ jugadores }: { jugadores: Jugador[] }) {
  const pitchRef = useRef<HTMLDivElement>(null);
  const [posiciones, setPosiciones] = useState<Record<string, Posicion>>({});
  const [formacionValue, setFormacionValue] = useState(FORMACIONES[0].value);

  const dragRef = useRef<{
    jugadorId: string;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  const enCampo = jugadores.filter((j) => posiciones[j.id]);
  const enBanquillo = jugadores.filter((j) => !posiciones[j.id]);

  function handleAplicarFormacion() {
    const formacion = FORMACIONES.find((f) => f.value === formacionValue);
    if (!formacion) return;
    const siguientes = jugadores.slice(0, formacion.huecos.length);
    const nuevo: Record<string, Posicion> = {};
    siguientes.forEach((j, i) => {
      const hueco = formacion.huecos[i];
      nuevo[j.id] = { top: hueco.top, left: hueco.left };
    });
    setPosiciones(nuevo);
  }

  function handleReiniciar() {
    setPosiciones({});
  }

  function handleBanquilloClick(jugadorId: string) {
    setPosiciones((prev) => ({ ...prev, [jugadorId]: { top: 50, left: 50 } }));
  }

  function handlePointerDown(
    e: React.PointerEvent<HTMLButtonElement>,
    jugadorId: string,
  ) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      jugadorId,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
  }

  function handlePointerMove(
    e: React.PointerEvent<HTMLButtonElement>,
    jugadorId: string,
  ) {
    const drag = dragRef.current;
    if (!drag || drag.jugadorId !== jugadorId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;

    const rect = pitchRef.current?.getBoundingClientRect();
    if (!rect) return;

    drag.moved = true;
    const left = clamp(((e.clientX - rect.left) / rect.width) * 100, MARGEN, 100 - MARGEN);
    const top = clamp(((e.clientY - rect.top) / rect.height) * 100, MARGEN, 100 - MARGEN);
    setPosiciones((prev) => ({ ...prev, [jugadorId]: { top, left } }));
  }

  function handlePointerUp(
    e: React.PointerEvent<HTMLButtonElement>,
    jugadorId: string,
  ) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag && drag.jugadorId === jugadorId && !drag.moved) {
      setPosiciones((prev) => {
        const next = { ...prev };
        delete next[jugadorId];
        return next;
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select value={formacionValue} onValueChange={(v) => v && setFormacionValue(v)}>
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FORMACIONES.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={handleAplicarFormacion}>
          Aplicar
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleReiniciar}
          aria-label="Reiniciar pizarra"
        >
          <RotateCcw className="size-4" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Toca una ficha del banquillo para sacarla al campo; mantén y arrastra
        para moverla; toca una ficha en el campo para devolverla al
        banquillo.
      </p>

      <div
        ref={pitchRef}
        className="relative aspect-[2/3] w-full touch-none overflow-hidden rounded-lg bg-pitch"
      >
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/40" />
        <div className="absolute top-1/2 left-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40" />
        <div className="absolute inset-x-[20%] top-0 h-[12%] border-x border-b border-white/40" />
        <div className="absolute inset-x-[20%] bottom-0 h-[12%] border-x border-t border-white/40" />
        <div className="absolute inset-x-[42%] top-0 h-[3%] border-x-2 border-b-2 border-white/70" />
        <div className="absolute inset-x-[42%] bottom-0 h-[3%] border-x-2 border-t-2 border-white/70" />

        {enCampo.map((j) => {
          const pos = posiciones[j.id];
          if (!pos) return null;
          return (
            <button
              key={j.id}
              type="button"
              onPointerDown={(e) => handlePointerDown(e, j.id)}
              onPointerMove={(e) => handlePointerMove(e, j.id)}
              onPointerUp={(e) => handlePointerUp(e, j.id)}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
              style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
            >
              <span className="flex size-9 items-center justify-center rounded-full border-2 border-gold bg-white font-heading text-sm tabular-nums text-foreground shadow">
                {j.dorsal ?? nombreFicha(j)[0]}
              </span>
              <span className="max-w-16 truncate rounded bg-black/40 px-1 text-[10px] text-white">
                {nombreFicha(j)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Banquillo ({enBanquillo.length})
        </p>
        {enBanquillo.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todos los jugadores están en el campo.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {enBanquillo.map((j) => (
              <li key={j.id}>
                <button
                  type="button"
                  onClick={() => handleBanquilloClick(j.id)}
                  className="flex items-center gap-2 rounded-full border py-1 pr-3 pl-2 text-sm hover:bg-muted"
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                    {j.dorsal ?? nombreFicha(j)[0]}
                  </span>
                  {nombreFicha(j)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
