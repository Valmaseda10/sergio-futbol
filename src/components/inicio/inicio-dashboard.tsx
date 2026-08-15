"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
  AlertTriangle,
  CalendarRange,
  Clock,
  MapPin,
  Users as UsersIcon,
} from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { capitalizarPrimera } from "@/lib/date";
import { cn } from "@/lib/utils";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FechaTile } from "@/components/ui/fecha-tile";
import { HorarioSemanalResumen } from "@/components/entrenamientos/horario-semanal-resumen";

function hoyISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function sumarDias(fechaISO: string, dias: number) {
  const d = new Date(`${fechaISO}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatearFecha(fecha: string) {
  return capitalizarPrimera(
    new Date(`${fecha}T00:00:00`).toLocaleDateString("es-ES", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    }),
  );
}

function diasDeBaja(fechaInicio: string, hoy: string) {
  const inicio = new Date(`${fechaInicio}T00:00:00`).getTime();
  const fin = new Date(`${hoy}T00:00:00`).getTime();
  return Math.max(0, Math.round((fin - inicio) / 86_400_000));
}

function diasHasta(fechaISO: string, hoy: string) {
  const dias = Math.round(
    (new Date(`${fechaISO}T00:00:00`).getTime() -
      new Date(`${hoy}T00:00:00`).getTime()) /
      86_400_000,
  );
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Mañana";
  return `En ${dias} días`;
}

export function InicioDashboard({
  nombre,
  isAdmin,
  solicitudesPendientes,
}: {
  nombre: string;
  isAdmin: boolean;
  solicitudesPendientes: number;
}) {
  const hoy = hoyISO();
  const limite7 = sumarDias(hoy, 7);
  const limite14 = sumarDias(hoy, 14);

  const entrenamientos = useLiveQuery(
    () => localDb.entrenamientos.toArray(),
    [],
    [],
  );
  const partidos = useLiveQuery(() => localDb.partidos.toArray(), [], []);
  const lesiones = useLiveQuery(() => localDb.lesiones.toArray(), [], []);
  const jugadores = useLiveQuery(() => localDb.jugadores.toArray(), [], []);
  const convocatorias = useLiveQuery(
    () => localDb.convocatorias.filter((c) => c.convocado).toArray(),
    [],
    [],
  );
  const alineaciones = useLiveQuery(
    () => localDb.alineaciones.filter((a) => a.titular).toArray(),
    [],
    [],
  );

  const jugadoresPorId = useMemo(
    () => new Map(jugadores.map((j) => [j.id, j])),
    [jugadores],
  );

  const proximoEntrenamiento = useMemo(
    () =>
      entrenamientos
        .filter((e) => e.fecha >= hoy)
        .sort((a, b) => a.fecha.localeCompare(b.fecha))[0] ?? null,
    [entrenamientos, hoy],
  );

  const proximoPartido = useMemo(
    () =>
      partidos
        .filter((p) => p.fecha >= hoy)
        .sort((a, b) => a.fecha.localeCompare(b.fecha))[0] ?? null,
    [partidos, hoy],
  );

  const ultimosResultados = useMemo(
    () =>
      partidos
        .filter((p) => p.resultado_favor != null && p.resultado_contra != null)
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .slice(-5),
    [partidos],
  );

  const lesionados = useMemo(
    () =>
      lesiones
        .filter((l) => l.fecha_alta_real == null)
        .map((l) => ({ lesion: l, jugador: jugadoresPorId.get(l.jugador_id) }))
        .filter((x) => x.jugador)
        .sort((a, b) => a.lesion.fecha_inicio.localeCompare(b.lesion.fecha_inicio)),
    [lesiones, jugadoresPorId],
  );

  const avisos = useMemo(() => {
    const convocadosPorPartido = new Map<string, number>();
    for (const c of convocatorias) {
      convocadosPorPartido.set(c.partido_id, (convocadosPorPartido.get(c.partido_id) ?? 0) + 1);
    }
    const titularesPorPartido = new Map<string, number>();
    for (const a of alineaciones) {
      titularesPorPartido.set(a.partido_id, (titularesPorPartido.get(a.partido_id) ?? 0) + 1);
    }

    const partidosSinAlineacion = partidos.filter(
      (p) =>
        p.fecha >= hoy &&
        p.fecha <= limite14 &&
        (convocadosPorPartido.get(p.id) ?? 0) > 0 &&
        (titularesPorPartido.get(p.id) ?? 0) === 0,
    );

    const entrenamientosSinPlanificar = entrenamientos.filter(
      (e) => e.fecha >= hoy && e.fecha <= limite7 && !e.objetivos,
    );

    return { partidosSinAlineacion, entrenamientosSinPlanificar };
  }, [partidos, entrenamientos, convocatorias, alineaciones, hoy, limite7, limite14]);

  const hayAvisos =
    avisos.partidosSinAlineacion.length > 0 ||
    avisos.entrenamientosSinPlanificar.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Hola{nombre ? `, ${nombre.split(" ")[0]}` : ""}</h1>
          <p className="text-sm text-muted-foreground">
            {capitalizarPrimera(
              new Date(`${hoy}T00:00:00`).toLocaleDateString("es-ES", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              }),
            )}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={<Link href="/calendario" />}
        >
          <CalendarRange className="size-4" />
          Calendario
        </Button>
      </div>

      {hayAvisos && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertTriangle className="size-4" />
              Avisos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {avisos.partidosSinAlineacion.map((p) => (
              <Link
                key={p.id}
                href={`/partidos/${p.id}/alineacion`}
                className="block text-muted-foreground hover:text-foreground"
              >
                Falta la alineación de <span className="font-medium">vs {p.rival}</span> ({formatearFecha(p.fecha)})
              </Link>
            ))}
            {avisos.entrenamientosSinPlanificar.map((e) => (
              <Link
                key={e.id}
                href={`/entrenamientos/${e.id}/editar`}
                className="block text-muted-foreground hover:text-foreground"
              >
                Falta planificar el entrenamiento del {formatearFecha(e.fecha)}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {isAdmin && solicitudesPendientes > 0 && (
        <Link href="/ajustes">
          <Card className="border-gold/50 bg-gold/5">
            <CardContent className="flex items-center justify-between pt-6 text-sm">
              <span className="font-medium">
                {solicitudesPendientes} solicitud{solicitudesPendientes > 1 ? "es" : ""} de acceso pendiente
                {solicitudesPendientes > 1 ? "s" : ""}
              </span>
              <span className="text-gold">Revisar →</span>
            </CardContent>
          </Card>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próximo entrenamiento</CardTitle>
            {proximoEntrenamiento && (
              <CardAction>
                <Badge variant="outline">
                  {diasHasta(proximoEntrenamiento.fecha, hoy)}
                </Badge>
              </CardAction>
            )}
          </CardHeader>
          <CardContent>
            {proximoEntrenamiento ? (
              <Link
                href={`/entrenamientos/${proximoEntrenamiento.id}`}
                className="flex items-center gap-3 hover:opacity-80"
              >
                <FechaTile fecha={proximoEntrenamiento.fecha} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {formatearFecha(proximoEntrenamiento.fecha)}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                    {proximoEntrenamiento.hora_inicio && (
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {proximoEntrenamiento.hora_inicio.slice(0, 5)}
                      </span>
                    )}
                    {proximoEntrenamiento.lugar && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" />
                        {proximoEntrenamiento.lugar}
                      </span>
                    )}
                  </p>
                </div>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay entrenamientos programados.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próximo partido</CardTitle>
            {proximoPartido && (
              <CardAction>
                <Badge variant="outline">
                  {diasHasta(proximoPartido.fecha, hoy)}
                </Badge>
              </CardAction>
            )}
          </CardHeader>
          <CardContent>
            {proximoPartido ? (
              <Link
                href={`/partidos/${proximoPartido.id}`}
                className="flex items-center gap-3 hover:opacity-80"
              >
                <FechaTile fecha={proximoPartido.fecha} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {proximoPartido.local_visitante === "local" ? "vs" : "@"}{" "}
                    {proximoPartido.rival}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                    {proximoPartido.hora && (
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {proximoPartido.hora.slice(0, 5)}
                      </span>
                    )}
                    {proximoPartido.lugar && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" />
                        {proximoPartido.lugar}
                      </span>
                    )}
                  </p>
                </div>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay partidos programados.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {ultimosResultados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimos resultados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {ultimosResultados.map((p) => {
                const gf = p.resultado_favor as number;
                const gc = p.resultado_contra as number;
                const resultado = gf > gc ? "G" : gf === gc ? "E" : "P";
                return (
                  <Link
                    key={p.id}
                    href={`/partidos/${p.id}`}
                    title={`${p.local_visitante === "local" ? "vs" : "@"} ${p.rival} · ${gf}-${gc}`}
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white",
                      resultado === "G" && "bg-pitch",
                      resultado === "E" && "bg-muted-foreground",
                      resultado === "P" && "bg-destructive",
                    )}
                  >
                    {resultado}
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <HorarioSemanalResumen />

      {lesionados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UsersIcon className="size-4 text-destructive" />
              Jugadores lesionados ({lesionados.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {lesionados.map(({ lesion, jugador }) => (
              <Link
                key={lesion.id}
                href={`/plantilla/${jugador!.id}`}
                className="flex items-center justify-between gap-2 text-sm hover:text-foreground"
              >
                <span className="truncate text-muted-foreground">
                  {jugador!.dorsal != null ? `${jugador!.dorsal} · ` : ""}
                  {jugador!.nombre} {jugador!.apellidos}
                </span>
                <Badge variant="outline" className="shrink-0">
                  {diasDeBaja(lesion.fecha_inicio, hoy)} días
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
