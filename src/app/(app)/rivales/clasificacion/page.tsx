"use client";

// Clasificación dinámica de la liga: la tabla con la posición actual de cada equipo y, al elegir
// uno, sus partidos con el resultado (y la posición actual del rival), su racha, sus goles por
// tramos y el cara a cara contra otro equipo.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { diaSemanaDeFecha } from "@/lib/date";
import { fechaHoja } from "@/lib/plan-partido";
import {
  calcularClasificacion,
  calendarioDe,
  dificultadCalendario,
  jugado,
  caraACara,
  claveEquipo,
  nombreMostrado,
  ordinal,
  partidosDeEquipo,
  rivalesComunes,
  type Ambito,
  type FilaClasificacion,
  type PartidoDeEquipo,
  type PartidoLiga,
  type Resultado,
} from "@/lib/clasificacion";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { IntervaloGol } from "@/lib/types/database.types";
import { TRAMOS_GOLES, useGolesPropiosPorTramos } from "@/lib/goles-propios-tramos";

const TRAMOS: { value: IntervaloGol; label: string }[] = [
  { value: "0-15", label: "0'-15'" },
  { value: "15-30", label: "15'-30'" },
  { value: "30-45", label: "30'-45'" },
  { value: "45-60", label: "45'-60'" },
  { value: "60+", label: "60'+" },
];

const COLOR_RESULTADO: Record<Resultado, string> = {
  V: "bg-green-600 text-white",
  E: "bg-amber-500 text-white",
  D: "bg-red-600 text-white",
};

function Chip({ r }: { r: Resultado }) {
  return (
    <span
      className={cn(
        "inline-flex size-5 items-center justify-center rounded text-[11px] font-bold",
        COLOR_RESULTADO[r],
      )}
    >
      {r}
    </span>
  );
}

const esNuestro = (equipo: string) => /leonesa/i.test(equipo);

function nombreEquipoVisto(equipo: string) {
  return esNuestro(equipo) ? "Infantil B (nosotros)" : nombreMostrado(equipo);
}

function hoyIso(): string {
  const d = new Date();
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

function FilaPartido({
  p,
  posiciones,
}: {
  p: PartidoDeEquipo;
  posiciones: Map<string, number>;
}) {
  const pos = posiciones.get(claveEquipo(p.rival));
  return (
    <li className="flex items-center gap-2 py-1.5 text-sm">
      <span className="w-8 shrink-0 text-xs text-muted-foreground">J{p.jornada}</span>
      <span className="min-w-0 flex-1 truncate">
        <span className="text-muted-foreground">{p.local ? "vs" : "@"}</span> {nombreEquipoVisto(p.rival)}
        {pos != null && <span className="ml-1 text-xs text-muted-foreground">({ordinal(pos)})</span>}
        {p.fecha && (
          <span className="ml-2 text-xs text-muted-foreground">
            {diaSemanaDeFecha(p.fecha).slice(0, 3)} {fechaHoja(p.fecha).slice(0, 5)}
          </span>
        )}
      </span>
      <span className="w-12 shrink-0 text-center font-semibold tabular-nums">
        {p.gf}-{p.gc}
      </span>
      <Chip r={p.resultado} />
    </li>
  );
}

export default function ClasificacionPage() {
  const partidos = useLiveQuery(() => localDb.liga_partidos.toArray(), [], []);
  const rivales = useLiveQuery(() => localDb.rivales_scouting.toArray(), [], []);
  const goles = useLiveQuery(() => localDb.rivales_goles_intervalo.toArray(), [], []);
  const nuestros = useGolesPropiosPorTramos();
  const proximo = useLiveQuery(
    async () => {
      const hoy = hoyIso();
      const rows = await localDb.partidos.filter((p) => p.competicion === "liga" && p.fecha >= hoy).toArray();
      return rows.sort((a, b) => a.fecha.localeCompare(b.fecha))[0]?.rival ?? null;
    },
    [],
    null,
  );

  const liga: PartidoLiga[] = partidos;
  const [ambito, setAmbito] = useState<Ambito>("total");
  // La posición de cada equipo (y la del rival en sus partidos) es siempre la de la tabla total.
  const tablaTotal = useMemo(() => calcularClasificacion(liga), [liga]);
  const tabla = useMemo(() => (ambito === "total" ? tablaTotal : calcularClasificacion(liga, ambito)), [liga, ambito, tablaTotal]);
  const posiciones = useMemo(() => new Map(tablaTotal.map((f) => [claveEquipo(f.equipo), f.posicion])), [tablaTotal]);
  const jornadaActual = liga.filter(jugado).reduce((m, p) => Math.max(m, p.jornada), 0);

  const [elegido, setElegido] = useState<string | null>(null);
  const [comparado, setComparado] = useState<string>("");

  // Por defecto: el próximo rival de liga (si está en la tabla) o el líder.
  const porDefecto = useMemo(() => {
    const k = proximo ? claveEquipo(proximo) : null;
    return tablaTotal.find((f) => k && claveEquipo(f.equipo) === k)?.equipo ?? tablaTotal[0]?.equipo ?? null;
  }, [tablaTotal, proximo]);
  const equipo = elegido ?? porDefecto;
  const fila = equipo ? tablaTotal.find((f) => claveEquipo(f.equipo) === claveEquipo(equipo)) : undefined;
  const susPartidos = useMemo(() => (equipo ? partidosDeEquipo(liga, equipo) : []), [liga, equipo]);
  const porJugar = useMemo(() => (equipo ? calendarioDe(liga, equipo) : []), [liga, equipo]);
  const dificultad = useMemo(() => dificultadCalendario(porJugar, tablaTotal), [porJugar, tablaTotal]);

  const rivalFicha = equipo ? rivales.find((r) => claveEquipo(r.nombre) === claveEquipo(equipo)) : undefined;

  // Goles por tramos de un equipo: los nuestros salen de los eventos de la app y los de los rivales de su ficha.
  const tramosDe = (nombre: string): { favor: number[]; contra: number[] } | null => {
    if (esNuestro(nombre)) return { favor: nuestros.favor, contra: nuestros.contra };
    const ficha = rivales.find((r) => claveEquipo(r.nombre) === claveEquipo(nombre));
    if (!ficha) return null;
    const m = new Map(goles.filter((g) => g.rival_id === ficha.id).map((g) => [g.intervalo, g]));
    return {
      favor: TRAMOS_GOLES.map((t) => m.get(t)?.goles_favor ?? 0),
      contra: TRAMOS_GOLES.map((t) => m.get(t)?.goles_contra ?? 0),
    };
  };

  const otro = comparado && equipo && claveEquipo(comparado) !== claveEquipo(equipo) ? comparado : "";
  const directos = equipo && otro ? caraACara(liga, equipo, otro) : [];
  const comunes = equipo && otro ? rivalesComunes(liga, equipo, otro) : [];

  function ultimo(equipoFila: FilaClasificacion): PartidoDeEquipo | null {
    const lista = partidosDeEquipo(liga, equipoFila.equipo);
    return lista[lista.length - 1] ?? null;
  }

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/rivales"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Rivales
        </Link>
        <h1 className="text-2xl font-semibold">Clasificación</h1>
        <p className="text-sm text-muted-foreground">
          1ª Provincial Infantil, grupo León
          {jornadaActual > 0 ? ` · resultados hasta la jornada ${jornadaActual}` : ""}. Toca un equipo para ver sus
          partidos, resultados y cara a cara.
        </p>
      </div>

      {tablaTotal.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Todavía no hay resultados de la liga cargados. Se cargan con la rutina de los lunes (actas de la
          federación).
        </p>
      ) : (
        <>
          <div className="flex gap-1.5">
            {(
              [
                ["total", "Total"],
                ["local", "En casa"],
                ["visitante", "Fuera"],
              ] as const
            ).map(([v, etiqueta]) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmbito(v)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm font-medium",
                  ambito === v ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground",
                )}
              >
                {etiqueta}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                  <th className="w-8 p-2 text-right font-medium">#</th>
                  <th className="p-2 text-left font-medium">Equipo</th>
                  <th className="p-2 text-center font-medium">PJ</th>
                  <th className="p-2 text-center font-medium">G</th>
                  <th className="p-2 text-center font-medium">E</th>
                  <th className="p-2 text-center font-medium">P</th>
                  <th className="hidden p-2 text-center font-medium sm:table-cell">GF</th>
                  <th className="hidden p-2 text-center font-medium sm:table-cell">GC</th>
                  <th className="p-2 text-center font-medium">DG</th>
                  <th className="p-2 text-center font-semibold">Pts</th>
                  <th className="p-2 text-center font-medium" title="Puntos por partido">PPP</th>
                  <th className="p-2 text-center font-medium" title="Partidos con la portería a cero">P0</th>
                  <th className="hidden p-2 text-center font-medium sm:table-cell">Forma</th>
                  <th className="p-2 text-center font-medium sm:hidden">Último</th>
                </tr>
              </thead>
              <tbody>
                {tabla.map((f) => {
                  const u = ultimo(f);
                  const activo = equipo != null && claveEquipo(f.equipo) === claveEquipo(equipo);
                  return (
                    <tr
                      key={f.equipo}
                      onClick={() => setElegido(f.equipo)}
                      className={cn(
                        "cursor-pointer border-b last:border-b-0 hover:bg-muted/50",
                        activo && "bg-primary/10",
                        esNuestro(f.equipo) && "font-semibold",
                      )}
                    >
                      <td className="p-2 text-right tabular-nums text-muted-foreground">{f.posicion}</td>
                      <td className="p-2">{nombreEquipoVisto(f.equipo)}</td>
                      <td className="p-2 text-center tabular-nums">{f.pj}</td>
                      <td className="p-2 text-center tabular-nums">{f.g}</td>
                      <td className="p-2 text-center tabular-nums">{f.e}</td>
                      <td className="p-2 text-center tabular-nums">{f.p}</td>
                      <td className="hidden p-2 text-center tabular-nums sm:table-cell">{f.gf}</td>
                      <td className="hidden p-2 text-center tabular-nums sm:table-cell">{f.gc}</td>
                      <td className="p-2 text-center tabular-nums">{f.dg > 0 ? `+${f.dg}` : f.dg}</td>
                      <td className="p-2 text-center font-semibold tabular-nums">{f.pts}</td>
                      <td className="p-2 text-center tabular-nums">{f.ppp.toFixed(2)}</td>
                      <td className="p-2 text-center tabular-nums">{f.cs}</td>
                      <td className="hidden p-2 sm:table-cell">
                        <span className="inline-flex justify-center gap-0.5">
                          {f.forma.map((r, i) => (
                            <Chip key={i} r={r} />
                          ))}
                        </span>
                      </td>
                      <td className="p-2 sm:hidden">
                        {u && (
                          <span className="inline-flex items-center justify-center gap-1">
                            <span className="text-xs tabular-nums">
                              {u.gf}-{u.gc}
                            </span>
                            <Chip r={u.resultado} />
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            PPP = puntos por partido · P0 = partidos con la portería a cero · Forma = últimos 5 partidos. Ordenada por
            puntos, diferencia de goles y goles a favor (la federación usa antes el enfrentamiento directo, así que en
            empates a puntos puede variar).{ambito !== "total" && " Solo cuenta lo jugado " + (ambito === "local" ? "en casa." : "fuera.")}
          </p>

          {equipo && fila && (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{nombreEquipoVisto(equipo)}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {ordinal(fila.posicion)} de {tablaTotal.length} · {fila.pts} pts · {fila.g}G {fila.e}E {fila.p}P ·{" "}
                    {fila.gf} GF / {fila.gc} GC
                  </p>
                </div>
                {rivalFicha && (
                  <Link
                    href={`/rivales/${rivalFicha.id}`}
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary underline"
                  >
                    Ficha
                    <ExternalLink className="size-3" />
                  </Link>
                )}
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {[
                    ["Pts/partido", fila.ppp.toFixed(2)],
                    ["Goles a favor/p.", fila.pj ? (fila.gf / fila.pj).toFixed(1) : "–"],
                    ["Goles en contra/p.", fila.pj ? (fila.gc / fila.pj).toFixed(1) : "–"],
                    ["Porterías a cero", String(fila.cs)],
                    ["Sin marcar", String(fila.sg)],
                    ["Pts últimos 5", String(fila.ptsForma)],
                  ].map(([etiqueta, valor]) => (
                    <div key={etiqueta} className="rounded-md border p-2 text-center">
                      <p className="text-lg font-semibold tabular-nums">{valor}</p>
                      <p className="text-[11px] leading-tight text-muted-foreground">{etiqueta}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Racha</p>
                  <div className="flex gap-1">
                    {susPartidos.slice(-6).map((p) => (
                      <Chip key={p.id} r={p.resultado} />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Partidos</p>
                  <ul className="divide-y">
                    {susPartidos.map((p) => (
                      <FilaPartido key={p.id} p={p} posiciones={posiciones} />
                    ))}
                  </ul>
                </div>

                {porJugar.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Calendario (lo que le queda)</p>
                    {dificultad && (
                      <p className="mb-1 text-xs text-muted-foreground">
                        {dificultad.partidos} partidos · sus rivales hacen {dificultad.pppRivales.toFixed(2)} pts/partido de
                        media (la liga, {dificultad.pppLiga.toFixed(2)}) y están de media en el puesto{" "}
                        {dificultad.posicionMedia.toFixed(1)}:{" "}
                        <strong>
                          {dificultad.pppRivales > dificultad.pppLiga + 0.15
                            ? "calendario difícil"
                            : dificultad.pppRivales < dificultad.pppLiga - 0.15
                              ? "calendario cómodo"
                              : "calendario normal"}
                        </strong>
                        .
                      </p>
                    )}
                    <ul className="divide-y">
                      {porJugar.map((c) => {
                        const posRival = posiciones.get(claveEquipo(c.rival));
                        const dificil = posRival != null && posRival <= 4;
                        return (
                          <li key={c.id} className="flex items-center gap-2 py-1.5 text-sm">
                            <span className="w-8 shrink-0 text-xs text-muted-foreground">J{c.jornada}</span>
                            <span className="min-w-0 flex-1 truncate">
                              <span className="text-muted-foreground">{c.local ? "vs" : "@"}</span>{" "}
                              {nombreEquipoVisto(c.rival)}
                              {posRival != null && (
                                <span
                                  className={cn(
                                    "ml-1 rounded px-1 text-[11px] font-medium",
                                    dificil ? "bg-red-100 text-red-700" : "text-muted-foreground",
                                  )}
                                >
                                  {ordinal(posRival)}
                                </span>
                              )}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {c.fecha ? `${diaSemanaDeFecha(c.fecha).slice(0, 3)} ${fechaHoja(c.fecha).slice(0, 5)}` : "sin fecha"}
                              {c.hora ? ` · ${c.hora}` : ""}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {tramosDe(equipo) && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      Goles por tramos {esNuestro(equipo) ? "(tus partidos de liga)" : "(ficha del rival)"}
                    </p>
                    <table className="text-sm">
                      <thead>
                        <tr className="text-xs text-muted-foreground">
                          <th className="pr-4 text-left font-medium" />
                          {TRAMOS.map((t) => (
                            <th key={t.value} className="px-2 text-center font-medium">
                              {t.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="pr-4 text-xs text-green-700">A favor</td>
                          {TRAMOS.map((t) => (
                            <td key={t.value} className="px-2 text-center tabular-nums">
                              {tramosDe(equipo)?.favor[TRAMOS.findIndex((x) => x.value === t.value)] ?? 0}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="pr-4 text-xs text-red-700">En contra</td>
                          {TRAMOS.map((t) => (
                            <td key={t.value} className="px-2 text-center tabular-nums">
                              {tramosDe(equipo)?.contra[TRAMOS.findIndex((x) => x.value === t.value)] ?? 0}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Cara a cara</p>
                  <select
                    value={otro}
                    onChange={(e) => setComparado(e.target.value)}
                    aria-label="Comparar con otro equipo"
                    className="h-9 w-full max-w-xs rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="">Comparar con…</option>
                    {tablaTotal
                      .filter((f) => claveEquipo(f.equipo) !== claveEquipo(equipo))
                      .map((f) => (
                        <option key={f.equipo} value={f.equipo}>
                          {ordinal(f.posicion)} · {nombreEquipoVisto(f.equipo)}
                        </option>
                      ))}
                  </select>
                  {otro && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {nombreEquipoVisto(equipo)} contra {nombreEquipoVisto(otro)}
                        </p>
                        {directos.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Todavía no se han enfrentado.</p>
                        ) : (
                          <ul className="divide-y">
                            {directos.map((p) => (
                              <FilaPartido key={p.id} p={p} posiciones={posiciones} />
                            ))}
                          </ul>
                        )}
                      </div>
                      {tramosDe(equipo) && tramosDe(otro) && (
                        <div>
                          <p className="mb-1 text-xs text-muted-foreground">Goles por tramos, lado a lado</p>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs text-muted-foreground">
                                <th className="p-1 text-left font-medium" />
                                <th className="p-1 text-center font-medium" colSpan={2}>
                                  {nombreEquipoVisto(equipo).slice(0, 16)}
                                </th>
                                <th className="border-l p-1 text-center font-medium" colSpan={2}>
                                  {nombreEquipoVisto(otro).slice(0, 16)}
                                </th>
                              </tr>
                              <tr className="text-[11px] text-muted-foreground">
                                <th className="p-1" />
                                <th className="p-1 text-center font-medium text-green-700">+</th>
                                <th className="p-1 text-center font-medium text-red-700">−</th>
                                <th className="border-l p-1 text-center font-medium text-green-700">+</th>
                                <th className="p-1 text-center font-medium text-red-700">−</th>
                              </tr>
                            </thead>
                            <tbody>
                              {TRAMOS.map((t, i) => (
                                <tr key={t.value} className="border-t">
                                  <td className="p-1 text-xs">{t.label}</td>
                                  <td className="p-1 text-center tabular-nums">{tramosDe(equipo)?.favor[i]}</td>
                                  <td className="p-1 text-center tabular-nums">{tramosDe(equipo)?.contra[i]}</td>
                                  <td className="border-l p-1 text-center tabular-nums">{tramosDe(otro)?.favor[i]}</td>
                                  <td className="p-1 text-center tabular-nums">{tramosDe(otro)?.contra[i]}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {comunes.length > 0 && (
                        <div>
                          <p className="mb-1 text-xs text-muted-foreground">Contra rivales comunes</p>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs text-muted-foreground">
                                <th className="p-1 text-left font-medium">Rival</th>
                                <th className="p-1 text-center font-medium">{nombreEquipoVisto(equipo).slice(0, 14)}</th>
                                <th className="p-1 text-center font-medium">{nombreEquipoVisto(otro).slice(0, 14)}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {comunes.map((c) => (
                                <tr key={c.rival} className="border-t">
                                  <td className="p-1">{nombreEquipoVisto(c.rival)}</td>
                                  {[c.deA, c.deB].map((lista, i) => (
                                    <td key={i} className="p-1 text-center">
                                      <span className="inline-flex flex-wrap justify-center gap-1">
                                        {lista.map((p) => (
                                          <span key={p.id} className="inline-flex items-center gap-1">
                                            <span className="text-xs tabular-nums">
                                              {p.gf}-{p.gc}
                                            </span>
                                            <Chip r={p.resultado} />
                                          </span>
                                        ))}
                                      </span>
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
