"use client";

// Rotación de una tarea por equipos con color: editor para el formulario
// (elegir jugadores de la plantilla por equipo) y vista para la ficha, con
// los nombres de cada equipo en su color y ordenados por posición.

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LocalJugador } from "@/lib/db/local-db";
import {
  COLORES_EQUIPO,
  type EquipoRotacion,
  type RotacionTarea,
} from "@/lib/ficha-entrenamiento";
import {
  DEMARCACION_LABEL,
  DEMARCACION_ORDEN,
  demarcacionDePosicion,
} from "@/lib/posiciones";

const nombreDe = (j: LocalJugador) => j.alias || j.nombre;

// De izquierda a derecha dentro de una misma posición.
function lado(j: LocalJugador): number {
  if (j.posicion?.includes("izquierdo")) return 0;
  if (j.posicion?.includes("derecho")) return 2;
  return 1;
}

function porPosicion(jugadores: LocalJugador[]): LocalJugador[][] {
  return DEMARCACION_ORDEN.map((dem) =>
    jugadores
      .filter((j) => (demarcacionDePosicion(j.posicion) ?? "mediocentro") === dem)
      .sort((a, b) => lado(a) - lado(b) || nombreDe(a).localeCompare(nombreDe(b))),
  ).filter((grupo) => grupo.length > 0);
}

export function equiposConContenido(
  r: RotacionTarea | null | undefined,
): EquipoRotacion[] {
  return (r?.equipos ?? []).filter((e) => e.jugadores.length > 0 || e.texto?.trim());
}

// ---- Editor ---------------------------------------------------------------

export function RotacionEquiposEditor({
  valor,
  jugadores,
  onChange,
}: {
  valor: RotacionTarea | null | undefined;
  jugadores: LocalJugador[];
  onChange: (r: RotacionTarea) => void;
}) {
  const equipos = valor?.equipos ?? [];

  function setEquipos(nuevos: EquipoRotacion[]) {
    onChange({ equipos: nuevos });
  }

  function editar(i: number, parche: Partial<EquipoRotacion>) {
    setEquipos(equipos.map((e, k) => (k === i ? { ...e, ...parche } : e)));
  }

  // Un jugador solo está en un equipo por tarea: al marcarlo en otro, se mueve.
  function alternarJugador(i: number, id: string) {
    const ya = equipos[i].jugadores.includes(id);
    setEquipos(
      equipos.map((e, k) => {
        if (k === i) {
          return {
            ...e,
            jugadores: ya ? e.jugadores.filter((x) => x !== id) : [...e.jugadores, id],
          };
        }
        return { ...e, jugadores: e.jugadores.filter((x) => x !== id) };
      }),
    );
  }

  function anadirEquipo() {
    const usados = new Set(equipos.map((e) => e.color));
    const color =
      COLORES_EQUIPO.find((c) => !usados.has(c.valor))?.valor ?? COLORES_EQUIPO[0].valor;
    setEquipos([
      ...equipos,
      { nombre: `Equipo ${equipos.length + 1}`, color, jugadores: [] },
    ]);
  }

  const grupos = porPosicion(jugadores);

  return (
    <div className="space-y-3">
      {equipos.map((equipo, i) => (
        <div key={i} className="space-y-2 rounded-md border p-2">
          <div className="flex items-center gap-2">
            <Input
              value={equipo.nombre}
              onChange={(e) => editar(i, { nombre: e.target.value })}
              placeholder="Nombre del equipo"
              className="h-8 min-w-0 flex-1 text-sm"
              aria-label="Nombre del equipo"
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 shrink-0 text-destructive"
              aria-label="Quitar equipo"
              onClick={() => setEquipos(equipos.filter((_, k) => k !== i))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Color">
            {COLORES_EQUIPO.map((c) => (
              <button
                key={c.valor}
                type="button"
                role="radio"
                aria-checked={equipo.color === c.valor}
                aria-label={c.nombre}
                title={c.nombre}
                onClick={() => editar(i, { color: c.valor })}
                className={`size-6 rounded-full border-2 ${
                  equipo.color === c.valor ? "border-foreground" : "border-transparent"
                }`}
                style={{ backgroundColor: c.valor }}
              />
            ))}
          </div>
          <div className="space-y-1.5">
            {grupos.map((grupo) => (
              <div key={grupo[0].id} className="flex flex-wrap items-center gap-1">
                <span className="w-20 shrink-0 text-[10px] text-muted-foreground">
                  {
                    DEMARCACION_LABEL[
                      demarcacionDePosicion(grupo[0].posicion) ?? "mediocentro"
                    ]
                  }
                </span>
                {grupo.map((j) => {
                  const marcado = equipo.jugadores.includes(j.id);
                  const enOtro =
                    !marcado &&
                    equipos.some((e, k) => k !== i && e.jugadores.includes(j.id));
                  return (
                    <button
                      key={j.id}
                      type="button"
                      aria-pressed={marcado}
                      onClick={() => alternarJugador(i, j.id)}
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        marcado
                          ? "text-white"
                          : enOtro
                            ? "border-input bg-muted text-muted-foreground/50"
                            : "border-input bg-background"
                      }`}
                      style={
                        marcado
                          ? { backgroundColor: equipo.color, borderColor: equipo.color }
                          : undefined
                      }
                    >
                      {nombreDe(j)}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <Input
            value={equipo.texto ?? ""}
            onChange={(e) => editar(i, { texto: e.target.value })}
            placeholder="Nota opcional (ej: Serie 1, rotan cada 2 min)"
            className="h-8 text-sm"
            aria-label="Nota del equipo"
          />
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={anadirEquipo}>
        <Plus className="size-4" />
        Añadir equipo
      </Button>
    </div>
  );
}

// ---- Vista para la ficha --------------------------------------------------

export function RotacionEquiposVista({
  equipos,
  jugadores,
  ausentes,
}: {
  equipos: EquipoRotacion[];
  jugadores: LocalJugador[];
  ausentes: Set<string>;
}) {
  const porId = new Map(jugadores.map((j) => [j.id, j]));
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1 p-2 text-[11px] font-bold print:p-1 print:text-[10.5px]">
      {equipos.map((equipo, i) => {
        const miembros = equipo.jugadores
          .map((id) => porId.get(id))
          .filter((j): j is LocalJugador => !!j);
        return (
          <p key={i} className="leading-snug" style={{ color: equipo.color }}>
            {equipo.nombre && <span className="uppercase">{equipo.nombre}: </span>}
            {porPosicion(miembros).map((grupo, gi) => (
              <span key={gi}>
                {gi > 0 && " / "}
                {grupo.map((j, ji) => (
                  <span key={j.id}>
                    {ji > 0 && "-"}
                    <span className={ausentes.has(j.id) ? "line-through opacity-60" : ""}>
                      {nombreDe(j)}
                    </span>
                  </span>
                ))}
              </span>
            ))}
            {equipo.texto?.trim() && <span> ({equipo.texto.trim()})</span>}
          </p>
        );
      })}
    </div>
  );
}
