"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronRight, Plus } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatearFecha(fecha: string) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function LesionesJugador({ jugadorId }: { jugadorId: string }) {
  const lesiones = useLiveQuery(
    () => localDb.lesiones.where("jugador_id").equals(jugadorId).toArray(),
    [jugadorId],
    [],
  );

  const ordenadas = useMemo(
    () => lesiones.slice().sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio)),
    [lesiones],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Lesiones</CardTitle>
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={<Link href={`/plantilla/lesiones/nuevo?jugadorId=${jugadorId}`} />}
        >
          <Plus className="size-4" />
          Nueva
        </Button>
      </CardHeader>
      <CardContent>
        {ordenadas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay lesiones registradas para este jugador.
          </p>
        ) : (
          <ul className="divide-y">
            {ordenadas.map((l) => {
              const activa = !l.fecha_alta_real;
              return (
                <li key={l.id}>
                  <Link
                    href={`/plantilla/lesiones/${l.id}`}
                    className="flex items-center gap-3 py-2 hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{l.tipo}</p>
                      <p className="text-xs text-muted-foreground">
                        desde {formatearFecha(l.fecha_inicio)}
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
      </CardContent>
    </Card>
  );
}
