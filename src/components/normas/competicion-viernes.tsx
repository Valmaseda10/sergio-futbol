"use client";

// Competición de los viernes: tabla como la del Excel (una columna por jugador; por cada ronda, una
// fila de pierna derecha, otra de izquierda y otra de penalti) con los puntos calculados solos y la
// clasificación del día y la acumulada de todos los viernes.

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { ponerTiroViernesLocal } from "@/app/(app)/normas/competicion-actions";
import {
  TIPOS_TIRO,
  resumirViernes,
  ultimoViernes,
  type TipoTiro,
  type TiroViernes,
} from "@/lib/competicion-viernes";
import { DEMARCACION_ORDEN, demarcacionDePosicion } from "@/lib/posiciones";
import { fechaHoja } from "@/lib/plan-partido";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const RONDAS_INICIALES = 10;

type Vista = "dia" | "acumulado";

export function CompeticionViernes() {
  const jugadores = useLiveQuery(
    () =>
      localDb.jugadores
        .filter((j) => j.activo)
        .toArray()
        .then((rows) => {
          const rango = (posicion: string | null) => {
            const dem = demarcacionDePosicion(posicion);
            const i = dem ? DEMARCACION_ORDEN.indexOf(dem) : DEMARCACION_ORDEN.length;
            return i < 0 ? DEMARCACION_ORDEN.length : i;
          };
          return rows.sort((a, b) => rango(a.posicion) - rango(b.posicion) || a.apellidos.localeCompare(b.apellidos));
        }),
    [],
    [],
  );
  const todos = useLiveQuery(() => localDb.competicion_viernes.toArray(), [], []);

  const [fecha, setFecha] = useState(ultimoViernes());
  const [vista, setVista] = useState<Vista>("dia");
  const [rondasExtra, setRondasExtra] = useState(0);

  const nombreCorto = (id: string) => {
    const j = jugadores.find((x) => x.id === id);
    return j ? j.alias || j.nombre : "—";
  };

  const delDia = useMemo(() => todos.filter((t) => t.fecha === fecha), [todos, fecha]);
  const porClave = useMemo(
    () => new Map(delDia.map((t) => [`${t.ronda}|${t.jugador_id}|${t.tipo}`, t])),
    [delDia],
  );
  const rondas = Math.max(RONDAS_INICIALES, rondasExtra, ...delDia.map((t) => t.ronda));
  const fechasConDatos = useMemo(
    () => [...new Set(todos.map((t) => t.fecha))].sort((a, b) => b.localeCompare(a)),
    [todos],
  );

  const resumenDia = useMemo(() => resumirViernes(delDia as TiroViernes[]), [delDia]);
  const resumenAcumulado = useMemo(() => resumirViernes(todos as TiroViernes[]), [todos]);
  const resumen = vista === "dia" ? resumenDia : resumenAcumulado;
  const ranking = useMemo(
    () =>
      jugadores
        .map((j) => resumen.get(j.id) ?? { jugador_id: j.id, puntos: 0, aciertos: 0, dobles: 0 })
        .filter((r) => r.aciertos > 0)
        .sort((a, b) => b.puntos - a.puntos || b.aciertos - a.aciertos),
    [jugadores, resumen],
  );

  // Vacía (falló) -> 1 punto (pierna dominante) -> 2 puntos (pierna menos dominante) -> vacía.
  function tocar(ronda: number, jugadorId: string, tipo: TipoTiro) {
    const actual = porClave.get(`${ronda}|${jugadorId}|${tipo}`)?.puntos;
    const siguiente = actual === undefined ? 1 : actual === 1 ? 2 : null;
    void ponerTiroViernesLocal(fecha, ronda, jugadorId, tipo, siguiente);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Competición de los viernes</CardTitle>
        <p className="text-sm text-muted-foreground">
          Cada ronda, cada jugador tira una falta desde el perfil derecho, otra desde el perfil izquierdo (mirando a la
          portería) y un penalti. Si falla, la casilla se deja vacía. Meter con su pierna dominante vale 1 punto y con
          la <strong>menos dominante</strong>, 2.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label htmlFor="viernes-fecha" className="text-xs text-muted-foreground">
              Viernes
            </label>
            <Input
              id="viernes-fecha"
              type="date"
              value={fecha}
              onChange={(e) => e.target.value && setFecha(e.target.value)}
              className="w-44"
            />
          </div>
          {fechasConDatos.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {fechasConDatos.slice(0, 6).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setFecha(f);
                    setVista("dia");
                  }}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium",
                    f === fecha ? "border-primary bg-primary text-primary-foreground" : "bg-background",
                  )}
                >
                  {fechaHoja(f).slice(0, 5)}
                </button>
              ))}
            </div>
          )}
          <div className="ml-auto flex gap-1.5">
            {(
              [
                ["dia", "Este viernes"],
                ["acumulado", "Acumulado"],
              ] as const
            ).map(([v, etiqueta]) => (
              <button
                key={v}
                type="button"
                onClick={() => setVista(v)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm font-medium",
                  vista === v ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground",
                )}
              >
                {etiqueta}
              </button>
            ))}
          </div>
        </div>

        {/* Clasificación */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            {vista === "dia" ? `Clasificación del ${fechaHoja(fecha)}` : `Clasificación acumulada (${fechasConDatos.length} viernes)`}
          </p>
          {ranking.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay tiros apuntados.</p>
          ) : (
            <ol className="grid gap-x-6 gap-y-0.5 sm:grid-cols-2">
              {ranking.map((r, i) => (
                <li key={r.jugador_id} className="flex items-baseline gap-2 border-b py-1 text-sm">
                  <span className="w-5 text-right text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{nombreCorto(r.jugador_id)}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {r.aciertos} {r.aciertos === 1 ? "acierto" : "aciertos"}
                    {r.dobles > 0 && ` · ${r.dobles}×2`}
                  </span>
                  <span className="w-8 text-right text-base font-semibold tabular-nums">{r.puntos}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Tabla del día, como el Excel */}
        {vista === "dia" && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Toca una casilla: 1 punto (metió con su pierna dominante) → 2 puntos (con la menos dominante, en naranja) →
              vacía (falló). Debajo de cada nombre está su pierna dominante (D = derecha, I = izquierda).
            </p>
            <div className="overflow-x-auto rounded-md border">
              <table className="border-collapse text-center text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="sticky left-0 z-10 min-w-24 bg-muted p-1.5 text-left font-medium">Ronda</th>
                    {jugadores.map((j) => (
                      <th key={j.id} className="min-w-12 p-1.5 font-semibold">
                        {j.alias || j.nombre}
                        <span className="block text-[10px] font-normal text-muted-foreground">
                          {j.pierna_dominante === "derecha" ? "D" : j.pierna_dominante === "izquierda" ? "I" : "–"}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: rondas }, (_, r) => r + 1).flatMap((ronda) =>
                    TIPOS_TIRO.map((tipo, k) => (
                      <tr key={`${ronda}-${tipo.value}`} className={cn(k === 0 && "border-t-2 border-border")}>
                        <th
                          scope="row"
                          className="sticky left-0 z-10 bg-background p-1.5 text-left font-medium whitespace-nowrap"
                        >
                          <span className="inline-block w-5 text-muted-foreground">{k === 0 ? ronda : ""}</span>
                          {tipo.corto}
                        </th>
                        {jugadores.map((j) => {
                          const t = porClave.get(`${ronda}|${j.id}|${tipo.value}`);
                          const p = t ? t.puntos : null;
                          return (
                            <td key={j.id} className="border-l p-0">
                              <button
                                type="button"
                                onClick={() => tocar(ronda, j.id, tipo.value)}
                                aria-label={`${j.alias || j.nombre}, ronda ${ronda}, ${tipo.label}`}
                                className={cn(
                                  "flex h-9 w-full items-center justify-center text-sm font-semibold tabular-nums",
                                  p === null && "text-transparent hover:bg-muted",
                                  p === 1 && "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
                                  p === 2 && "bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100",
                                )}
                              >
                                {p === null ? "·" : p}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    )),
                  )}
                  <tr className="border-t-2 border-border bg-muted/50 font-semibold">
                    <th scope="row" className="sticky left-0 z-10 bg-muted p-1.5 text-left">
                      TOTAL
                    </th>
                    {jugadores.map((j) => (
                      <td key={j.id} className="border-l p-1.5 text-sm tabular-nums">
                        {resumenDia.get(j.id)?.puntos ?? 0}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => setRondasExtra(rondas + 1)}>
              <Plus className="size-4" />
              Añadir ronda
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
