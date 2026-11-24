"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PitchHalfLines } from "@/components/partidos/campo-mini-selector";

interface GolUbicacion {
  pos_x: number | null;
  pos_y: number | null;
  a_favor: boolean;
  tipo_gol: string | null;
  rival: string;
  partido_id: string;
  resultado: string | null;
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

  // Para el listado: un bloque por partido (por fecha) y los goles por minuto.
  const listado = useMemo(() => {
    const porPartido = new Map<
      string,
      { partido_id: string; fecha: string; rival: string; resultado: string | null; goles: GolUbicacion[] }
    >();
    for (const g of golesFiltrados) {
      const grupo = porPartido.get(g.partido_id) ?? {
        partido_id: g.partido_id,
        fecha: g.fecha,
        rival: g.rival,
        resultado: g.resultado,
        goles: [],
      };
      grupo.goles.push(g);
      porPartido.set(g.partido_id, grupo);
    }
    return [...porPartido.values()]
      .map((grupo) => ({
        ...grupo,
        goles: [...grupo.goles].sort((a, b) => (a.minuto ?? 999) - (b.minuto ?? 999)),
      }))
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [golesFiltrados]);

  const sinUbicacion = golesFiltrados.filter((g) => g.pos_x == null || g.pos_y == null).length;
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
        {sinUbicacion > 0 &&
          ` · ${sinUbicacion} ${sinUbicacion === 1 ? "gol" : "goles"} sin ubicación en el campo (solo en el listado)`}
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
          golesFiltrados
            .filter((g) => g.pos_x != null && g.pos_y != null)
            .map((g, i) => (
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

      {listado.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            {filtroFavor === "favor"
              ? "Partidos con gol a favor"
              : filtroFavor === "contra"
                ? "Partidos con gol en contra"
                : "Partidos con goles"}{" "}
            ({listado.length})
          </p>
          <ul className="divide-y rounded-md border px-2.5">
            {listado.map((grupo) => (
              <li key={grupo.partido_id}>
                <Link
                  href={`/partidos/${grupo.partido_id}`}
                  className="block py-2 text-sm hover:bg-muted/50"
                >
                  <span className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 truncate font-medium">
                      vs {grupo.rival}
                    </span>
                    {grupo.goles.length > 1 && (
                      <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-xs font-semibold tabular-nums">
                        ×{grupo.goles.length}
                      </span>
                    )}
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {grupo.fecha
                        ? new Date(`${grupo.fecha}T00:00:00`).toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : ""}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {grupo.goles
                      .map((g) => {
                        const quien = g.a_favor
                          ? `${g.autogol ? "p.p. " : ""}${g.goleador ?? "Gol"}`
                          : "En contra";
                        return `${quien}${g.minuto != null ? ` ${g.minuto}'` : ""}`;
                      })
                      .join(" · ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
