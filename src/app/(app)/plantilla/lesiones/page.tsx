"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function formatearFecha(fecha: string | null) {
  if (!fecha) return "—";
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function diasDeBaja(fechaInicio: string, fechaAltaReal: string | null) {
  const inicio = new Date(`${fechaInicio}T00:00:00`);
  const fin = fechaAltaReal ? new Date(`${fechaAltaReal}T00:00:00`) : new Date();
  const ms = fin.getTime() - inicio.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export default function LesionesPage() {
  const lesiones = useLiveQuery(() => localDb.lesiones.toArray(), [], []);
  const jugadores = useLiveQuery(() => localDb.jugadores.toArray(), [], []);

  const jugadoresPorId = useMemo(
    () => new Map(jugadores.map((j) => [j.id, j])),
    [jugadores],
  );

  const ordenadas = useMemo(
    () => lesiones.slice().sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio)),
    [lesiones],
  );

  return (
    <div className="space-y-4">
      <Link
        href="/plantilla"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver a plantilla
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Lesiones</h1>
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href="/plantilla/lesiones/nuevo" />}
        >
          <Plus className="size-4" />
          Nueva
        </Button>
      </div>

      {ordenadas.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No hay lesiones registradas.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {ordenadas.map((l) => {
            const jugador = jugadoresPorId.get(l.jugador_id);
            const activa = !l.fecha_alta_real;
            return (
              <li key={l.id}>
                <Link
                  href={`/plantilla/lesiones/${l.id}`}
                  className="flex items-center gap-3 p-3 hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {jugador ? `${jugador.nombre} ${jugador.apellidos}` : "—"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {l.tipo} · desde {formatearFecha(l.fecha_inicio)} ·{" "}
                      {diasDeBaja(l.fecha_inicio, l.fecha_alta_real)} días
                    </p>
                  </div>
                  <Badge variant={activa ? "destructive" : "outline"}>
                    {activa ? "Activa" : "Recuperado"}
                  </Badge>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
