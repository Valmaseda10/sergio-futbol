"use client";

// Sincroniza la jugada con un partido: elegir el partido y ver de un vistazo quién
// es titular (subrayado verde) y quién suplente (subrayado rojo), igual que en los
// desplegables y en el dibujo, para colocar a cada jugador en su sitio.

import type { CSSProperties } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { Diagrama } from "@/lib/ficha-entrenamiento";
import {
  COLOR_ESTADO_PARTIDO,
  COLOR_TITULAR_CON_POSICION,
  COLOR_TITULAR_SIN_POSICION,
  type EstadoPartido,
  type JugadorAbp,
} from "@/lib/plan-partido";
import type { PartidoAbp } from "@/lib/use-partido-abp";

export interface OpcionJugador {
  id: string;
  nombre: string;
}

/** Jugadores que ya tienen una posición en la jugada (piezas del dibujo y lista numerada). */
export function idsUsados(
  diagrama: Diagrama | null | undefined,
  filas: JugadorAbp[],
): Set<string> {
  const ids = new Set<string>();
  const poner = (id: string | null | undefined) => {
    if (id) ids.add(id);
  };
  filas.forEach((f) => {
    poner(f.jugador_id);
    poner(f.jugador2_id);
  });
  diagrama?.elementos.forEach((e) => {
    poner(e.jugador_id);
    poner(e.jugador2_id);
  });
  return ids;
}

/**
 * Subrayado de color de un jugador según su estado en el partido. Los titulares salen en
 * verde claro si ya tienen posición en la jugada (`usado`) y en verde oscuro si aún no.
 */
export function estiloEstado(
  estado: EstadoPartido | undefined,
  usado?: boolean,
): CSSProperties | undefined {
  if (!estado) return undefined;
  const color =
    estado === "titular" && usado !== undefined
      ? usado
        ? COLOR_TITULAR_CON_POSICION
        : COLOR_TITULAR_SIN_POSICION
      : COLOR_ESTADO_PARTIDO[estado];
  return {
    ...(estado === "titular" && usado === false ? { fontWeight: 700 } : null),
    color,
    textDecoration: "underline",
    textDecorationColor: color,
    textDecorationThickness: "2px",
    textUnderlineOffset: "3px",
  };
}

function fecha(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

/** Las opciones de un desplegable de jugadores, agrupadas en titulares, suplentes y resto. */
export function OpcionesJugador({
  jugadores,
  estados,
  usados,
}: {
  jugadores: OpcionJugador[];
  estados?: Map<string, EstadoPartido>;
  /** Si se pasa, marca con ✓ y en verde claro a los que ya tienen posición en la jugada. */
  usados?: Set<string>;
}) {
  const opcion = (j: OpcionJugador) => (
    <option
      key={j.id}
      value={j.id}
      style={estiloEstado(estados?.get(j.id), usados ? usados.has(j.id) : undefined)}
    >
      {usados?.has(j.id) ? "✓ " : ""}
      {j.nombre}
    </option>
  );
  if (!estados || estados.size === 0) return <>{jugadores.map(opcion)}</>;
  const de = (estado: EstadoPartido | undefined) =>
    jugadores.filter((j) => estados.get(j.id) === estado);
  return (
    <>
      <optgroup label={usados ? "Titulares (claro: ya colocado · oscuro: sin posición)" : "Titulares (verde)"}>{de("titular").map(opcion)}</optgroup>
      <optgroup label="Suplentes (rojo)">{de("suplente").map(opcion)}</optgroup>
      <optgroup label="Resto de la plantilla">{de(undefined).map(opcion)}</optgroup>
    </>
  );
}

export function SincronizarPartido({
  sync,
  jugadores,
  fijo = false,
}: {
  sync: PartidoAbp;
  jugadores: OpcionJugador[];
  /** El partido viene dado (jugada de un partido): sin selector, solo titulares y suplentes. */
  fijo?: boolean;
}) {
  const grupo = (estado: EstadoPartido) =>
    jugadores.filter((j) => sync.estados.get(j.id) === estado);
  const titulares = grupo("titular");
  const suplentes = grupo("suplente");

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        {fijo ? (
          <p className="text-sm font-medium">
            Jugadores de la convocatoria y la alineación de este partido
          </p>
        ) : (
        <div className="space-y-2">
          <Label htmlFor="partido-abp">Partido (para ver titulares y suplentes)</Label>
          <select
            id="partido-abp"
            value={sync.partidoId ?? ""}
            onChange={(e) => sync.elegir(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">— Sin sincronizar —</option>
            {sync.partidos.map((p) => (
              <option key={p.id} value={p.id}>
                {fecha(p.fecha)} · vs {p.rival}
              </option>
            ))}
          </select>
        </div>
        )}
        {sync.partidoId &&
          (titulares.length + suplentes.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Este partido todavía no tiene convocatoria ni alineación; cuando la metas
              aparecerán aquí los titulares subrayados en verde y los suplentes en rojo.
            </p>
          ) : (
            <div className="space-y-1.5 text-sm font-semibold">
              <p className="flex flex-wrap gap-x-3 gap-y-1">
                <span className="text-xs font-normal text-muted-foreground">Titulares</span>
                {titulares.map((j) => (
                  <span key={j.id} style={estiloEstado("titular")}>
                    {j.nombre}
                  </span>
                ))}
              </p>
              <p className="flex flex-wrap gap-x-3 gap-y-1">
                <span className="text-xs font-normal text-muted-foreground">Suplentes</span>
                {suplentes.map((j) => (
                  <span key={j.id} style={estiloEstado("suplente")}>
                    {j.nombre}
                  </span>
                ))}
              </p>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
