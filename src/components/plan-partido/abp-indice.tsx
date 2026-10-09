"use client";

// Índice del ABP: todas las jugadas agrupadas por categoría (córners y faltas
// directas / laterales / frontales), cada una con su título y su dibujo en
// pequeño, para entrar a cualquiera con un toque.

import { useMemo } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowDown, ArrowUp, FileDown, Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { localDb, type LocalJugadaAbp } from "@/lib/db/local-db";
import { diagramaASvg } from "@/lib/ficha-entrenamiento";
import {
  FASES_ABP,
  TIPOS_ABP,
  leerDiagramaAbp,
  tipoDeJugada,
} from "@/lib/plan-partido";
import { intercambiarOrdenJugadasAbpLocal } from "@/app/(app)/plan-partido/local-actions";

function Miniatura({ jugada }: { jugada: LocalJugadaAbp }) {
  const diagrama = leerDiagramaAbp(jugada.diagrama);
  if (!diagrama) {
    return (
      <div className="flex aspect-[520/340] w-28 shrink-0 items-center justify-center rounded border border-dashed text-[10px] text-muted-foreground">
        Sin dibujo
      </div>
    );
  }
  return (
    <div
      className="w-28 shrink-0 overflow-hidden rounded [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
      dangerouslySetInnerHTML={{ __html: diagramaASvg(diagrama) }}
    />
  );
}

export function AbpIndice() {
  const todas = useLiveQuery(
    () =>
      localDb.jugadas_abp
        .toArray()
        .then((rows) =>
          rows.sort(
            (a, b) => a.orden - b.orden || a.created_at.localeCompare(b.created_at),
          ),
        ),
    [],
    [],
  );

  const porTipo = useMemo(
    () =>
      TIPOS_ABP.map((t) => ({
        ...t,
        jugadas: todas.filter((j) => tipoDeJugada(j.tipo) === t.value),
      })),
    [todas],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Link href="/plan-partido/abp/nueva" className={buttonVariants({ size: "sm" })}>
          <Plus className="size-4" />
          Nueva jugada
        </Link>
        <Link
          href="/plan-partido/abp/imprimir"
          className={buttonVariants({ size: "sm", variant: "outline" })}
        >
          <FileDown className="size-4" />
          PDF / imprimir todas
        </Link>
      </div>

      {porTipo.map((cat) => (
        <section key={cat.value} className="space-y-2">
          <div className="flex items-center justify-between gap-2 border-b pb-1">
            <h2 className="text-lg font-semibold">
              {cat.plural}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ({cat.jugadas.length})
              </span>
            </h2>
            <div className="flex gap-1">
              <Link
                href={`/plan-partido/abp/nueva?tipo=${cat.value}`}
                className={buttonVariants({ size: "sm", variant: "ghost" })}
              >
                <Plus className="size-4" />
                Añadir
              </Link>
              {cat.jugadas.length > 0 && (
                <Link
                  href={`/plan-partido/abp/imprimir?tipo=${cat.value}`}
                  className={buttonVariants({ size: "sm", variant: "ghost" })}
                >
                  <FileDown className="size-4" />
                  PDF
                </Link>
              )}
            </div>
          </div>
          {cat.jugadas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay jugadas aquí.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {cat.jugadas.map((j, i) => {
                const color = FASES_ABP.find((f) => f.value === j.fase)?.color ?? "#111111";
                const anterior = cat.jugadas[i - 1];
                const siguiente = cat.jugadas[i + 1];
                return (
                  <li key={j.id} className="flex items-stretch rounded-md border">
                    <Link
                      href={`/plan-partido/abp/${j.id}`}
                      className="flex min-w-0 flex-1 items-center gap-3 p-2 hover:bg-muted/50"
                    >
                      <Miniatura jugada={j} />
                      <div className="min-w-0">
                        <p className="text-sm leading-tight font-bold" style={{ color }}>
                          {j.nombre}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {FASES_ABP.find((f) => f.value === j.fase)?.label}
                        </p>
                      </div>
                    </Link>
                    <div className="flex flex-col justify-center border-l">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        aria-label="Subir"
                        disabled={!anterior}
                        onClick={() =>
                          anterior && void intercambiarOrdenJugadasAbpLocal(j.id, anterior.id)
                        }
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        aria-label="Bajar"
                        disabled={!siguiente}
                        onClick={() =>
                          siguiente && void intercambiarOrdenJugadasAbpLocal(j.id, siguiente.id)
                        }
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
