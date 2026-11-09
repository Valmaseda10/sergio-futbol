"use client";

// Capitanes: cuántas veces ha sido capitán cada jugador y, al pulsar en uno, en qué partidos. El
// capitán de cada partido se elige en la ficha del partido o en el modo día de partido (también
// con la "C" de la convocatoria). No confundir con jugadores.es_capitan, que son los capitanes
// del equipo con las multas dobles.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { localDb, type LocalPartido } from "@/lib/db/local-db";
import { cn } from "@/lib/utils";

const COMPETICION: Record<string, string> = { liga: "Liga", amistoso: "Amistoso", copa: "Copa" };

function fechaCorta(fecha: string) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function resultado(p: LocalPartido) {
  return p.resultado_favor != null && p.resultado_contra != null
    ? `${p.resultado_favor}-${p.resultado_contra}`
    : null;
}

export function CapitanesPartidos({ hoy }: { hoy: string }) {
  const router = useRouter();
  const jugadores = useLiveQuery(() => localDb.jugadores.toArray(), [], []);
  const partidos = useLiveQuery(() => localDb.partidos.toArray(), [], []);
  const [abierto, setAbierto] = useState<string | null>(null);

  const { filas, sinMarcar } = useMemo(() => {
    const porJugador = new Map<string, LocalPartido[]>();
    for (const p of partidos) {
      if (!p.capitan_id) continue;
      porJugador.set(p.capitan_id, [...(porJugador.get(p.capitan_id) ?? []), p]);
    }
    const filas = jugadores
      .filter((j) => (j.es_capitan && j.activo) || porJugador.has(j.id))
      .map((j) => ({
        jugador: j,
        partidos: (porJugador.get(j.id) ?? []).sort((a, b) => b.fecha.localeCompare(a.fecha)),
      }))
      .sort(
        (a, b) =>
          b.partidos.length - a.partidos.length ||
          a.jugador.apellidos.localeCompare(b.jugador.apellidos),
      );
    // Partidos ya jugados en los que todavía no se ha marcado capitán.
    const sinMarcar = partidos.filter((p) => !p.capitan_id && p.fecha <= hoy).length;
    return { filas, sinMarcar };
  }, [jugadores, partidos, hoy]);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver
      </button>

      <div>
        <h1 className="text-2xl font-semibold">Capitanes</h1>
        <p className="text-sm text-muted-foreground">
          Las veces que ha sido capitán cada uno. Pulsa en un jugador para ver en qué partidos.
        </p>
      </div>

      <ul className="divide-y rounded-md border">
        {filas.map(({ jugador, partidos: lista }) => {
          const nombre = jugador.alias || `${jugador.nombre} ${jugador.apellidos}`;
          const desplegado = abierto === jugador.id;
          const veces = lista.length;
          return (
            <li key={jugador.id}>
              <button
                type="button"
                disabled={veces === 0}
                aria-expanded={desplegado}
                onClick={() => setAbierto(desplegado ? null : jugador.id)}
                className={cn(
                  "flex w-full items-center gap-3 p-3 text-left",
                  veces > 0 ? "hover:bg-muted/50" : "cursor-default",
                )}
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {jugador.dorsal != null ? `${jugador.dorsal} · ` : ""}
                  {nombre}
                </span>
                <span
                  className={cn(
                    "font-heading text-lg tabular-nums",
                    veces === 0 && "text-muted-foreground",
                  )}
                >
                  {veces}
                </span>
                <span className="w-12 shrink-0 text-xs text-muted-foreground">
                  {veces === 1 ? "vez" : "veces"}
                </span>
                {veces > 0 &&
                  (desplegado ? (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  ))}
              </button>
              {desplegado && (
                <ul className="divide-y border-t bg-muted/30 px-3 text-sm">
                  {lista.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                      <Link href={`/partidos/${p.id}`} className="min-w-0 flex-1 hover:underline">
                        <span className="tabular-nums text-muted-foreground">
                          {fechaCorta(p.fecha)}
                        </span>{" "}
                        · {p.local_visitante === "local" ? "vs" : "@"} {p.rival}
                      </Link>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {COMPETICION[p.competicion] ?? p.competicion}
                        {resultado(p) ? ` · ${resultado(p)}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {sinMarcar > 0 && (
        <p className="text-xs text-muted-foreground">
          {sinMarcar} {sinMarcar === 1 ? "partido jugado no tiene" : "partidos jugados no tienen"}{" "}
          capitán marcado.
        </p>
      )}
    </div>
  );
}
