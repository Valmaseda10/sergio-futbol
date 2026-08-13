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
                className="cursor-pointer whitespace-nowrap select-none"
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
              <TableCell className="whitespace-nowrap font-medium">
                {j.dorsal != null ? `${j.dorsal} · ` : ""}
                {j.nombre} {j.apellidos}
              </TableCell>
              <TableCell>{j.convocatorias}</TableCell>
              <TableCell>{j.goles}</TableCell>
              <TableCell>{j.asistencias}</TableCell>
              <TableCell>{j.tarjetasAmarillas}</TableCell>
              <TableCell>{j.tarjetasRojas}</TableCell>
              <TableCell>{j.minutosAprox}</TableCell>
              <TableCell>
                {j.pctAsistencia != null ? `${j.pctAsistencia}%` : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
