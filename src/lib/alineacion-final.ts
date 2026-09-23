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

type EventoCambio = Pick<
  LocalEventoPartido,
  "id" | "jugador_id" | "nombre_libre" | "tipo" | "minuto" | "cambio_grupo_id"
>;

/**
 * Deduce el once que termina el partido a partir del once inicial y los
 * eventos "cambio_sale"/"cambio_entra" registrados. No contempla
 * expulsiones (tarjeta_roja).
 *
 * Cada cambio hecho desde el apartado Cambios guarda su salida y su entrada
 * con el mismo `cambio_grupo_id` (ver crearCambioLocal): se usa ese enlace
 * directo para saber exactamente quién sustituye a quién, en vez de asumir
 * que la entrada ocupa "el próximo hueco libre" — con varios cambios en el
 * mismo minuto (frecuente: 2-3 sustituciones seguidas), el orden en que
 * Dexie devuelve las filas no tiene por qué coincidir con qué salida iba
 * emparejada con qué entrada, y esa suposición dejaba a jugadores en la
 * posición de otro.
 *
 * Solo los eventos "cambio_sale"/"cambio_entra" sueltos, sin grupo — de
 * antes de que existiera cambio_grupo_id, o con una de las dos filas
 * borrada a mano — caen al criterio antiguo: ocupar por orden cronológico
 * el primer hueco que haya quedado libre.
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
  eventos: EventoCambio[],
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

  const cambios = eventos.filter(
    (e) =>
      (e.tipo === "cambio_sale" || e.tipo === "cambio_entra") &&
      (e.jugador_id != null || e.nombre_libre != null),
  );

  const entrantesSinHueco: string[] = [];

  function buscarClaveSlot(
    jugadorId: string | null,
    nombreLibre: string | null,
  ): string | null {
    if (jugadorId != null) return lineup.has(jugadorId) ? jugadorId : null;
    if (nombreLibre != null) {
      const entrada = Array.from(lineup.entries()).find(
        ([, slot]) => slot.jugadorId == null && slot.nombreLibre === nombreLibre,
      );
      return entrada ? entrada[0] : null;
    }
    return null;
  }

  function aplicarEntradaEnHueco(claveSlot: string, entrada: EventoCambio) {
    const slot = lineup.get(claveSlot)!;
    lineup.delete(claveSlot);
    if (entrada.jugador_id != null) {
      lineup.set(entrada.jugador_id, {
        ...slot,
        jugadorId: entrada.jugador_id,
        nombreLibre: null,
      });
    } else if (entrada.nombre_libre != null) {
      // Clave única por el propio evento: no hay un jugador_id con el que
      // identificar a este invitado, y su nombre podría repetirse si sale y
      // vuelve a entrar más tarde.
      lineup.set(`libre-entra:${entrada.id}`, {
        ...slot,
        jugadorId: null,
        nombreLibre: entrada.nombre_libre,
      });
    }
  }

  function identidadEntrante(entrada: EventoCambio) {
    return entrada.jugador_id ?? entrada.nombre_libre ?? "?";
  }

  // Agrupa por cambio_grupo_id; lo que no tenga grupo (o le falte la mitad
  // del par) se procesa aparte, al final, con el criterio antiguo.
  const grupos = new Map<string, { sale?: EventoCambio; entra?: EventoCambio }>();
  const sueltos: EventoCambio[] = [];
  for (const evento of cambios) {
    if (!evento.cambio_grupo_id) {
      sueltos.push(evento);
      continue;
    }
    const par = grupos.get(evento.cambio_grupo_id) ?? {};
    if (evento.tipo === "cambio_sale") par.sale = evento;
    else par.entra = evento;
    grupos.set(evento.cambio_grupo_id, par);
  }

  const paresCompletos = Array.from(grupos.values())
    .filter((par): par is { sale: EventoCambio; entra: EventoCambio } => !!par.sale && !!par.entra)
    .sort((a, b) => (a.entra.minuto ?? 0) - (b.entra.minuto ?? 0));

  for (const { sale, entra } of paresCompletos) {
    const claveSlot = buscarClaveSlot(sale.jugador_id, sale.nombre_libre);
    if (claveSlot) {
      aplicarEntradaEnHueco(claveSlot, entra);
    } else {
      entrantesSinHueco.push(identidadEntrante(entra));
    }
  }

  for (const par of grupos.values()) {
    if (par.sale && par.entra) continue; // ya procesado arriba
    if (par.sale) sueltos.push(par.sale);
    if (par.entra) sueltos.push(par.entra);
  }

  const sueltosOrdenados = sueltos
    .slice()
    .sort((a, b) => {
      const diff = (a.minuto ?? 0) - (b.minuto ?? 0);
      if (diff !== 0) return diff;
      if (a.tipo === b.tipo) return 0;
      return a.tipo === "cambio_sale" ? -1 : 1;
    });

  const vacantes: SlotOnceFinal[] = [];
  for (const evento of sueltosOrdenados) {
    if (evento.tipo === "cambio_sale") {
      const claveSlot = buscarClaveSlot(evento.jugador_id, evento.nombre_libre);
      if (claveSlot) {
        vacantes.push(lineup.get(claveSlot)!);
        lineup.delete(claveSlot);
      }
    } else {
      const vacante = vacantes.shift();
      if (!vacante) {
        entrantesSinHueco.push(identidadEntrante(evento));
        continue;
      }
      if (evento.jugador_id != null) {
        lineup.set(evento.jugador_id, { ...vacante, jugadorId: evento.jugador_id, nombreLibre: null });
      } else if (evento.nombre_libre != null) {
        lineup.set(`libre-entra:${evento.id}`, {
          ...vacante,
          jugadorId: null,
          nombreLibre: evento.nombre_libre,
        });
      }
    }
  }

  return { titulares: Array.from(lineup.values()), entrantesSinHueco };
}
