"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { calcularStatsJugadores, type JugadorStats } from "@/lib/estadisticas";
import { temporadaDeFecha } from "@/lib/temporada";
import { useTemporadaSeleccionada } from "@/lib/hooks/use-temporada-seleccionada";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function hoyISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function nombreCorto(j: { nombre: string; apellidos: string }) {
  return `${j.nombre} ${j.apellidos.split(" ")[0]}`;
}

interface FilaComparacion {
  etiqueta: string;
  valorA: number | null;
  valorB: number | null;
  sufijo?: string;
  masEsMejor?: boolean;
}

export default function CompararJugadoresPage() {
  const hoy = hoyISO();
  const { temporada } = useTemporadaSeleccionada();

  const jugadores = useLiveQuery(
    () =>
      localDb.jugadores
        .filter((j) => j.activo)
        .toArray()
        .then((rows) => rows.sort((a, b) => a.apellidos.localeCompare(b.apellidos))),
    [],
    [],
  );
  const partidos = useLiveQuery(() => localDb.partidos.toArray(), [], []);
  const eventos = useLiveQuery(() => localDb.eventos_partido.toArray(), [], []);
  const convocatorias = useLiveQuery(
    () => localDb.convocatorias.filter((c) => c.convocado).toArray(),
    [],
    [],
  );
  const alineaciones = useLiveQuery(
    () => localDb.alineaciones.toArray(),
    [],
    [],
  );
  const entrenamientos = useLiveQuery(
    () => localDb.entrenamientos.toArray(),
    [],
    [],
  );
  const asistencias = useLiveQuery(
    () => localDb.asistencias_entrenamiento.toArray(),
    [],
    [],
  );
  const estados = useLiveQuery(() => localDb.estados.toArray(), [], []);

  const partidosTemporada = useMemo(
    () => partidos.filter((p) => temporadaDeFecha(p.fecha) === temporada),
    [partidos, temporada],
  );
  const partidoIdsTemporada = useMemo(
    () => new Set(partidosTemporada.map((p) => p.id)),
    [partidosTemporada],
  );
  const eventosTemporada = useMemo(
    () => eventos.filter((e) => partidoIdsTemporada.has(e.partido_id)),
    [eventos, partidoIdsTemporada],
  );
  const convocatoriasTemporada = useMemo(
    () => convocatorias.filter((c) => partidoIdsTemporada.has(c.partido_id)),
    [convocatorias, partidoIdsTemporada],
  );
  const alineacionesTemporada = useMemo(
    () => alineaciones.filter((a) => partidoIdsTemporada.has(a.partido_id)),
    [alineaciones, partidoIdsTemporada],
  );
  const entrenamientosTemporada = useMemo(
    () => entrenamientos.filter((e) => temporadaDeFecha(e.fecha) === temporada),
    [entrenamientos, temporada],
  );
  const entrenamientoIdsTemporada = useMemo(
    () => new Set(entrenamientosTemporada.map((e) => e.id)),
    [entrenamientosTemporada],
  );
  const asistenciasConNombre = useMemo(() => {
    const nombrePorEstado = new Map(estados.map((e) => [e.id, e.nombre]));
    return asistencias
      .filter((a) => a.estado_id && entrenamientoIdsTemporada.has(a.entrenamiento_id))
      .map((a) => ({
        entrenamiento_id: a.entrenamiento_id,
        jugador_id: a.jugador_id,
        estado_nombre: nombrePorEstado.get(a.estado_id as string) ?? "",
      }));
  }, [asistencias, estados, entrenamientoIdsTemporada]);

  const stats = useMemo(
    () =>
      calcularStatsJugadores(
        jugadores,
        eventosTemporada,
        convocatoriasTemporada,
        alineacionesTemporada,
        entrenamientosTemporada,
        asistenciasConNombre,
        hoy,
      ),
    [
      jugadores,
      eventosTemporada,
      convocatoriasTemporada,
      alineacionesTemporada,
      entrenamientosTemporada,
      asistenciasConNombre,
      hoy,
    ],
  );
  const statsPorId = useMemo(
    () => new Map(stats.map((s) => [s.id, s] as [string, JugadorStats])),
    [stats],
  );

  const [idA, setIdA] = useState("");
  const [idB, setIdB] = useState("");

  const jugadorA = jugadores.find((j) => j.id === idA);
  const jugadorB = jugadores.find((j) => j.id === idB);
  const statA = idA ? statsPorId.get(idA) : undefined;
  const statB = idB ? statsPorId.get(idB) : undefined;

  const nombreA = jugadorA ? nombreCorto(jugadorA) : "Jugador A";
  const nombreB = jugadorB ? nombreCorto(jugadorB) : "Jugador B";

  const filas: FilaComparacion[] =
    statA && statB
      ? [
          { etiqueta: "Goles", valorA: statA.goles, valorB: statB.goles },
          {
            etiqueta: "Asistencias",
            valorA: statA.asistencias,
            valorB: statB.asistencias,
          },
          {
            etiqueta: "Partidos convocado",
            valorA: statA.convocatorias,
            valorB: statB.convocatorias,
          },
          {
            etiqueta: "Titularidades",
            valorA: statA.titularidades,
            valorB: statB.titularidades,
          },
          {
            etiqueta: "Suplencias",
            valorA: statA.suplencias,
            valorB: statB.suplencias,
          },
          {
            etiqueta: "Minutos jugados (aprox.)",
            valorA: statA.minutosAprox,
            valorB: statB.minutosAprox,
          },
          {
            etiqueta: "% asistencia a entrenamientos",
            valorA: statA.pctAsistencia,
            valorB: statB.pctAsistencia,
            sufijo: "%",
          },
          {
            etiqueta: "Tarjetas amarillas",
            valorA: statA.tarjetasAmarillas,
            valorB: statB.tarjetasAmarillas,
            masEsMejor: false,
          },
          {
            etiqueta: "Tarjetas rojas",
            valorA: statA.tarjetasRojas,
            valorB: statB.tarjetasRojas,
            masEsMejor: false,
          },
        ]
      : [];

  return (
    <div className="space-y-4">
      <Link
        href="/plantilla"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Plantilla
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">Comparar jugadores</h1>
        <p className="text-xs text-muted-foreground">
          Temporada {temporada.replace("-", "/")}
        </p>
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-3 pt-6">
          <Select value={idA} onValueChange={(v) => v && setIdA(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Jugador A">
                {(value) => {
                  const j = jugadores.find((x) => x.id === value);
                  return j ? nombreCorto(j) : "Jugador A";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {jugadores.map((j) => (
                <SelectItem key={j.id} value={j.id}>
                  {j.dorsal != null ? `${j.dorsal} · ` : ""}
                  {j.nombre} {j.apellidos}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={idB} onValueChange={(v) => v && setIdB(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Jugador B">
                {(value) => {
                  const j = jugadores.find((x) => x.id === value);
                  return j ? nombreCorto(j) : "Jugador B";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {jugadores.map((j) => (
                <SelectItem key={j.id} value={j.id}>
                  {j.dorsal != null ? `${j.dorsal} · ` : ""}
                  {j.nombre} {j.apellidos}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {!statA || !statB ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Elige dos jugadores para comparar sus estadísticas de la temporada.
        </p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {nombreA} vs {nombreB}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="p-3 text-left font-medium">{nombreA}</th>
                  <th className="p-3 text-center font-medium">Estadística</th>
                  <th className="p-3 text-right font-medium">{nombreB}</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => {
                  const a = f.valorA;
                  const b = f.valorB;
                  const masEsMejor = f.masEsMejor ?? true;
                  const aGana =
                    a != null &&
                    b != null &&
                    a !== b &&
                    (masEsMejor ? a > b : a < b);
                  const bGana =
                    a != null &&
                    b != null &&
                    a !== b &&
                    (masEsMejor ? b > a : b < a);
                  return (
                    <tr key={f.etiqueta} className="border-b last:border-0">
                      <td
                        className={cn(
                          "p-3 text-left tabular-nums",
                          aGana && "font-semibold text-primary",
                        )}
                      >
                        {a ?? "—"}
                        {a != null && f.sufijo}
                      </td>
                      <td className="p-3 text-center text-xs text-muted-foreground">
                        {f.etiqueta}
                      </td>
                      <td
                        className={cn(
                          "p-3 text-right tabular-nums",
                          bGana && "font-semibold text-primary",
                        )}
                      >
                        {b ?? "—"}
                        {b != null && f.sufijo}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
