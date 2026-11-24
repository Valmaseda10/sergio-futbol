"use client";

// Cuadrícula jugador × últimos partidos: verde si fue titular, rojo si empezó
// en el banquillo, gris si no estuvo convocado.

import { useMemo } from "react";

export interface PartidoReciente {
  id: string;
  fecha: string;
  rival: string;
}

export interface JugadorReciente {
  id: string;
  nombre: string;
  apellidos: string;
  dorsal: number | null;
}

export interface AlineacionReciente {
  partido_id: string;
  jugador_id: string | null;
  titular: boolean;
}

export interface ConvocadoReciente {
  partido_id: string;
  jugador_id: string;
}

type Estado = "titular" | "suplente" | "no";

const CLASES: Record<Estado, string> = {
  titular: "bg-green-600 text-white",
  suplente: "bg-red-500 text-white",
  no: "bg-muted text-muted-foreground/60",
};

const ETIQUETA: Record<Estado, string> = {
  titular: "Titular",
  suplente: "Suplente",
  no: "No convocado",
};

function nombreCorto(rival: string) {
  return rival
    .replace(/\b(C\.?D\.?|C\.?F\.?|F\.?C\.?|S\.?A\.?D\.?|U\.?D\.?)\s*/gi, "")
    .replace(/["“”]/g, "")
    .trim();
}

export function UltimosPartidosJugadores({
  partidos,
  jugadores,
  alineaciones,
  convocados,
}: {
  /** Los últimos partidos jugados, del más antiguo al más reciente. */
  partidos: PartidoReciente[];
  jugadores: JugadorReciente[];
  alineaciones: AlineacionReciente[];
  convocados: ConvocadoReciente[];
}) {
  const filas = useMemo(() => {
    const ali = new Map<string, boolean>();
    for (const a of alineaciones) if (a.jugador_id) ali.set(`${a.partido_id}|${a.jugador_id}`, a.titular);
    const conv = new Set(convocados.map((c) => `${c.partido_id}|${c.jugador_id}`));

    const estadoDe = (partidoId: string, jugadorId: string): Estado => {
      const k = `${partidoId}|${jugadorId}`;
      if (ali.has(k)) return ali.get(k) ? "titular" : "suplente";
      // Convocado sin alineación guardada: cuenta como banquillo.
      return conv.has(k) ? "suplente" : "no";
    };

    return jugadores
      .map((j) => {
        const estados = partidos.map((p) => estadoDe(p.id, j.id));
        return {
          jugador: j,
          estados,
          titular: estados.filter((e) => e === "titular").length,
          suplente: estados.filter((e) => e === "suplente").length,
        };
      })
      .sort(
        (a, b) =>
          b.titular - a.titular ||
          b.suplente - a.suplente ||
          a.jugador.nombre.localeCompare(b.jugador.nombre, "es"),
      );
  }, [partidos, jugadores, alineaciones, convocados]);

  return (
    <div className="space-y-3 [-webkit-print-color-adjust:exact] [print-color-adjust:exact]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {(["titular", "suplente", "no"] as Estado[]).map((e) => (
          <span key={e} className="flex items-center gap-1.5">
            <span className={`size-3 rounded-sm ${CLASES[e]}`} />
            {ETIQUETA[e]}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="sticky left-0 z-10 bg-muted px-2 py-2 text-left text-xs font-medium">
                Jugador
              </th>
              {partidos.map((p) => (
                <th key={p.id} className="px-1 py-2 text-center align-bottom">
                  <span className="block max-w-[4.5rem] truncate text-[11px] font-medium leading-tight">
                    {nombreCorto(p.rival)}
                  </span>
                  <span className="block text-[10px] font-normal text-muted-foreground">
                    {new Date(`${p.fecha}T00:00:00`).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </span>
                </th>
              ))}
              <th className="px-2 py-2 text-center text-[11px] font-medium">T / S</th>
            </tr>
          </thead>
          <tbody>
            {filas.map(({ jugador: j, estados, titular, suplente }) => (
              <tr key={j.id} className="border-b last:border-b-0">
                <td className="sticky left-0 z-10 whitespace-nowrap bg-card px-2 py-1 text-xs font-medium uppercase">
                  {j.dorsal != null ? `${j.dorsal} · ` : ""}
                  {j.nombre} {j.apellidos}
                </td>
                {estados.map((e, i) => (
                  <td key={partidos[i].id} className="px-1 py-1">
                    <div
                      className={`mx-auto h-7 w-full min-w-9 rounded-sm ${CLASES[e]}`}
                      title={`${nombreCorto(partidos[i].rival)}: ${ETIQUETA[e]}`}
                      aria-label={ETIQUETA[e]}
                    />
                  </td>
                ))}
                <td className="whitespace-nowrap px-2 py-1 text-center text-xs tabular-nums">
                  <span className="font-medium text-green-700">{titular}</span>
                  {" / "}
                  <span className="font-medium text-red-600">{suplente}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
