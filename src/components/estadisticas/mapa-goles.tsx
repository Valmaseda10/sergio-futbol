"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { PitchHalfLines } from "@/components/partidos/campo-mini-selector";

interface GolUbicacion {
  pos_x: number;
  pos_y: number;
  a_favor: boolean;
  tipo_gol: string | null;
  rival: string;
}

const SIN_TIPO = "__sin_tipo__";

export function MapaGoles({
  goles,
  tipos,
}: {
  goles: GolUbicacion[];
  tipos: { value: string; label: string }[];
}) {
  const opciones = useMemo(() => {
    const base = tipos.filter((t) => goles.some((g) => g.tipo_gol === t.value));
    const hayGolesSinTipo = goles.some((g) => g.tipo_gol == null);
    return hayGolesSinTipo
      ? [...base, { value: SIN_TIPO, label: "Sin tipo" }]
      : base;
  }, [goles, tipos]);

  // Se guardan los tipos EXCLUIDOS (no los seleccionados) para que, por
  // defecto, se muestren todos los goles aunque `opciones` todavía esté
  // vacío en el primer render (los goles llegan de forma asíncrona).
  const [excluidos, setExcluidos] = useState<Set<string>>(() => new Set());

  function alternar(value: string) {
    setExcluidos((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  const golesFiltrados = goles.filter(
    (g) => !excluidos.has(g.tipo_gol ?? SIN_TIPO),
  );

  return (
    <div className="space-y-3">
      {opciones.length > 1 && (
        <div className="flex flex-wrap gap-1.5 print:hidden">
          {opciones.map((o) => {
            const activo = !excluidos.has(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => alternar(o.value)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  activo
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input text-muted-foreground hover:bg-muted",
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Verde oscuro = CYDL Infantil B (a favor) · Rojo = en contra
      </p>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-pitch">
        <PitchHalfLines />
        {golesFiltrados.length === 0 ? (
          <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-white/80">
            Ningún gol de los tipos seleccionados.
          </p>
        ) : (
          golesFiltrados.map((g, i) => (
            <div
              key={i}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
              style={{ top: `${g.pos_y}%`, left: `${g.pos_x}%` }}
            >
              <span className="max-w-16 truncate rounded bg-black/50 px-1 text-[8px] leading-tight text-white">
                {g.rival}
              </span>
              <span
                className={cn(
                  "size-3 shrink-0 rounded-full border-2 border-white shadow",
                  g.a_favor ? "bg-[#1b5e3a]" : "bg-destructive",
                )}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
