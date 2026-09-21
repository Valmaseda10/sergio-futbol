"use client";

// Historial de multas de cada jugador (día, motivo y puntos), para poder
// repasarlo con él. Vive en /normas junto al régimen interno; el registro
// rápido de multas está en Inicio.

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/local-db";
import { CATEGORIA_NORMA_LABEL, PUNTOS_CASTIGO } from "@/lib/validations/norma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatearFechaCorta(fecha: string) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function MultasPorJugador() {
  const jugadores = useLiveQuery(
    () =>
      localDb.jugadores
        .filter((j) => j.activo)
        .toArray()
        .then((rows) => rows.sort((a, b) => (a.dorsal ?? 99) - (b.dorsal ?? 99))),
    [],
    [],
  );
  const multas = useLiveQuery(
    () =>
      localDb.multas.toArray().then((rows) => rows.sort((a, b) => b.fecha.localeCompare(a.fecha))),
    [],
    [],
  );

  const grupos = useMemo(() => {
    const porJugador = new Map<string, typeof multas>();
    for (const m of multas) {
      const lista = porJugador.get(m.jugador_id) ?? [];
      lista.push(m);
      porJugador.set(m.jugador_id, lista);
    }
    return jugadores
      .map((j) => ({ jugador: j, multas: porJugador.get(j.id) ?? [] }))
      .filter((g) => g.multas.length > 0);
  }, [jugadores, multas]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Por jugador</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {grupos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin multas registradas todavía.
          </p>
        ) : (
          grupos.map(({ jugador, multas }) => {
            const pendientes = multas
              .filter((m) => !m.resuelta)
              .reduce((acc, m) => acc + m.puntos, 0);
            return (
              <div key={jugador.id}>
                <div className="mb-2 flex items-center gap-2">
                  <p className="text-sm font-medium">
                    {jugador.dorsal != null ? `${jugador.dorsal} · ` : ""}
                    {jugador.nombre} {jugador.apellidos}
                  </p>
                  {pendientes > 0 && (
                    <Badge
                      variant="outline"
                      className={
                        pendientes >= PUNTOS_CASTIGO
                          ? "border-destructive/50 text-destructive"
                          : "text-muted-foreground"
                      }
                    >
                      {pendientes} pts pendientes
                    </Badge>
                  )}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Puntos</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {multas.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatearFechaCorta(m.fecha)}
                        </TableCell>
                        <TableCell>
                          {m.norma}
                          <span className="text-muted-foreground">
                            {" "}
                            · {CATEGORIA_NORMA_LABEL[m.categoria]}
                          </span>
                          {m.notas && (
                            <span className="text-muted-foreground italic">
                              {" "}
                              · {m.notas}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="tabular-nums">{m.puntos}</TableCell>
                        <TableCell>
                          {m.resuelta ? (
                            <span className="text-muted-foreground">Resuelta</span>
                          ) : (
                            <span className="text-destructive">Pendiente</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
