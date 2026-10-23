"use client";

// Añadir jugadas de ABP a la diapositiva desde la propia presentación: se elige una de la
// biblioteca (Plan de partido → ABP) y la app la crea para este partido (con la convocatoria y la
// alineación para colocar a los jugadores) y la deja puesta en la diapositiva. Las que ya están
// creadas para el partido se activan o quitan con los botones de arriba.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { localDb, type LocalJugadaAbp } from "@/lib/db/local-db";
import { crearJugadaAbpParaPartidoLocal } from "@/app/(app)/plan-partido/local-actions";
import { FASES_ABP, TIPOS_ABP, tipoDeJugada } from "@/lib/plan-partido";

interface Props {
  partidoId: string;
  /** Jugadas ya creadas para este partido. */
  delPartido: LocalJugadaAbp[];
  /** Jugadas que salen en la diapositiva (vacío = todas). */
  jugadas: string[];
  onCambiar: (jugadas: string[]) => void;
}

export function AbpBibliotecaPresentacion({ partidoId, delPartido, jugadas, onCambiar }: Props) {
  const biblioteca = useLiveQuery(
    () =>
      localDb.jugadas_abp
        .filter((j) => !j.partido_id)
        .toArray()
        .then((rows) => rows.sort((a, b) => a.orden - b.orden || a.created_at.localeCompare(b.created_at))),
    [],
  );
  const [creando, setCreando] = useState(false);

  const pendientes = useMemo(
    () => (biblioteca ?? []).filter((j) => !delPartido.some((x) => x.origen_id === j.id)),
    [biblioteca, delPartido],
  );

  async function anadir(origenId: string, nombre: string) {
    setCreando(true);
    const resultado = await crearJugadaAbpParaPartidoLocal(origenId, partidoId);
    setCreando(false);
    if ("error" in resultado) {
      toast.error(resultado.error);
      return;
    }
    // Con "todas" (lista vacía) la nueva ya sale; si hay una selección, se suma a ella.
    if (jugadas.length > 0) onCambiar([...jugadas, resultado.id]);
    toast.success(`«${nombre}» añadida a la diapositiva`);
  }

  if (biblioteca === undefined) return null;

  return (
    <div className="space-y-2">
      <Label>Añadir desde la biblioteca de ABP</Label>
      {biblioteca.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay jugadas en la biblioteca.{" "}
          <Link href="/plan-partido/abp" className="font-medium underline">
            Créalas en Plan de partido → ABP
          </Link>
          .
        </p>
      ) : pendientes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ya tienes en este partido todas las jugadas de la biblioteca.</p>
      ) : (
        TIPOS_ABP.map((tipo) => {
          const delTipo = pendientes.filter((j) => tipoDeJugada(j.tipo) === tipo.value);
          if (delTipo.length === 0) return null;
          return (
            <div key={tipo.value} className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{tipo.plural}</p>
              <div className="flex flex-wrap gap-1.5">
                {delTipo.map((j) => (
                  <button
                    key={j.id}
                    type="button"
                    disabled={creando}
                    onClick={() => void anadir(j.id, j.nombre)}
                    className="rounded-full border border-input bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted disabled:opacity-60"
                    style={{ color: FASES_ABP.find((f) => f.value === j.fase)?.color }}
                    title="Crear para este partido y ponerla en la diapositiva"
                  >
                    + {j.nombre}
                  </button>
                ))}
              </div>
            </div>
          );
        })
      )}
      {delPartido.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Colocar jugadores en una jugada del partido</p>
          <div className="flex flex-wrap gap-1.5">
            {delPartido.map((j) => (
              <Link
                key={j.id}
                href={`/plan-partido/abp/${j.id}/editar?volver=${encodeURIComponent(`/plan-partido/presentacion/${partidoId}`)}`}
                className={buttonVariants({ size: "sm", variant: "outline", className: "h-7 px-2 text-xs" })}
              >
                <Pencil className="size-3" />
                {j.nombre}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
