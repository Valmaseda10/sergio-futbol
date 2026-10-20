"use client";

// Goleadores de la liga y tarjetas (apercibidos y expulsados), con los eventos de las actas de la
// federación. Se puede filtrar por equipo.

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/local-db";
import { nombreMostrado } from "@/lib/clasificacion";
import {
  CICLO_AMARILLAS,
  apercibidos,
  goleadores,
  tarjetas,
  type EventoLiga,
} from "@/lib/liga-jugadores";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RivalesPestanas } from "@/components/rivales/rivales-pestanas";

const esNuestro = (equipo: string) => /leonesa/i.test(equipo);
const nombreEquipoVisto = (equipo: string) => (esNuestro(equipo) ? "Infantil B (nosotros)" : nombreMostrado(equipo));

/** El nombre se deja como viene en el acta ("GONZALEZ HRETE, DANIEL"). */
const nombreJugador = (n: string) => n.trim();

export default function GoleadoresPage() {
  const eventosLocal = useLiveQuery(() => localDb.liga_eventos.toArray(), [], []);
  const eventos: EventoLiga[] = eventosLocal;
  const [equipo, setEquipo] = useState("");

  const equipos = useMemo(
    () => [...new Set(eventos.map((e) => e.equipo))].sort((a, b) => nombreEquipoVisto(a).localeCompare(nombreEquipoVisto(b))),
    [eventos],
  );
  const filtro = equipo || undefined;
  const maximos = useMemo(() => goleadores(eventos, filtro).slice(0, 20), [eventos, filtro]);
  const tarjetados = useMemo(() => tarjetas(eventos, filtro).slice(0, 25), [eventos, filtro]);
  const alLimite = useMemo(() => apercibidos(eventos, filtro), [eventos, filtro]);
  const jornadaMax = eventos.reduce((m, e) => Math.max(m, e.jornada), 0);

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Rivales</h1>
        <RivalesPestanas />
        <p className="text-sm text-muted-foreground">
          Goleadores y tarjetas de la liga con los datos de las actas
          {jornadaMax > 0 ? ` (hasta la jornada ${jornadaMax})` : ""}.
        </p>
      </div>

      {eventos.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Todavía no hay goles ni tarjetas cargados. Se cargan con la rutina de los lunes (actas de la federación).
        </p>
      ) : (
        <>
          <select
            value={equipo}
            onChange={(e) => setEquipo(e.target.value)}
            aria-label="Filtrar por equipo"
            className="h-9 w-full max-w-xs rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">Todos los equipos</option>
            {equipos.map((e) => (
              <option key={e} value={e}>
                {nombreEquipoVisto(e)}
              </option>
            ))}
          </select>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Goleadores</CardTitle>
            </CardHeader>
            <CardContent>
              {maximos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin goles.</p>
              ) : (
                <ol className="divide-y">
                  {maximos.map((g, i) => (
                    <li key={`${g.equipo}|${g.jugador}`} className="flex items-baseline gap-2 py-1.5 text-sm">
                      <span className="w-6 text-right text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate">
                        <span className={cn("font-medium", esNuestro(g.equipo) && "text-primary")}>
                          {nombreJugador(g.jugador)}
                        </span>
                        {!filtro && (
                          <span className="ml-2 text-xs text-muted-foreground">{nombreEquipoVisto(g.equipo)}</span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {g.partidos} {g.partidos === 1 ? "partido" : "partidos"}
                        {g.penaltis > 0 && ` · ${g.penaltis} de penalti`}
                      </span>
                      <span className="w-7 text-right text-base font-semibold tabular-nums">{g.goles}</span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tarjetas</CardTitle>
              <p className="text-xs text-muted-foreground">
                Apercibidos = a una amarilla de la sanción (ciclo de {CICLO_AMARILLAS}). Una roja o una doble amarilla
                son expulsión: en la última jornada puede suponer perderse el siguiente partido.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {alLimite.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-amber-700">Apercibidos</p>
                  <ul className="flex flex-wrap gap-1.5">
                    {alLimite.map((t) => (
                      <li
                        key={`${t.equipo}|${t.jugador}`}
                        className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs"
                      >
                        <span className="font-medium">{nombreJugador(t.jugador)}</span>
                        {!filtro && <span className="text-muted-foreground"> · {nombreEquipoVisto(t.equipo)}</span>}
                        <span className="ml-1 font-semibold">{t.amarillas}🟨</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {tarjetados.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin tarjetas.</p>
              ) : (
                <ul className="divide-y">
                  {tarjetados.map((t) => (
                    <li key={`${t.equipo}|${t.jugador}`} className="flex items-baseline gap-2 py-1.5 text-sm">
                      <span className="min-w-0 flex-1 truncate">
                        <span className={cn("font-medium", esNuestro(t.equipo) && "text-primary")}>
                          {nombreJugador(t.jugador)}
                        </span>
                        {!filtro && (
                          <span className="ml-2 text-xs text-muted-foreground">{nombreEquipoVisto(t.equipo)}</span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">J{t.ultimaJornada}</span>
                      <span className="shrink-0 text-sm font-medium tabular-nums">
                        {t.amarillas > 0 && <span>{t.amarillas}🟨</span>}
                        {t.dobleAmarilla > 0 && <span className="ml-1">{t.dobleAmarilla}🟨🟨</span>}
                        {t.rojas > 0 && <span className="ml-1">{t.rojas}🟥</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
