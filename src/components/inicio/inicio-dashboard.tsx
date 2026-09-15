"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
  AlertTriangle,
  CalendarRange,
  Clock,
  Dumbbell,
  MapPin,
  Trophy,
  Users as UsersIcon,
} from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { capitalizarPrimera } from "@/lib/date";
import { marcadorLocalVisitante, resultadoPartido } from "@/lib/estadisticas";
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
import { RecordatoriosPanel } from "@/components/inicio/recordatorios-panel";

function hoyISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function sumarDias(fechaISO: string, dias: number) {
  const d = new Date(`${fechaISO}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Lunes de la semana de "fechaISO" (semana natural, no ISO-8601: si hoy es
// domingo se retrocede 6 días en vez de contarlo como inicio de la
// siguiente semana).
function lunesDeSemana(fechaISO: string) {
  const d = new Date(`${fechaISO}T00:00:00`);
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatearDia(fecha: string) {
  return capitalizarPrimera(
    new Date(`${fecha}T00:00:00`).toLocaleDateString("es-ES", {
      weekday: "long",
    }),
  );
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

  // Agenda de la semana natural en curso (lunes a domingo), entrenamientos y
  // partidos mezclados y ordenados por fecha y hora: así en inicio se ve de
  // un vistazo todo lo que toca esta semana, en el orden en que va a pasar,
  // en vez de solo "el próximo" de cada cosa.
  const semana = useMemo(() => {
    const inicio = lunesDeSemana(hoy);
    const fin = sumarDias(inicio, 6);
    type EventoSemana = {
      tipo: "entrenamiento" | "partido";
      id: string;
      fecha: string;
      hora: string | null;
      titulo: string;
      lugar: string | null;
    };
    const eventos: EventoSemana[] = [
      ...entrenamientos
        .filter((e) => e.fecha >= inicio && e.fecha <= fin)
        .map((e) => ({
          tipo: "entrenamiento" as const,
          id: e.id,
          fecha: e.fecha,
          hora: e.hora_inicio,
          titulo: "Entrenamiento",
          lugar: e.lugar,
        })),
      ...partidos
        .filter((p) => p.fecha >= inicio && p.fecha <= fin)
        .map((p) => ({
          tipo: "partido" as const,
          id: p.id,
          fecha: p.fecha,
          hora: p.hora,
          titulo: `${p.local_visitante === "local" ? "vs" : "@"} ${p.rival}`,
          lugar: p.lugar,
        })),
    ].sort((a, b) =>
      a.fecha === b.fecha
        ? (a.hora ?? "").localeCompare(b.hora ?? "")
        : a.fecha.localeCompare(b.fecha),
    );
    return { inicio, fin, eventos };
  }, [entrenamientos, partidos, hoy]);

  const proximoPartido = useMemo(
    () =>
      partidos
        .filter((p) => p.fecha >= hoy)
        .sort((a, b) => a.fecha.localeCompare(b.fecha))[0] ?? null,
    [partidos, hoy],
  );

  const rivalScoutingProximoPartido = useLiveQuery(
    async () =>
      proximoPartido?.rival_scouting_id
        ? ((await localDb.rivales_scouting.get(proximoPartido.rival_scouting_id)) ??
          null)
        : null,
    [proximoPartido?.rival_scouting_id],
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

    // Un solo listado ordenado por fecha (en vez de primero todos los
    // partidos y luego todos los entrenamientos) para que los avisos salgan
    // en el orden en que van a pasar.
    return [
      ...partidosSinAlineacion.map((p) => ({
        tipo: "partido" as const,
        fecha: p.fecha,
        partido: p,
      })),
      ...entrenamientosSinPlanificar.map((e) => ({
        tipo: "entrenamiento" as const,
        fecha: e.fecha,
        entrenamiento: e,
      })),
    ].sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [partidos, entrenamientos, convocatorias, alineaciones, hoy, limite7, limite14]);

  const hayAvisos = avisos.length > 0;

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

      <RecordatoriosPanel />

      {hayAvisos && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertTriangle className="size-4" />
              Avisos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {avisos.map((a) =>
              a.tipo === "partido" ? (
                <Link
                  key={a.partido.id}
                  href={`/partidos/${a.partido.id}/alineacion`}
                  className="block text-muted-foreground hover:text-foreground"
                >
                  Falta la alineación de{" "}
                  <span className="font-medium">vs {a.partido.rival}</span> (
                  {formatearFecha(a.partido.fecha)})
                </Link>
              ) : (
                <Link
                  key={a.entrenamiento.id}
                  href={`/entrenamientos/${a.entrenamiento.id}/editar`}
                  className="block text-muted-foreground hover:text-foreground"
                >
                  Falta planificar el entrenamiento del{" "}
                  {formatearFecha(a.entrenamiento.fecha)}
                </Link>
              ),
            )}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Esta semana</CardTitle>
          <CardAction>
            <Badge variant="outline">
              {formatearDia(semana.inicio).slice(0, 3)}{" "}
              {new Date(`${semana.inicio}T00:00:00`).getDate()} –{" "}
              {formatearDia(semana.fin).slice(0, 3)}{" "}
              {new Date(`${semana.fin}T00:00:00`).getDate()}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          {semana.eventos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay entrenamientos ni partidos programados esta semana.
            </p>
          ) : (
            <ul className="space-y-3">
              {semana.eventos.map((ev) => (
                <li key={`${ev.tipo}-${ev.id}`}>
                  <Link
                    href={
                      ev.tipo === "entrenamiento"
                        ? `/entrenamientos/${ev.id}`
                        : `/partidos/${ev.id}`
                    }
                    className="flex items-center gap-3 hover:opacity-80"
                  >
                    <FechaTile fecha={ev.fecha} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-sm font-medium">
                        {ev.tipo === "entrenamiento" ? (
                          <Dumbbell className="size-3.5 shrink-0 text-muted-foreground" />
                        ) : (
                          <Trophy className="size-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate">
                          {formatearDia(ev.fecha)} · {ev.titulo}
                        </span>
                      </p>
                      <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                        {ev.hora && (
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {ev.hora.slice(0, 5)}
                          </span>
                        )}
                        {ev.lugar && (
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3" />
                            {ev.lugar}
                          </span>
                        )}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {diasHasta(ev.fecha, hoy)}
                    </Badge>
                  </Link>
                  {ev.tipo === "partido" &&
                    ev.id === proximoPartido?.id &&
                    rivalScoutingProximoPartido && (
                      <Link
                        href={`/rivales/${rivalScoutingProximoPartido.id}`}
                        className="mt-1 ml-14 inline-block text-xs font-medium text-primary hover:underline"
                      >
                        Ver scouting del rival →
                      </Link>
                    )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

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
                const resultado = resultadoPartido(gf, gc);
                const { izquierda, derecha } = marcadorLocalVisitante(
                  gf,
                  gc,
                  p.local_visitante,
                );
                return (
                  <Link
                    key={p.id}
                    href={`/partidos/${p.id}`}
                    title={`${p.local_visitante === "local" ? "vs" : "@"} ${p.rival} · ${izquierda}-${derecha}`}
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white",
                      resultado === "ganado" && "bg-pitch",
                      resultado === "empatado" && "bg-gold",
                      resultado === "perdido" && "bg-destructive",
                    )}
                  >
                    {resultado === "ganado" ? "G" : resultado === "empatado" ? "E" : "P"}
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
