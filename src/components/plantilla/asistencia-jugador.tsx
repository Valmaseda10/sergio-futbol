"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/local-db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function hoyISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function AsistenciaJugador({ jugadorId }: { jugadorId: string }) {
  const hoy = hoyISO();

  const entrenamientosPasados = useLiveQuery(
    () => localDb.entrenamientos.filter((e) => e.fecha <= hoy).toArray(),
    [hoy],
    [],
  );
  const asistencias = useLiveQuery(
    () =>
      localDb.asistencias_entrenamiento
        .where("jugador_id")
        .equals(jugadorId)
        .toArray(),
    [jugadorId],
    [],
  );
  const estados = useLiveQuery(() => localDb.estados.toArray(), [], []);
  const convocatorias = useLiveQuery(
    () =>
      localDb.convocatorias.where("jugador_id").equals(jugadorId).toArray(),
    [jugadorId],
    [],
  );

  const idsEntrenamientosPasados = useMemo(
    () => new Set(entrenamientosPasados.map((e) => e.id)),
    [entrenamientosPasados],
  );

  const desglose = useMemo(() => {
    const nombrePorEstado = new Map(estados.map((e) => [e.id, e.nombre]));
    const conteos = new Map<string, number>();
    let conEstadoRegistrado = 0;

    for (const a of asistencias) {
      if (!idsEntrenamientosPasados.has(a.entrenamiento_id)) continue;
      if (!a.estado_id) continue;
      const nombre = nombrePorEstado.get(a.estado_id) ?? "Otro";
      // "SI" marca presencia explícita: cuenta como asistido, no como ausencia.
      if (nombre === "SI") continue;
      conEstadoRegistrado += 1;
      conteos.set(nombre, (conteos.get(nombre) ?? 0) + 1);
    }

    const totalPasados = entrenamientosPasados.length;
    const asistidos = Math.max(0, totalPasados - conEstadoRegistrado);

    return {
      totalPasados,
      asistidos,
      porEstado: Array.from(conteos.entries()).sort((a, b) => b[1] - a[1]),
    };
  }, [asistencias, estados, idsEntrenamientosPasados, entrenamientosPasados]);

  const resumenConvocatorias = useMemo(() => {
    const convocado = convocatorias.filter((c) => c.convocado).length;
    const noConvocado = convocatorias.filter((c) => !c.convocado);
    return { convocado, noConvocado };
  }, [convocatorias]);

  if (desglose.totalPasados === 0 && convocatorias.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Asistencia</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {desglose.totalPasados > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-md border p-3 text-center">
              <p className="font-heading text-2xl tabular-nums text-pitch">
                {desglose.asistidos}
              </p>
              <p className="text-xs text-muted-foreground">
                Entrenamientos asistidos
              </p>
            </div>
            {desglose.porEstado.map(([nombre, count]) => (
              <div key={nombre} className="rounded-md border p-3 text-center">
                <p className="font-heading text-2xl tabular-nums">{count}</p>
                <p className="text-xs text-muted-foreground">{nombre}</p>
              </div>
            ))}
          </div>
        )}

        {convocatorias.length > 0 && (
          <div className="space-y-1 border-t pt-3">
            <p className="text-muted-foreground">
              Convocado a {resumenConvocatorias.convocado} de{" "}
              {convocatorias.length} partidos
            </p>
            {resumenConvocatorias.noConvocado.length > 0 && (
              <ul className="list-inside list-disc text-xs text-muted-foreground">
                {resumenConvocatorias.noConvocado.map((c) => (
                  <li key={c.id}>
                    No convocado
                    {c.motivo_no_convocado ? `: ${c.motivo_no_convocado}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
