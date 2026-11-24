"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { JugadorStats } from "@/lib/estadisticas";

/** Un partido reciente, para las columnas T/S de cada jugador. */
export interface PartidoReciente {
  id: string;
  fecha: string;
  rival: string;
}

export interface AlineacionReciente {
  partido_id: string;
  jugador_id: string | null;
  titular: boolean;
}

export interface ConvocadoReciente {
  partido_id: string;
  jugador_id: string | null;
}

type EstadoPartido = "titular" | "suplente" | "no";

type Columna = Exclude<keyof JugadorStats, "id" | "nombre" | "apellidos">;

const COLUMNAS: { key: Columna; label: string }[] = [
  { key: "minutosAprox", label: "Minutos" },
  { key: "convocatorias", label: "Convoc." },
  { key: "titularidades", label: "Titular" },
  { key: "suplencias", label: "Suplente" },
  { key: "goles", label: "Goles" },
  { key: "asistencias", label: "Asist." },
  { key: "golesAsistencias", label: "G+A" },
  { key: "golesEncajados", label: "G. Enc." },
  { key: "tarjetasAmarillas", label: "TA" },
  { key: "tarjetasRojas", label: "TR" },
  { key: "entrenamientosTotales", label: "Entrenos" },
  { key: "entrenamientosAsistidos", label: "Asistió" },
  { key: "entrenamientosPerdidos", label: "Perdió" },
  { key: "pctAsistencia", label: "% Entreno" },
];

function nombreCorto(rival: string) {
  return rival
    .replace(/\b(C\.?D\.?|C\.?F\.?|F\.?C\.?|S\.?A\.?D\.?|U\.?D\.?)\s*/gi, "")
    .replace(/["“”]/g, "")
    .trim();
}

function BloquePartido({ estado, titulo }: { estado: EstadoPartido; titulo: string }) {
  const color =
    estado === "titular"
      ? "bg-green-600"
      : estado === "suplente"
        ? "bg-red-500"
        : "bg-muted";
  const texto =
    estado === "titular" ? "titular" : estado === "suplente" ? "suplente" : "no convocado";
  return <span title={`${titulo}: ${texto}`} className={`h-2.5 w-5 rounded-[2px] ${color}`} />;
}

export function JugadoresTable({
  jugadores,
  partidosRecientes = [],
  alineaciones = [],
  convocados = [],
}: {
  jugadores: JugadorStats[];
  /** Últimos partidos jugados, del más antiguo al más reciente. */
  partidosRecientes?: PartidoReciente[];
  alineaciones?: AlineacionReciente[];
  convocados?: ConvocadoReciente[];
}) {
  const [orden, setOrden] = useState<Columna>("goles");
  const [ascendente, setAscendente] = useState(false);

  function handleSort(columna: Columna) {
    if (columna === orden) {
      setAscendente((prev) => !prev);
    } else {
      setOrden(columna);
      setAscendente(false);
    }
  }

  // Estado de cada jugador en cada uno de los últimos partidos.
  const recientes = useMemo(() => {
    const ali = new Map<string, boolean>();
    for (const a of alineaciones) {
      if (a.jugador_id) ali.set(`${a.partido_id}|${a.jugador_id}`, a.titular);
    }
    const conv = new Set(
      convocados.filter((c) => c.jugador_id).map((c) => `${c.partido_id}|${c.jugador_id}`),
    );
    const porJugador = new Map<
      string,
      { estados: EstadoPartido[]; titRecientes: number; supRecientes: number }
    >();
    for (const j of jugadores) {
      const estados = partidosRecientes.map((p): EstadoPartido => {
        const k = `${p.id}|${j.id}`;
        if (ali.has(k)) return ali.get(k) ? "titular" : "suplente";
        // Convocado sin alineación guardada: cuenta como banquillo.
        return conv.has(k) ? "suplente" : "no";
      });
      porJugador.set(j.id, {
        estados,
        titRecientes: estados.filter((e) => e === "titular").length,
        supRecientes: estados.filter((e) => e === "suplente").length,
      });
    }
    return porJugador;
  }, [jugadores, partidosRecientes, alineaciones, convocados]);

  const ordenados = useMemo(() => {
    const valor = (j: JugadorStats): number => {
      return j[orden] ?? -1;
    };
    return [...jugadores].sort((a, b) => {
      const d = ascendente ? valor(a) - valor(b) : valor(b) - valor(a);
      if (d !== 0) return d;
      // Desempate: más titularidades recientes primero.
      return (recientes.get(b.id)?.titRecientes ?? 0) - (recientes.get(a.id)?.titRecientes ?? 0);
    });
  }, [jugadores, orden, ascendente, recientes]);

  const hayRecientes = partidosRecientes.length > 0;

  function cabecera(col: Columna, label: string) {
    return (
      <TableHead
        key={col}
        className={
          "cursor-pointer whitespace-nowrap select-none" +
          (orden === col ? " text-primary" : "")
        }
        onClick={() => handleSort(col)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          {orden === col ? (
            ascendente ? (
              <ArrowUp className="size-3" />
            ) : (
              <ArrowDown className="size-3" />
            )
          ) : (
            <ArrowUpDown className="size-3 text-muted-foreground/50" />
          )}
        </span>
      </TableHead>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border [-webkit-print-color-adjust:exact] [print-color-adjust:exact]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Jugador</TableHead>
            {COLUMNAS.map((col) => cabecera(col.key, col.label))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordenados.map((j) => {
            const r = recientes.get(j.id);
            return (
              <TableRow key={j.id}>
                <TableCell className="whitespace-nowrap font-medium uppercase">
                  {j.dorsal != null ? `${j.dorsal} · ` : ""}
                  {j.nombre} {j.apellidos}
                  {r && hayRecientes && (
                    <span className="mt-0.5 flex gap-0.5">
                      {r.estados.map((e, i) => (
                        <BloquePartido
                          key={partidosRecientes[i].id}
                          estado={e}
                          titulo={`${nombreCorto(partidosRecientes[i].rival)} (${new Date(
                            `${partidosRecientes[i].fecha}T00:00:00`,
                          ).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })})`}
                        />
                      ))}
                    </span>
                  )}
                </TableCell>
                <TableCell className="tabular-nums">{j.minutosAprox}</TableCell>
                <TableCell className="tabular-nums">{j.convocatorias}</TableCell>
                <TableCell className="tabular-nums">{j.titularidades}</TableCell>
                <TableCell className="tabular-nums">{j.suplencias}</TableCell>
                <TableCell className="font-heading tabular-nums">{j.goles}</TableCell>
                <TableCell className="tabular-nums">{j.asistencias}</TableCell>
                <TableCell className="font-heading tabular-nums">{j.golesAsistencias}</TableCell>
                <TableCell className="tabular-nums">{j.golesEncajados}</TableCell>
                <TableCell className="tabular-nums">{j.tarjetasAmarillas}</TableCell>
                <TableCell className="tabular-nums">{j.tarjetasRojas}</TableCell>
                <TableCell className="tabular-nums">{j.entrenamientosTotales}</TableCell>
                <TableCell className="tabular-nums">{j.entrenamientosAsistidos}</TableCell>
                <TableCell className="tabular-nums">{j.entrenamientosPerdidos}</TableCell>
                <TableCell className="tabular-nums">
                  {j.pctAsistencia != null ? `${j.pctAsistencia}%` : "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
