import { useMemo } from "react";
import {
  Trophy,
  Target,
  Clock,
  ClockAlert,
  CalendarCheck,
  Users as UsersIcon,
} from "lucide-react";
import type { JugadorStats, ResumenEquipo } from "@/lib/estadisticas";
import { temporadaCorta } from "@/lib/temporada";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function nombreCorto(j: { nombre: string; apellidos: string }) {
  return `${j.nombre} ${j.apellidos}`;
}

function porApellidos(a: JugadorStats, b: JugadorStats) {
  return a.apellidos.localeCompare(b.apellidos);
}

interface Dato {
  icon: typeof Trophy;
  etiqueta: string;
  valor: string;
  detalle?: string;
}

interface RankingItem {
  jugador: JugadorStats;
  valor: string;
}

function RankingLista({
  icon: Icon,
  titulo,
  items,
  vacio,
}: {
  icon: typeof Trophy;
  titulo: string;
  items: RankingItem[];
  vacio: string;
}) {
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" />
        {titulo}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{vacio}</p>
      ) : (
        <ol className="space-y-1">
          {items.map((it, i) => (
            <li
              key={it.jugador.id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="w-4 shrink-0 text-xs tabular-nums text-muted-foreground">
                  {i + 1}
                </span>
                <span className="truncate">
                  {it.jugador.dorsal != null ? `${it.jugador.dorsal} · ` : ""}
                  {nombreCorto(it.jugador)}
                </span>
              </span>
              <span className="shrink-0 font-medium tabular-nums">
                {it.valor}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function BalanceTemporada({
  temporada,
  resumen,
  statsJugadores,
  asistenciaEquipo,
}: {
  temporada: string;
  resumen: ResumenEquipo;
  statsJugadores: JugadorStats[];
  asistenciaEquipo: { fecha: string; pctAsistencia: number }[];
}) {
  const datos = useMemo<Dato[]>(() => {
    const lista: Dato[] = [];

    const diferencia = resumen.golesFavor - resumen.golesContra;
    lista.push({
      icon: Trophy,
      etiqueta: "Balance de partidos",
      valor: `${resumen.victorias}V ${resumen.empates}E ${resumen.derrotas}D`,
      detalle: `${resumen.golesFavor}-${resumen.golesContra} (${diferencia >= 0 ? "+" : ""}${diferencia})`,
    });

    const mejorAsistencia = statsJugadores
      .filter((j) => j.pctAsistencia != null && j.entrenamientosTotales > 0)
      .sort((a, b) => (b.pctAsistencia as number) - (a.pctAsistencia as number))[0];
    if (mejorAsistencia) {
      lista.push({
        icon: UsersIcon,
        etiqueta: "Mejor asistencia",
        valor: nombreCorto(mejorAsistencia),
        detalle: `${mejorAsistencia.pctAsistencia}%`,
      });
    }

    if (asistenciaEquipo.length > 0) {
      const media = Math.round(
        asistenciaEquipo.reduce((acc, a) => acc + a.pctAsistencia, 0) /
          asistenciaEquipo.length,
      );
      lista.push({
        icon: CalendarCheck,
        etiqueta: "Asistencia media del equipo",
        valor: `${media}%`,
        detalle: `en ${asistenciaEquipo.length} entrenamiento${asistenciaEquipo.length === 1 ? "" : "s"}`,
      });
    }

    return lista;
  }, [resumen, statsJugadores, asistenciaEquipo]);

  const maxGoleadores = useMemo<RankingItem[]>(
    () =>
      statsJugadores
        .filter((j) => j.goles > 0)
        .sort((a, b) => b.goles - a.goles || porApellidos(a, b))
        .slice(0, 5)
        .map((j) => ({ jugador: j, valor: `${j.goles}` })),
    [statsJugadores],
  );

  const masMinutos = useMemo<RankingItem[]>(
    () =>
      statsJugadores
        .filter((j) => j.minutosAprox > 0)
        .sort((a, b) => b.minutosAprox - a.minutosAprox || porApellidos(a, b))
        .slice(0, 5)
        .map((j) => ({ jugador: j, valor: `${j.minutosAprox} min` })),
    [statsJugadores],
  );

  const menosMinutos = useMemo<RankingItem[]>(
    () =>
      statsJugadores
        .filter((j) => j.convocatorias > 0)
        .sort((a, b) => a.minutosAprox - b.minutosAprox || porApellidos(a, b))
        .slice(0, 5)
        .map((j) => ({ jugador: j, valor: `${j.minutosAprox} min` })),
    [statsJugadores],
  );

  if (resumen.partidosJugados === 0) return null;

  return (
    <Card className="border-gold/40">
      <CardHeader>
        <CardTitle className="text-base">
          Balance de la temporada {temporadaCorta(temporada)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {datos.map((d) => (
            <div key={d.etiqueta} className="flex items-start gap-3">
              <d.icon className="mt-0.5 size-4 shrink-0 text-gold" />
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">{d.etiqueta}</dt>
                <dd className="truncate text-sm font-medium">
                  {d.valor}
                  {d.detalle && (
                    <span className="ml-1.5 font-normal text-muted-foreground">
                      {d.detalle}
                    </span>
                  )}
                </dd>
              </div>
            </div>
          ))}
        </dl>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <RankingLista
            icon={Target}
            titulo="Máximos goleadores"
            items={maxGoleadores}
            vacio="Todavía no hay goles registrados."
          />
          <RankingLista
            icon={Clock}
            titulo="Más minutos jugados"
            items={masMinutos}
            vacio="Todavía no hay minutos registrados."
          />
          <RankingLista
            icon={ClockAlert}
            titulo="Menos minutos jugados"
            items={menosMinutos}
            vacio="Todavía no hay convocados con minutos que comparar."
          />
        </div>
      </CardContent>
    </Card>
  );
}
