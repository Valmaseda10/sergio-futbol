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

type Columna = Exclude<keyof JugadorStats, "id" | "nombre" | "apellidos">;

const COLUMNAS: { key: Columna; label: string }[] = [
  { key: "convocatorias", label: "Convoc." },
  { key: "goles", label: "Goles" },
  { key: "asistencias", label: "Asist." },
  { key: "tarjetasAmarillas", label: "TA" },
  { key: "tarjetasRojas", label: "TR" },
  { key: "minutosAprox", label: "Min. aprox." },
  { key: "entrenamientosTotales", label: "Entrenos" },
  { key: "entrenamientosAsistidos", label: "Asistió" },
  { key: "entrenamientosPerdidos", label: "Perdió" },
  { key: "pctAsistencia", label: "% Entreno" },
];

export function JugadoresTable({ jugadores }: { jugadores: JugadorStats[] }) {
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

  const ordenados = useMemo(() => {
    return [...jugadores].sort((a, b) => {
      const va = a[orden] ?? -1;
      const vb = b[orden] ?? -1;
      return ascendente ? va - vb : vb - va;
    });
  }, [jugadores, orden, ascendente]);

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Jugador</TableHead>
            {COLUMNAS.map((col) => (
              <TableHead
                key={col.key}
                className={
                  "cursor-pointer whitespace-nowrap select-none" +
                  (orden === col.key ? " text-primary" : "")
                }
                onClick={() => handleSort(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {orden === col.key ? (
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
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordenados.map((j) => (
            <TableRow key={j.id}>
              <TableCell className="whitespace-nowrap font-medium uppercase">
                {j.dorsal != null ? `${j.dorsal} · ` : ""}
                {j.nombre} {j.apellidos}
              </TableCell>
              <TableCell className="tabular-nums">{j.convocatorias}</TableCell>
              <TableCell className="font-heading tabular-nums">{j.goles}</TableCell>
              <TableCell className="tabular-nums">{j.asistencias}</TableCell>
              <TableCell className="tabular-nums">{j.tarjetasAmarillas}</TableCell>
              <TableCell className="tabular-nums">{j.tarjetasRojas}</TableCell>
              <TableCell className="tabular-nums">{j.minutosAprox}</TableCell>
              <TableCell className="tabular-nums">{j.entrenamientosTotales}</TableCell>
              <TableCell className="tabular-nums">{j.entrenamientosAsistidos}</TableCell>
              <TableCell className="tabular-nums">{j.entrenamientosPerdidos}</TableCell>
              <TableCell className="tabular-nums">
                {j.pctAsistencia != null ? `${j.pctAsistencia}%` : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
