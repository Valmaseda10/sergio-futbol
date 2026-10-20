"use client";

// Aviso de los jugadores de un equipo que pueden faltar o están al límite de tarjetas, con las actas de la
// liga: expulsados en su último partido (posible sanción) y apercibidos (a una amarilla del ciclo).
// No pinta nada si no hay datos o nadie está en esa situación.

import { useLiveQuery } from "dexie-react-hooks";
import { OctagonAlert } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { partidosDeEquipo } from "@/lib/clasificacion";
import { CICLO_AMARILLAS, apercibidos, expulsadosUltimoPartido } from "@/lib/liga-jugadores";
import { cn } from "@/lib/utils";

interface Props {
  /** Nombre del equipo, como en el partido o en la liga (se compara sin comillas ni mayúsculas). */
  equipo: string;
  className?: string;
}

export function SancionadosRival({ equipo, className }: Props) {
  const datos = useLiveQuery(async () => {
    const [partidos, eventos] = await Promise.all([localDb.liga_partidos.toArray(), localDb.liga_eventos.toArray()]);
    return { partidos, eventos };
  }, []);
  if (!datos || datos.eventos.length === 0) return null;

  const jugados = partidosDeEquipo(datos.partidos, equipo);
  const ultima = jugados.reduce((m, p) => Math.max(m, p.jornada), 0);
  const expulsados = ultima > 0 ? expulsadosUltimoPartido(datos.eventos, equipo, ultima) : [];
  const alLimite = apercibidos(datos.eventos, equipo);
  if (expulsados.length === 0 && alLimite.length === 0) return null;

  return (
    <div className={cn("space-y-1.5 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm", className)}>
      <p className="flex items-center gap-1.5 font-medium text-amber-900">
        <OctagonAlert className="size-4" /> Tarjetas del rival
      </p>
      {expulsados.length > 0 && (
        <p>
          <span className="font-medium text-red-700">Expulsados en su último partido (J{ultima}), posible sanción: </span>
          {expulsados.map((t) => t.jugador).join(", ")}
        </p>
      )}
      {alLimite.length > 0 && (
        <p>
          <span className="font-medium">A una amarilla de la sanción ({CICLO_AMARILLAS} del ciclo): </span>
          {alLimite.map((t) => `${t.jugador} (${t.amarillas}🟨)`).join(", ")}
        </p>
      )}
    </div>
  );
}
