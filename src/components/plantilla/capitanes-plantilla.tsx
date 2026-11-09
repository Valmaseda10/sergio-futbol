"use client";

// Plantilla → Capitanes: quién ha sido capitán y en qué partidos (el capitán de cada partido
// se marca con la "C" de la convocatoria). No confundir con jugadores.es_capitan, que son los
// capitanes del equipo con las multas dobles.

import { useMemo } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft } from "lucide-react";
import { localDb, type LocalPartido } from "@/lib/db/local-db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COMPETICION: Record<string, string> = { liga: "Liga", amistoso: "Amistoso", copa: "Copa" };

function fechaCorta(fecha: string) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function resultado(p: LocalPartido) {
  return p.resultado_favor != null && p.resultado_contra != null
    ? `${p.resultado_favor}-${p.resultado_contra}`
    : null;
}

export function CapitanesPlantilla({ hoy }: { hoy: string }) {
  const jugadores = useLiveQuery(() => localDb.jugadores.toArray(), [], []);
  const partidos = useLiveQuery(() => localDb.partidos.toArray(), [], []);

  const { capitanes, sinCapitan, sinMarcar } = useMemo(() => {
    const porJugador = new Map<string, LocalPartido[]>();
    for (const p of partidos) {
      if (!p.capitan_id) continue;
      porJugador.set(p.capitan_id, [...(porJugador.get(p.capitan_id) ?? []), p]);
    }
    const capitanes = jugadores
      .filter((j) => porJugador.has(j.id))
      .map((j) => ({
        jugador: j,
        partidos: (porJugador.get(j.id) ?? []).sort((a, b) => b.fecha.localeCompare(a.fecha)),
      }))
      .sort(
        (a, b) =>
          b.partidos.length - a.partidos.length ||
          a.jugador.apellidos.localeCompare(b.jugador.apellidos),
      );
    const sinCapitan = jugadores
      .filter((j) => j.activo && !porJugador.has(j.id))
      .sort((a, b) => a.apellidos.localeCompare(b.apellidos));
    // Partidos ya jugados en los que todavía no se ha marcado capitán.
    const sinMarcar = partidos.filter((p) => !p.capitan_id && p.fecha <= hoy).length;
    return { capitanes, sinCapitan, sinMarcar };
  }, [jugadores, partidos, hoy]);

  return (
    <div className="space-y-4">
      <Link
        href="/plantilla"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver a plantilla
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">Capitanes</h1>
        <p className="text-sm text-muted-foreground">
          En qué partidos ha sido capitán cada jugador. El capitán de cada partido se marca con la
          «C» en la convocatoria.
        </p>
      </div>

      {capitanes.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Todavía no hay ningún capitán marcado en los partidos.
        </p>
      ) : (
        <div className="space-y-3">
          {capitanes.map(({ jugador, partidos: lista }) => (
            <Card key={jugador.id}>
              <CardHeader className="flex-row items-center justify-between gap-2">
                <CardTitle className="min-w-0 truncate text-base">
                  <Link href={`/plantilla/${jugador.id}`} className="hover:underline">
                    {jugador.alias || `${jugador.nombre} ${jugador.apellidos}`}
                  </Link>
                </CardTitle>
                <Badge>
                  {lista.length} {lista.length === 1 ? "partido" : "partidos"}
                </Badge>
              </CardHeader>
              <CardContent>
                <ul className="divide-y text-sm">
                  {lista.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-1.5">
                      <Link href={`/partidos/${p.id}`} className="min-w-0 flex-1 hover:underline">
                        <span className="tabular-nums text-muted-foreground">
                          {fechaCorta(p.fecha)}
                        </span>{" "}
                        · {p.local_visitante === "local" ? "vs" : "en"} {p.rival}
                      </Link>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {COMPETICION[p.competicion] ?? p.competicion}
                        {resultado(p) ? ` · ${resultado(p)}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {sinCapitan.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Todavía no han sido capitanes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {sinCapitan.map((j) => j.alias || `${j.nombre} ${j.apellidos}`).join(" · ")}
          </CardContent>
        </Card>
      )}

      {sinMarcar > 0 && (
        <p className="text-xs text-muted-foreground">
          {sinMarcar} {sinMarcar === 1 ? "partido jugado no tiene" : "partidos jugados no tienen"}{" "}
          capitán marcado.
        </p>
      )}
    </div>
  );
}
