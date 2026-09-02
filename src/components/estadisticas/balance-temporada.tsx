import { useMemo } from "react";
import {
  Trophy,
  Target,
  Clock,
  CalendarCheck,
  Users as UsersIcon,
} from "lucide-react";
import type { JugadorStats, ResumenEquipo } from "@/lib/estadisticas";
import { temporadaCorta } from "@/lib/temporada";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function nombreCorto(j: { nombre: string; apellidos: string }) {
  return `${j.nombre} ${j.apellidos}`;
}

interface Dato {
  icon: typeof Trophy;
  etiqueta: string;
  valor: string;
  detalle?: string;
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

    const maxGoleador = statsJugadores
      .filter((j) => j.goles > 0)
      .sort((a, b) => b.goles - a.goles)[0];
    if (maxGoleador) {
      lista.push({
        icon: Target,
        etiqueta: "Máximo goleador",
        valor: nombreCorto(maxGoleador),
        detalle: `${maxGoleador.goles} gol${maxGoleador.goles === 1 ? "" : "es"}`,
      });
    }

    const masMinutos = statsJugadores
      .filter((j) => j.minutosAprox > 0)
      .sort((a, b) => b.minutosAprox - a.minutosAprox)[0];
    if (masMinutos) {
      lista.push({
        icon: Clock,
        etiqueta: "Más minutos jugados",
        valor: nombreCorto(masMinutos),
        detalle: `${masMinutos.minutosAprox} min`,
      });
    }

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

  if (resumen.partidosJugados === 0) return null;

  return (
    <Card className="border-gold/40">
      <CardHeader>
        <CardTitle className="text-base">
          Balance de la temporada {temporadaCorta(temporada)}
        </CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
