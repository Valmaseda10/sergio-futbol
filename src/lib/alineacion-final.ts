import type { LocalAlineacion, LocalEventoPartido } from "@/lib/db/local-db";

export interface SlotOnceFinal {
  jugadorId: string | null;
  nombreLibre: string | null;
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
 *
 * Los jugadores "solo por hoy" (sin fila real en `jugadores`, jugador_id
 * null) no pueden ser sustituidos vía Eventos (que solo referencian
 * jugadores reales): pasan tal cual al once final, indexados por el id de
 * su propia fila de alineación para no colisionar entre sí.
 */
export function calcularOnceFinal(
  titularesIniciales: Pick<
    LocalAlineacion,
    "id" | "jugador_id" | "nombre_libre" | "posicion_jugada" | "pos_x" | "pos_y"
  >[],
  eventos: Pick<LocalEventoPartido, "jugador_id" | "tipo" | "minuto">[],
): OnceFinal {
  const lineup = new Map<string, SlotOnceFinal>();
  for (const t of titularesIniciales) {
    const clave = t.jugador_id ?? `libre:${t.id}`;
    lineup.set(clave, {
      jugadorId: t.jugador_id,
      nombreLibre: t.nombre_libre,
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
        lineup.set(evento.jugador_id, {
          ...vacante,
          jugadorId: evento.jugador_id,
          nombreLibre: null,
        });
      } else {
        entrantesSinHueco.push(evento.jugador_id);
      }
    }
  }

  return { titulares: Array.from(lineup.values()), entrantesSinHueco };
}
