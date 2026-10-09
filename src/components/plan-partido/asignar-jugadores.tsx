"use client";

// Quién hace cada cosa en una jugada, sin abrir el dibujo ni escribir: las
// piezas del dibujo se agrupan por color (rojas, azules, portero y lanzador),
// cada grupo lleva el papel que cumple ("Rematar", "Rechace y cerrar 2ª
// jugada"...) y cada pieza tiene su desplegable con la plantilla.

import type { Dispatch, SetStateAction } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Diagrama, ElementoDiagrama } from "@/lib/ficha-entrenamiento";
import { dimensionesCampo } from "@/lib/ficha-entrenamiento";
import {
  clasePieza,
  COLOR_CLASE,
  type ClasePieza,
  type JugadorAbp,
  type RolesAbp,
} from "@/lib/plan-partido";

interface Opcion {
  id: string;
  nombre: string;
}

function posicion(e: ElementoDiagrama, diagrama: Diagrama): string {
  const { ancho, alto } = dimensionesCampo(diagrama.campo);
  const h = e.x < ancho / 3 ? "izq." : e.x > (2 * ancho) / 3 ? "dcha." : "centro";
  const v = e.y < alto / 3 ? "arriba" : e.y > (2 * alto) / 3 ? "abajo" : "medio";
  return `${v} ${h}`;
}

function Selector({
  valor,
  opciones,
  onChange,
  etiqueta,
}: {
  valor: string | null | undefined;
  opciones: Opcion[];
  onChange: (id: string | null) => void;
  etiqueta: string;
}) {
  return (
    <select
      value={valor ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      aria-label={etiqueta}
      className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
    >
      <option value="">— Sin elegir —</option>
      {opciones.map((o) => (
        <option key={o.id} value={o.id}>
          {o.nombre}
        </option>
      ))}
    </select>
  );
}

export function AsignarJugadores({
  diagrama,
  setDiagrama,
  filas,
  setFilas,
  roles,
  setRoles,
  jugadores,
}: {
  diagrama: Diagrama;
  setDiagrama: Dispatch<SetStateAction<Diagrama | null>>;
  filas: JugadorAbp[];
  setFilas: Dispatch<SetStateAction<JugadorAbp[]>>;
  roles: RolesAbp;
  setRoles: (r: RolesAbp) => void;
  jugadores: Opcion[];
}) {
  const camisetas = diagrama.elementos.filter((e) => e.tipo === "jugador");
  const lanzador = diagrama.elementos.find((e) => e.tipo === "icono" && e.icono === "lanzador");

  const grupos: { clase: ClasePieza | "lanzador"; piezas: ElementoDiagrama[] }[] = [
    { clase: "rojo" as const, piezas: camisetas.filter((e) => clasePieza(e.color) === "rojo") },
    { clase: "azul" as const, piezas: camisetas.filter((e) => clasePieza(e.color) === "azul") },
    { clase: "portero" as const, piezas: camisetas.filter((e) => clasePieza(e.color) === "portero") },
    ...(lanzador ? [{ clase: "lanzador" as const, piezas: [lanzador] }] : []),
  ].filter((g) => g.piezas.length > 0);

  if (grupos.length === 0) return null;

  function elegirPieza(pieza: ElementoDiagrama, id: string | null) {
    if (pieza.etiqueta) {
      // Pieza numerada: se rellena su fila de la lista numerada (la que sale en el campo).
      setFilas((prev) => {
        const i = prev.findIndex((f) => f.etiqueta === pieza.etiqueta);
        if (i >= 0) return prev.map((f, k) => (k === i ? { ...f, jugador_id: id, texto: id ? "" : f.texto } : f));
        return [...prev, { etiqueta: pieza.etiqueta!, jugador_id: id, texto: "" }];
      });
      return;
    }
    setDiagrama((d) =>
      d
        ? {
            ...d,
            elementos: d.elementos.map((e) =>
              e.id === pieza.id ? { ...e, jugador_id: id, nombre: id ? undefined : e.nombre } : e,
            ),
          }
        : d,
    );
  }

  function valorDe(pieza: ElementoDiagrama): string | null {
    if (pieza.etiqueta) return filas.find((f) => f.etiqueta === pieza.etiqueta)?.jugador_id ?? null;
    return pieza.jugador_id ?? null;
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div>
          <Label>Quién hace cada cosa</Label>
          <p className="text-xs text-muted-foreground">
            Escribe el papel de cada grupo y elige el jugador de cada pieza. El nombre sale
            solo en el dibujo.
          </p>
        </div>
        {grupos.map(({ clase, piezas }) => {
          const color = COLOR_CLASE[clase];
          const ordenadas = [...piezas].sort((a, b) =>
            a.etiqueta && b.etiqueta
              ? Number(a.etiqueta) - Number(b.etiqueta) || a.etiqueta.localeCompare(b.etiqueta)
              : a.y - b.y || a.x - b.x,
          );
          return (
            <div key={clase} className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className="size-4 shrink-0 rounded-full border"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <Input
                  value={roles[clase] ?? ""}
                  onChange={(e) => setRoles({ ...roles, [clase]: e.target.value })}
                  placeholder={
                    clase === "rojo"
                      ? "Papel de las rojas (ej: Rematar)"
                      : clase === "azul"
                        ? "Papel de las azules (ej: Rechace y cerrar 2ª jugada)"
                        : clase === "portero"
                          ? "Papel del portero"
                          : "Papel del lanzador"
                  }
                  className="h-8 font-semibold"
                  aria-label={`Papel del grupo ${clase}`}
                />
              </div>
              <div className="space-y-1.5 pl-6">
                {ordenadas.map((pieza, i) => (
                  <div key={pieza.id} className="flex items-center gap-2">
                    <span className="w-28 shrink-0 text-xs text-muted-foreground">
                      {clase === "lanzador"
                        ? "Lanzador"
                        : pieza.etiqueta
                          ? `Nº ${pieza.etiqueta}`
                          : `${i + 1} · ${posicion(pieza, diagrama)}`}
                    </span>
                    <Selector
                      valor={valorDe(pieza)}
                      opciones={jugadores}
                      onChange={(id) => elegirPieza(pieza, id)}
                      etiqueta={`Jugador de la pieza ${pieza.etiqueta ?? i + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
