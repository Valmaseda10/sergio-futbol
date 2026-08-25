import { useMemo } from "react";
import { calcularOnceFinal } from "@/lib/alineacion-final";
import type { LocalAlineacion, LocalEventoPartido } from "@/lib/db/local-db";

interface Jugador {
  id: string;
  nombre: string;
  apellidos: string;
  alias: string | null;
  dorsal: number | null;
}

function nombreCampo(j: Jugador) {
  return j.alias || j.apellidos;
}

export function AlineacionFinal({
  titularesIniciales,
  eventos,
  convocados,
}: {
  titularesIniciales: Pick<
    LocalAlineacion,
    "jugador_id" | "posicion_jugada" | "pos_x" | "pos_y"
  >[];
  eventos: Pick<LocalEventoPartido, "jugador_id" | "tipo" | "minuto">[];
  convocados: Jugador[];
}) {
  const jugadoresPorId = useMemo(
    () => new Map(convocados.map((j) => [j.id, j])),
    [convocados],
  );

  const { titulares, entrantesSinHueco } = useMemo(
    () => calcularOnceFinal(titularesIniciales, eventos),
    [titularesIniciales, eventos],
  );

  if (titularesIniciales.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Define primero el once inicial para poder calcular el que termina el
        partido.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Calculado a partir de los cambios registrados en Eventos (quién entra
        y sale, y en qué minuto). No tiene en cuenta expulsiones.
      </p>

      <div className="relative mx-auto aspect-[2/3] h-[46vh] max-h-[420px] w-auto overflow-hidden rounded-lg bg-pitch">
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/40" />
        <div className="absolute top-1/2 left-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40" />
        <div className="absolute inset-x-[20%] top-0 h-[12%] border-x border-b border-white/40" />
        <div className="absolute inset-x-[20%] bottom-0 h-[12%] border-x border-t border-white/40" />
        <div className="absolute inset-x-[42%] top-0 h-[3%] border-x-2 border-b-2 border-white/70" />
        <div className="absolute inset-x-[42%] bottom-0 h-[3%] border-x-2 border-t-2 border-white/70" />

        {titulares.map((slot) => {
          const jugador = jugadoresPorId.get(slot.jugadorId);
          if (!jugador || slot.posX == null || slot.posY == null) return null;
          return (
            <div
              key={slot.jugadorId}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
              style={{ top: `${slot.posY}%`, left: `${slot.posX}%` }}
            >
              <span className="flex size-9 items-center justify-center rounded-full border-2 border-gold bg-white font-heading text-sm tabular-nums text-foreground shadow">
                {jugador.dorsal ?? jugador.nombre[0]}
              </span>
              <span className="max-w-16 truncate rounded bg-black/40 px-1 text-[10px] text-white">
                {nombreCampo(jugador)}
              </span>
            </div>
          );
        })}
      </div>

      {entrantesSinHueco.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Entraron sin una salida registrada previa (revisa Eventos):{" "}
          {entrantesSinHueco
            .map((id) => jugadoresPorId.get(id))
            .filter((j): j is Jugador => !!j)
            .map(nombreCampo)
            .join(", ")}
        </p>
      )}
    </div>
  );
}
