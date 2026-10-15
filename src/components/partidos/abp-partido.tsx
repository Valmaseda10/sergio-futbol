"use client";

// ABP del partido: se eligen, de las jugadas de Plan de partido → ABP, las que se van
// a trabajar o a usar contra este rival. La elección se guarda sola con la hoja de
// partido (hojas_partido.datos.abp_jugadas) y desde aquí se imprimen de dos en dos.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { FileDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { localDb } from "@/lib/db/local-db";
import { diagramaASvg } from "@/lib/ficha-entrenamiento";
import { guardarAbpPartidoLocal } from "@/app/(app)/plan-partido/local-actions";
import {
  FASES_ABP,
  TIPOS_ABP,
  leerDiagramaAbp,
  leerHoja,
  tipoDeJugada,
} from "@/lib/plan-partido";

export function AbpPartido({ partidoId }: { partidoId: string }) {
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
  const hoja = useLiveQuery(
    async () =>
      (await localDb.hojas_partido.where("partido_id").equals(partidoId).first()) ?? null,
    [partidoId],
  );
  const guardadas = useMemo(
    () => (hoja ? leerHoja(hoja.datos).abp_jugadas : []),
    [hoja],
  );
  const [guardando, setGuardando] = useState(false);

  const elegidas = guardadas.filter((id) => jugadas.some((j) => j.id === id));

  async function alternar(id: string) {
    const siguiente = guardadas.includes(id)
      ? guardadas.filter((x) => x !== id)
      : [...guardadas, id];
    setGuardando(true);
    await guardarAbpPartidoLocal(partidoId, siguiente);
    setGuardando(false);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">
          ABP del partido{" "}
          <span className="text-sm font-normal text-muted-foreground">
            ({elegidas.length} {elegidas.length === 1 ? "jugada" : "jugadas"})
          </span>
        </CardTitle>
        {elegidas.length > 0 && (
          <Link
            href={`/plan-partido/abp/imprimir?ids=${elegidas.join(",")}`}
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            <FileDown className="size-4" />
            Imprimir / PDF
          </Link>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {jugadas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
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
              <div key={tipo.value} className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">{tipo.plural}</p>
                <div className="flex flex-wrap gap-1.5">
                  {delTipo.map((j) => {
                    const activa = guardadas.includes(j.id);
                    const color = FASES_ABP.find((f) => f.value === j.fase)?.color;
                    return (
                      <button
                        key={j.id}
                        type="button"
                        aria-pressed={activa}
                        disabled={guardando}
                        onClick={() => void alternar(j.id)}
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium disabled:opacity-60 ${
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

        {elegidas.length > 0 && (
          <div className="grid grid-cols-2 gap-2 border-t pt-3 sm:grid-cols-3">
            {elegidas.map((id) => {
              const j = jugadas.find((x) => x.id === id)!;
              const diagrama = leerDiagramaAbp(j.diagrama);
              const color = FASES_ABP.find((f) => f.value === j.fase)?.color ?? "#111111";
              return (
                <Link
                  key={id}
                  href={`/plan-partido/abp/${id}`}
                  className="min-w-0 space-y-1 rounded-md border p-1.5 hover:bg-muted/50"
                >
                  <p className="truncate text-[11px] font-bold uppercase" style={{ color }}>
                    {j.nombre}
                  </p>
                  {diagrama ? (
                    <div
                      className="overflow-hidden rounded [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
                      dangerouslySetInnerHTML={{
                        __html: diagramaASvg(diagrama, { camisetas: true, numeros: false }),
                      }}
                    />
                  ) : (
                    <p className="text-[10px] text-muted-foreground">Sin dibujo</p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
