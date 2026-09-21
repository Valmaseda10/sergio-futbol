"use client";

// Historial de multas de cada jugador (día, motivo y puntos), para poder
// repasarlo con él. Vive en /normas junto al régimen interno; el registro
// rápido de multas está en Inicio.

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { RotateCcw, Trash2 } from "lucide-react";
import {
  eliminarMultaLocal,
  resolverTodasLasMultasLocal,
} from "@/app/(app)/inicio/local-actions";
import { localDb } from "@/lib/db/local-db";
import { capitalizarPrimera } from "@/lib/date";
import { CATEGORIA_NORMA_LABEL, PUNTOS_CASTIGO } from "@/lib/validations/norma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

function mesDeFecha(fecha: string) {
  return fecha.slice(0, 7); // "YYYY-MM"
}

function etiquetaMes(mesKey: string) {
  return capitalizarPrimera(
    new Date(`${mesKey}-01T00:00:00`).toLocaleDateString("es-ES", {
      month: "long",
      year: "numeric",
    }),
  );
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

  const [pendiente, setPendiente] = useState<string | null>(null);
  const [reseteando, setReseteando] = useState(false);

  const hayPendientes = multas.some((m) => !m.resuelta);

  async function handleEliminar(id: string) {
    setPendiente(id);
    await eliminarMultaLocal(id);
    setPendiente(null);
  }

  async function handleResetear() {
    if (
      !window.confirm(
        "Se van a poner a 0 los puntos pendientes de todos los jugadores (el historial no se borra). ¿Continuar?",
      )
    ) {
      return;
    }
    setReseteando(true);
    await resolverTodasLasMultasLocal();
    setReseteando(false);
    toast.success("Puntos del mes reseteados");
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Por jugador</CardTitle>
        {hayPendientes && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={reseteando}
            onClick={handleResetear}
          >
            <RotateCcw className="size-4" />
            Resetear mes
          </Button>
        )}
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

            const porMes = new Map<string, typeof multas>();
            for (const m of multas) {
              const key = mesDeFecha(m.fecha);
              const lista = porMes.get(key) ?? [];
              lista.push(m);
              porMes.set(key, lista);
            }
            const meses = [...porMes.entries()].sort((a, b) =>
              b[0].localeCompare(a[0]),
            );

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
                <div className="space-y-4">
                  {meses.map(([mesKey, multasMes]) => (
                    <div key={mesKey}>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                        {etiquetaMes(mesKey)}
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Motivo</TableHead>
                            <TableHead>Puntos</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="w-10" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {multasMes.map((m) => (
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
                              <TableCell className="tabular-nums">
                                {m.puntos}
                              </TableCell>
                              <TableCell>
                                {m.resuelta ? (
                                  <span className="text-muted-foreground">
                                    Resuelta
                                  </span>
                                ) : (
                                  <span className="text-destructive">
                                    Pendiente
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  disabled={pendiente === m.id}
                                  onClick={() => handleEliminar(m.id)}
                                  aria-label="Eliminar multa"
                                >
                                  <Trash2 className="size-4 text-muted-foreground" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
