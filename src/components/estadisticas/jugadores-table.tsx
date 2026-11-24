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

type Columna =
  | Exclude<keyof JugadorStats, "id" | "nombre" | "apellidos">
  | "titRecientes"
  | "supRecientes";

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

function CeldaPartido({ estado, titulo }: { estado: EstadoPartido; titulo: string }) {
  if (estado === "no") {
    return (
      <span
        title={`${titulo}: no convocado`}
        className="mx-auto flex size-5 items-center justify-center rounded-sm bg-muted text-[10px] text-muted-foreground/50"
      >
        ·
      </span>
    );
  }
  const titular = estado === "titular";
  return (
    <span
      title={`${titulo}: ${titular ? "titular" : "suplente"}`}
      className={`mx-auto flex size-5 items-center justify-center rounded-sm text-[11px] font-bold text-white ${
        titular ? "bg-green-600" : "bg-red-500"
      }`}
    >
      {titular ? "T" : "S"}
    </span>
  );
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
      if (orden === "titRecientes") return recientes.get(j.id)?.titRecientes ?? 0;
      if (orden === "supRecientes") return recientes.get(j.id)?.supRecientes ?? 0;
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
          (col === "titRecientes" || col === "supRecientes" ? " px-1.5" : "") +
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
            {hayRecientes && (
              <>
                {partidosRecientes.map((p) => (
                  <TableHead key={p.id} className="w-6 px-0.5 text-center align-bottom">
                    <span className="mx-auto block max-w-[3rem] truncate text-[10px] leading-tight">
                      {nombreCorto(p.rival)}
                    </span>
                    <span className="block text-[10px] font-normal text-muted-foreground">
                      {new Date(`${p.fecha}T00:00:00`).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </span>
                  </TableHead>
                ))}
                {cabecera("titRecientes", "T")}
                {cabecera("supRecientes", "S")}
              </>
            )}
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
                </TableCell>
                {hayRecientes && r && (
                  <>
                    {r.estados.map((e, i) => (
                      <TableCell key={partidosRecientes[i].id} className="w-6 px-0.5">
                        <CeldaPartido
                          estado={e}
                          titulo={nombreCorto(partidosRecientes[i].rival)}
                        />
                      </TableCell>
                    ))}
                    <TableCell className="px-1.5 font-heading tabular-nums text-green-700">
                      {r.titRecientes}
                    </TableCell>
                    <TableCell className="px-1.5 font-heading tabular-nums text-red-600">
                      {r.supRecientes}
                    </TableCell>
                  </>
                )}
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
