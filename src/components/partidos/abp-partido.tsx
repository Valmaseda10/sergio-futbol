"use client";

// ABP del partido: se elige una jugada de la biblioteca (Plan de partido → ABP) y la app
// la crea para este partido con la convocatoria y la alineación (titulares y suplentes)
// para colocar a cada jugador. La jugada del partido se guarda aparte y no cambia la de la
// biblioteca; desde aquí se editan, se borran y se imprimen de dos en dos.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { FileDown, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { localDb } from "@/lib/db/local-db";
import { diagramaASvg } from "@/lib/ficha-entrenamiento";
import {
  crearJugadaAbpParaPartidoLocal,
  eliminarJugadaAbpLocal,
} from "@/app/(app)/plan-partido/local-actions";
import { FASES_ABP, TIPOS_ABP, leerDiagramaAbp, tipoDeJugada } from "@/lib/plan-partido";

export function AbpPartido({ partidoId }: { partidoId: string }) {
  const router = useRouter();
  const todas = useLiveQuery(
    () =>
      localDb.jugadas_abp
        .toArray()
        .then((rows) =>
          rows.sort((a, b) => a.orden - b.orden || a.created_at.localeCompare(b.created_at)),
        ),
    [],
    [],
  );
  const biblioteca = useMemo(() => todas.filter((j) => !j.partido_id), [todas]);
  const delPartido = useMemo(() => todas.filter((j) => j.partido_id === partidoId), [todas, partidoId]);
  const [creando, setCreando] = useState(false);

  async function elegir(origenId: string) {
    // Si ya hay una para este partido, se abre en vez de crear otra.
    const existente = delPartido.find((j) => j.origen_id === origenId);
    if (existente) {
      router.push(`/plan-partido/abp/${existente.id}/editar`);
      return;
    }
    setCreando(true);
    const resultado = await crearJugadaAbpParaPartidoLocal(origenId, partidoId);
    setCreando(false);
    if ("error" in resultado) {
      toast.error(resultado.error);
      return;
    }
    router.push(`/plan-partido/abp/${resultado.id}/editar`);
  }

  async function borrar(id: string, nombre: string) {
    if (!window.confirm(`¿Quitar "${nombre}" de este partido?`)) return;
    await eliminarJugadaAbpLocal(id);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">
          ABP del partido{" "}
          <span className="text-sm font-normal text-muted-foreground">
            ({delPartido.length} {delPartido.length === 1 ? "jugada" : "jugadas"})
          </span>
        </CardTitle>
        {delPartido.length > 0 && (
          <Link
            href={`/plan-partido/abp/imprimir?ids=${delPartido.map((j) => j.id).join(",")}`}
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            <FileDown className="size-4" />
            Imprimir / PDF
          </Link>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Elige una jugada y se abre lista para colocar a los jugadores de la convocatoria y la
          alineación de este partido (titulares en verde, suplentes en rojo). La jugada de la
          biblioteca no cambia.
        </p>

        {biblioteca.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay jugadas.{" "}
            <Link href="/plan-partido/abp" className="font-medium underline">
              Créalas en Plan de partido → ABP
            </Link>
            .
          </p>
        ) : (
          TIPOS_ABP.map((tipo) => {
            const delTipo = biblioteca.filter((j) => tipoDeJugada(j.tipo) === tipo.value);
            if (delTipo.length === 0) return null;
            return (
              <div key={tipo.value} className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">{tipo.plural}</p>
                <div className="flex flex-wrap gap-1.5">
                  {delTipo.map((j) => {
                    const hecha = delPartido.some((x) => x.origen_id === j.id);
                    const color = FASES_ABP.find((f) => f.value === j.fase)?.color;
                    return (
                      <button
                        key={j.id}
                        type="button"
                        disabled={creando}
                        onClick={() => void elegir(j.id)}
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium disabled:opacity-60 ${
                          hecha
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background hover:bg-muted"
                        }`}
                        style={hecha ? undefined : { color }}
                        title={hecha ? "Ya está en este partido: toca para editarla" : "Crear para este partido"}
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

        {delPartido.length > 0 && (
          <div className="grid grid-cols-2 gap-2 border-t pt-3 sm:grid-cols-3">
            {delPartido.map((j) => {
              const diagrama = leerDiagramaAbp(j.diagrama);
              const color = FASES_ABP.find((f) => f.value === j.fase)?.color ?? "#111111";
              return (
                <div key={j.id} className="min-w-0 space-y-1 rounded-md border p-1.5">
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
                  <div className="flex gap-1">
                    <Link
                      href={`/plan-partido/abp/${j.id}/editar`}
                      className={buttonVariants({ size: "sm", variant: "outline", className: "h-7 flex-1 px-2 text-xs" })}
                    >
                      <Pencil className="size-3" />
                      Editar
                    </Link>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7 text-destructive"
                      aria-label="Quitar del partido"
                      onClick={() => void borrar(j.id, j.nombre)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
