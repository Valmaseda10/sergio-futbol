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
  fecha: string;
  minuto: number | null;
  autogol: boolean;
  goleador: string | null;
}

const SIN_TIPO = "__sin_tipo__";

type FiltroFavor = "todos" | "favor" | "contra";

const FILTROS_FAVOR: { value: FiltroFavor; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "favor", label: "A favor" },
  { value: "contra", label: "En contra" },
];

export function MapaGoles({
  goles,
  tipos,
}: {
  goles: GolUbicacion[];
  tipos: { value: string; label: string }[];
}) {
  const [filtroFavor, setFiltroFavor] = useState<FiltroFavor>("todos");

  const golesPorFavor = useMemo(
    () =>
      goles.filter((g) => {
        if (filtroFavor === "favor") return g.a_favor;
        if (filtroFavor === "contra") return !g.a_favor;
        return true;
      }),
    [goles, filtroFavor],
  );

  // Los tipos disponibles se recalculan sobre el filtro de a favor/en
  // contra ya aplicado, para no ofrecer un tipo que no tiene ningún gol
  // dentro de lo que se está viendo (p. ej. "penalti" solo a favor).
  const opciones = useMemo(() => {
    const base = tipos.filter((t) =>
      golesPorFavor.some((g) => g.tipo_gol === t.value),
    );
    const hayGolesSinTipo = golesPorFavor.some((g) => g.tipo_gol == null);
    return hayGolesSinTipo
      ? [...base, { value: SIN_TIPO, label: "Sin tipo" }]
      : base;
  }, [golesPorFavor, tipos]);

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

  const golesFiltrados = golesPorFavor.filter(
    (g) => !excluidos.has(g.tipo_gol ?? SIN_TIPO),
  );

  // Para el listado: por fecha y, dentro del partido, por minuto.
  const listado = useMemo(
    () =>
      [...golesFiltrados].sort(
        (a, b) => a.fecha.localeCompare(b.fecha) || (a.minuto ?? 999) - (b.minuto ?? 999),
      ),
    [golesFiltrados],
  );

  const aFavor = golesFiltrados.filter((g) => g.a_favor).length;
  const enContra = golesFiltrados.length - aFavor;

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 print:hidden">
        {FILTROS_FAVOR.map((f) => {
          const activo = filtroFavor === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFiltroFavor(f.value)}
              className={cn(
                "flex-1 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition-colors",
                activo
                  ? f.value === "favor"
                    ? "border-[#1b5e3a] bg-[#1b5e3a] text-white"
                    : f.value === "contra"
                      ? "border-destructive bg-destructive text-white"
                      : "border-primary bg-primary text-primary-foreground"
                  : "border-input text-muted-foreground hover:bg-muted",
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

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

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md border py-1.5">
          <p className="text-2xl leading-none font-bold">{golesFiltrados.length}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {golesFiltrados.length === 1 ? "gol" : "goles"} en total
          </p>
        </div>
        <div className="rounded-md border border-[#1b5e3a]/40 py-1.5">
          <p className="text-2xl leading-none font-bold text-[#1b5e3a]">{aFavor}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">a favor</p>
        </div>
        <div className="rounded-md border border-destructive/40 py-1.5">
          <p className="text-2xl leading-none font-bold text-destructive">{enContra}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">en contra</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Verde oscuro = a favor · Rojo = en contra
      </p>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-pitch">
        <PitchHalfLines />
        <p className="absolute top-2 right-2 z-10 rounded-md bg-black/60 px-2.5 py-1 text-white">
          <span className="text-2xl leading-none font-bold">{golesFiltrados.length}</span>
          <span className="ml-1.5 text-xs">
            {golesFiltrados.length === 1 ? "gol" : "goles"}
          </span>
        </p>
        {golesFiltrados.length === 0 ? (
          <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-white/80">
            Ningún gol de los seleccionados.
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

      {filtroFavor !== "todos" && golesFiltrados.length > 0 && (
        <div>
          <p className="mb-1.5 text-sm font-semibold">
            {filtroFavor === "favor" ? "Goles a favor" : "Goles en contra"} (
            {golesFiltrados.length})
          </p>
          <ul className="divide-y rounded-md border text-sm">
            {listado.map((g, i) => (
              <li key={i} className="flex items-center gap-2 px-2.5 py-1.5">
                <span
                  className={cn(
                    "size-2.5 shrink-0 rounded-full",
                    g.a_favor ? "bg-[#1b5e3a]" : "bg-destructive",
                  )}
                />
                <span className="w-11 shrink-0 text-xs tabular-nums text-muted-foreground">
                  {g.fecha
                    ? new Date(`${g.fecha}T00:00:00`).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "2-digit",
                      })
                    : ""}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{g.rival}</span>
                  {g.goleador && (
                    <span className="text-muted-foreground">
                      {" · "}
                      {g.autogol ? "p.p. " : ""}
                      {g.goleador}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-right text-xs text-muted-foreground">
                  {g.tipo_gol ? (tipos.find((t) => t.value === g.tipo_gol)?.label ?? g.tipo_gol) : ""}
                </span>
                <span className="w-9 shrink-0 text-right text-xs font-medium tabular-nums">
                  {g.minuto != null ? `${g.minuto}'` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
