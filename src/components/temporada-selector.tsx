"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/local-db";
import { useTemporadaSeleccionada } from "@/lib/hooks/use-temporada-seleccionada";
import { temporadasDisponibles } from "@/lib/temporada";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TemporadaSelector({ className }: { className?: string }) {
  const { temporada, seleccionar, temporadaActual } = useTemporadaSeleccionada();
  const entrenamientos = useLiveQuery(
    () => localDb.entrenamientos.toArray(),
    [],
    [],
  );
  const partidos = useLiveQuery(() => localDb.partidos.toArray(), [], []);

  const opciones = useMemo(() => {
    const disponibles = temporadasDisponibles([
      ...entrenamientos.map((e) => e.fecha),
      ...partidos.map((p) => p.fecha),
    ]);
    return disponibles.includes(temporadaActual)
      ? disponibles
      : [temporadaActual, ...disponibles];
  }, [entrenamientos, partidos, temporadaActual]);

  return (
    <Select value={temporada} onValueChange={(v) => v && seleccionar(v)}>
      <SelectTrigger className={cn("w-36", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {opciones.map((t) => (
          <SelectItem key={t} value={t}>
            {t.replace("-", "/")}
            {t === temporadaActual ? " (actual)" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
