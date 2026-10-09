"use client";

// En la tarea de ABP: elegir (hasta 3) las jugadas de Plan de partido → ABP que
// se trabajan ese día. Salen dibujadas en el hueco de la tarea en la ficha.

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/local-db";
import { FASES_ABP, TIPOS_ABP, tipoDeJugada } from "@/lib/plan-partido";
import { MAX_JUGADAS_ABP_TAREA } from "@/components/entrenamientos/abp-tarea";

export function AbpJugadasPicker({
  seleccion,
  onSeleccion,
}: {
  /** Ids de las jugadas elegidas. */
  seleccion: string[];
  onSeleccion: (ids: string[]) => void;
}) {
  const jugadas = useLiveQuery(
    () =>
      localDb.jugadas_abp
        .toArray()
        .then((rows) =>
          rows.sort((a, b) => a.orden - b.orden || a.created_at.localeCompare(b.created_at)),
        ),
    [],
    [],
  );
  const llena = seleccion.length >= MAX_JUGADAS_ABP_TAREA;

  function alternar(id: string) {
    onSeleccion(seleccion.includes(id) ? seleccion.filter((x) => x !== id) : [...seleccion, id]);
  }

  return (
    <div className="space-y-2 pt-2">
      <p className="text-xs text-muted-foreground">
        Elige hasta {MAX_JUGADAS_ABP_TAREA} jugadas ({seleccion.length}/{MAX_JUGADAS_ABP_TAREA}).
        Salen dibujadas en esta tarea de la ficha (la primera a la izquierda y la segunda a la derecha), sin añadir hojas y en lugar de su imagen.
      </p>
      {jugadas.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Todavía no hay jugadas.{" "}
          <Link href="/plan-partido/abp" className="font-medium underline">
            Créalas en Plan de partido → ABP
          </Link>
          .
        </p>
      ) : (
        TIPOS_ABP.map((tipo) => {
          const delTipo = jugadas.filter((j) => tipoDeJugada(j.tipo) === tipo.value);
          if (delTipo.length === 0) return null;
          return (
            <div key={tipo.value} className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground">{tipo.plural}</p>
              <div className="flex flex-wrap gap-1.5">
                {delTipo.map((j) => {
                  const activa = seleccion.includes(j.id);
                  const color = FASES_ABP.find((f) => f.value === j.fase)?.color;
                  return (
                    <button
                      key={j.id}
                      type="button"
                      aria-pressed={activa}
                      disabled={!activa && llena}
                      onClick={() => alternar(j.id)}
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium disabled:opacity-40 ${
                        activa
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background hover:bg-muted"
                      }`}
                      style={activa ? undefined : { color }}
                    >
                      {j.nombre}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
