import type { LocalAlineacion, LocalEventoPartido } from "@/lib/db/local-db";

export interface SlotOnceFinal {
  jugadorId: string;
  posicion: string | null;
  posX: number | null;
  posY: number | null;
}

export interface OnceFinal {
  titulares: SlotOnceFinal[];
  entrantesSinHueco: string[];
}

/**
 * Deduce el once que termina el partido a partir del once inicial y los
 * eventos "cambio_sale"/"cambio_entra" registrados en Eventos, procesados en
 * orden cronológico: cada entrada ocupa el hueco (posición en el campo) que
 * dejó libre la última salida. No contempla expulsiones (tarjeta_roja).
 */
export function calcularOnceFinal(
  titularesIniciales: Pick<
    LocalAlineacion,
    "jugador_id" | "posicion_jugada" | "pos_x" | "pos_y"
  >[],
  eventos: Pick<LocalEventoPartido, "jugador_id" | "tipo" | "minuto">[],
): OnceFinal {
  const lineup = new Map<string, SlotOnceFinal>();
  for (const t of titularesIniciales) {
    lineup.set(t.jugador_id, {
      jugadorId: t.jugador_id,
      posicion: t.posicion_jugada,
      posX: t.pos_x,
      posY: t.pos_y,
    });
  }

  const cambios = eventos
    .filter(
      (e): e is typeof e & { jugador_id: string } =>
        (e.tipo === "cambio_sale" || e.tipo === "cambio_entra") &&
        e.jugador_id != null,
    )
    .slice()
    .sort((a, b) => (a.minuto ?? 0) - (b.minuto ?? 0));

  const vacantes: SlotOnceFinal[] = [];
  const entrantesSinHueco: string[] = [];

  for (const evento of cambios) {
    if (evento.tipo === "cambio_sale") {
      const slot = lineup.get(evento.jugador_id);
      if (slot) {
        lineup.delete(evento.jugador_id);
        vacantes.push(slot);
      }
    } else {
      const vacante = vacantes.shift();
      if (vacante) {
        lineup.set(evento.jugador_id, { ...vacante, jugadorId: evento.jugador_id });
      } else {
        entrantesSinHueco.push(evento.jugador_id);
      }
    }
  }

  return { titulares: Array.from(lineup.values()), entrantesSinHueco };
}
