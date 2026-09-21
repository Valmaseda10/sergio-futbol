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
 * null) se pueden dar de baja igual que uno real: como no tienen jugador_id
 * con el que referenciar el evento (eventos_partido solo admite jugadores
 * reales por FK), su cambio_sale/cambio_entra se guarda con nombre_libre y
 * se busca por nombre en vez de por id. También pueden entrar como
 * incorporación (p.ej. un jugador a prueba que llega tarde y no estaba en
 * el once inicial ni en el banquillo de convocados reales).
 */
export function calcularOnceFinal(
  titularesIniciales: Pick<
    LocalAlineacion,
    "id" | "jugador_id" | "nombre_libre" | "posicion_jugada" | "pos_x" | "pos_y"
  >[],
  eventos: Pick<
    LocalEventoPartido,
    "id" | "jugador_id" | "nombre_libre" | "tipo" | "minuto"
  >[],
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
      (e) =>
        (e.tipo === "cambio_sale" || e.tipo === "cambio_entra") &&
        (e.jugador_id != null || e.nombre_libre != null),
    )
    .slice()
    .sort((a, b) => {
      const diff = (a.minuto ?? 0) - (b.minuto ?? 0);
      if (diff !== 0) return diff;
      // A igual minuto (típico: un cambio registrado como par sale/entra en
      // el mismo minuto) hay que procesar siempre la salida antes que la
      // entrada — si no, el orden de lectura de la base de datos no está
      // garantizado y una entrada podría intentar ocupar hueco antes de que
      // su salida lo libere, quedándose sin sitio (entrantesSinHueco).
      if (a.tipo === b.tipo) return 0;
      return a.tipo === "cambio_sale" ? -1 : 1;
    });

  const vacantes: SlotOnceFinal[] = [];
  const entrantesSinHueco: string[] = [];

  for (const evento of cambios) {
    if (evento.tipo === "cambio_sale") {
      if (evento.jugador_id != null) {
        const slot = lineup.get(evento.jugador_id);
        if (slot) {
          lineup.delete(evento.jugador_id);
          vacantes.push(slot);
        }
      } else if (evento.nombre_libre != null) {
        const entrada = Array.from(lineup.entries()).find(
          ([, slot]) =>
            slot.jugadorId == null && slot.nombreLibre === evento.nombre_libre,
        );
        if (entrada) {
          lineup.delete(entrada[0]);
          vacantes.push(entrada[1]);
        }
      }
    } else {
      // cambio_entra
      const vacante = vacantes.shift();
      if (evento.jugador_id != null) {
        if (vacante) {
          lineup.set(evento.jugador_id, {
            ...vacante,
            jugadorId: evento.jugador_id,
            nombreLibre: null,
          });
        } else {
          entrantesSinHueco.push(evento.jugador_id);
        }
      } else if (evento.nombre_libre != null) {
        if (vacante) {
          // Clave única por el propio evento: no hay un jugador_id con el
          // que identificar a este invitado, y su nombre podría repetirse
          // si sale y vuelve a entrar más tarde.
          lineup.set(`libre-entra:${evento.id}`, {
            ...vacante,
            jugadorId: null,
            nombreLibre: evento.nombre_libre,
          });
        } else {
          entrantesSinHueco.push(evento.nombre_libre);
        }
      }
    }
  }

  return { titulares: Array.from(lineup.values()), entrantesSinHueco };
}
