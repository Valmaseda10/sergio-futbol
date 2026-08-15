"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/local-db";
import { DIAS_SEMANA } from "@/lib/validations/entrenamiento";
import { Card, CardContent } from "@/components/ui/card";

const DIA_LABEL: Record<number, string> = Object.fromEntries(
  DIAS_SEMANA.map((d) => [d.value, d.label]),
);
const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0];

function etiquetaDia(dia: number) {
  if (dia === 6) return "Partido (sábado)";
  if (dia === 0) return "Partido (domingo)";
  return DIA_LABEL[dia];
}

export function HorarioSemanalResumen() {
  const horarios = useLiveQuery(
    () =>
      localDb.horario_entrenamiento
        .toArray()
        .then((rows) =>
          rows.sort(
            (a, b) =>
              ORDEN_SEMANA.indexOf(a.dia_semana) -
              ORDEN_SEMANA.indexOf(b.dia_semana),
          ),
        ),
    [],
    [],
  );

  if (horarios.length === 0) return null;

  const entreno = horarios.filter((h) => h.dia_semana >= 1 && h.dia_semana <= 5);
  const partido = horarios.filter((h) => h.dia_semana === 6 || h.dia_semana === 0);

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-6 text-sm">
        {entreno.map((h) => (
          <span key={h.id} className="flex items-baseline gap-1.5">
            <span className="font-medium">{DIA_LABEL[h.dia_semana]}</span>
            {h.hora_inicio && h.hora_fin && (
              <span className="tabular-nums text-muted-foreground">
                {h.hora_inicio.slice(0, 5)}–{h.hora_fin.slice(0, 5)}
              </span>
            )}
          </span>
        ))}
        {partido.length > 0 ? (
          partido.map((h) => (
            <span key={h.id} className="flex items-baseline gap-1.5">
              <span className="font-medium">{etiquetaDia(h.dia_semana)}</span>
              {h.hora_inicio && h.hora_fin && (
                <span className="tabular-nums text-muted-foreground">
                  {h.hora_inicio.slice(0, 5)}–{h.hora_fin.slice(0, 5)}
                </span>
              )}
            </span>
          ))
        ) : (
          <span className="flex items-baseline gap-1.5">
            <span className="font-medium">Partido</span>
            <span className="text-muted-foreground">sábado o domingo</span>
          </span>
        )}
      </CardContent>
    </Card>
  );
}
