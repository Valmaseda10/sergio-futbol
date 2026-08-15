"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft } from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { localDb, type LocalValoracionJugador } from "@/lib/db/local-db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function nombreCorto(j: { nombre: string; apellidos: string; alias: string | null }) {
  return j.alias || `${j.nombre} ${j.apellidos.split(" ")[0]}`;
}

export default function CompararJugadoresPage() {
  const jugadores = useLiveQuery(
    () =>
      localDb.jugadores
        .filter((j) => j.activo)
        .toArray()
        .then((rows) => rows.sort((a, b) => a.apellidos.localeCompare(b.apellidos))),
    [],
    [],
  );
  const valoraciones = useLiveQuery(
    () => localDb.valoraciones_jugador.toArray(),
    [],
    [],
  );

  const [idA, setIdA] = useState("");
  const [idB, setIdB] = useState("");

  const ultimaValoracionPorJugador = useMemo(() => {
    const map = new Map<string, LocalValoracionJugador>();
    for (const v of valoraciones
      .slice()
      .sort((a, b) => a.fecha.localeCompare(b.fecha))) {
      map.set(v.jugador_id, v);
    }
    return map;
  }, [valoraciones]);

  const jugadorA = jugadores.find((j) => j.id === idA);
  const jugadorB = jugadores.find((j) => j.id === idB);
  const valA = idA ? ultimaValoracionPorJugador.get(idA) : undefined;
  const valB = idB ? ultimaValoracionPorJugador.get(idB) : undefined;

  const nombreA = jugadorA ? nombreCorto(jugadorA) : "Jugador A";
  const nombreB = jugadorB ? nombreCorto(jugadorB) : "Jugador B";

  const datos = [
    { atributo: "Técnica", [nombreA]: valA?.tecnica ?? 0, [nombreB]: valB?.tecnica ?? 0 },
    { atributo: "Físico", [nombreA]: valA?.fisico ?? 0, [nombreB]: valB?.fisico ?? 0 },
    { atributo: "Táctica", [nombreA]: valA?.tactica ?? 0, [nombreB]: valB?.tactica ?? 0 },
    { atributo: "Actitud", [nombreA]: valA?.actitud ?? 0, [nombreB]: valB?.actitud ?? 0 },
  ];

  const puedeComparar = !!(idA && idB && valA && valB);

  return (
    <div className="space-y-4">
      <Link
        href="/plantilla"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Plantilla
      </Link>

      <h1 className="text-2xl font-semibold">Comparar jugadores</h1>

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

      {!idA || !idB ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Elige dos jugadores para comparar su última valoración.
        </p>
      ) : !valA || !valB ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {!valA && !valB
            ? `${nombreA} y ${nombreB} todavía no tienen valoraciones registradas.`
            : !valA
              ? `${nombreA} todavía no tiene valoraciones registradas.`
              : `${nombreB} todavía no tiene valoraciones registradas.`}
        </p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {nombreA} vs {nombreB}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={datos}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="atributo" fontSize={12} />
                  <PolarRadiusAxis domain={[0, 10]} fontSize={10} />
                  <Radar
                    name={nombreA}
                    dataKey={nombreA}
                    stroke="var(--primary)"
                    fill="var(--primary)"
                    fillOpacity={0.35}
                  />
                  <Radar
                    name={nombreB}
                    dataKey={nombreB}
                    stroke="var(--gold)"
                    fill="var(--gold)"
                    fillOpacity={0.35}
                  />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            {puedeComparar && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Última valoración: {nombreA} ({valA.fecha}) · {nombreB} ({valB.fecha})
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
