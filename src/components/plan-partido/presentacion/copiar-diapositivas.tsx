"use client";

// Panel para traer diapositivas de la presentación de otro partido (sobre todo el plan de partido
// defensivo y ofensivo, que suele repetirse). Se copian con ids nuevos y luego se editan como cualquiera.

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { localDb } from "@/lib/db/local-db";
import { fechaHoja } from "@/lib/plan-partido";
import {
  copiarDiapositivaA,
  esDiapositivaDePlan,
  leerPresentacion,
  resumenDiapositiva,
  type Diapositiva,
} from "@/lib/presentacion-partido";
import { cn } from "@/lib/utils";

interface Props {
  partidoId: string;
  rival: string;
  onCopiar: (diapositivas: Diapositiva[]) => void;
  onCerrar: () => void;
}

export function CopiarDiapositivas({ partidoId, rival, onCopiar, onCerrar }: Props) {
  const origenes = useLiveQuery(async () => {
    const [filas, partidos] = await Promise.all([localDb.presentaciones_partido.toArray(), localDb.partidos.toArray()]);
    const porId = new Map(partidos.map((p) => [p.id, p]));
    return filas
      .filter((f) => f.partido_id !== partidoId && porId.has(f.partido_id))
      .map((f) => ({ partido: porId.get(f.partido_id)!, diapositivas: leerPresentacion(f.diapositivas) }))
      .filter((o) => o.diapositivas.length > 0)
      .sort((a, b) => b.partido.fecha.localeCompare(a.partido.fecha));
  }, [partidoId]);

  const [elegidoId, setElegidoId] = useState<string | null>(null);
  const [marcadas, setMarcadas] = useState<Set<string> | null>(null);

  const origen = useMemo(() => {
    if (!origenes || origenes.length === 0) return null;
    return origenes.find((o) => o.partido.id === elegidoId) ?? origenes[0];
  }, [origenes, elegidoId]);

  if (origenes === undefined) return null;

  // Por defecto van marcadas las diapositivas del plan de partido.
  const seleccion = marcadas ?? new Set(origen?.diapositivas.filter(esDiapositivaDePlan).map((d) => d.id) ?? []);

  function cambiarOrigen(id: string) {
    setElegidoId(id);
    setMarcadas(null);
  }

  function alternar(id: string) {
    const s = new Set(seleccion);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setMarcadas(s);
  }

  function copiar() {
    if (!origen) return;
    const lista = origen.diapositivas.filter((d) => seleccion.has(d.id)).map((d) => copiarDiapositivaA(d, rival));
    if (lista.length > 0) onCopiar(lista);
  }

  return (
    <div className="space-y-3 rounded-md border bg-popover p-3 shadow-md print:hidden">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Copiar diapositivas de otro partido</p>
          <p className="text-xs text-muted-foreground">
            Se añaden detrás de la diapositiva actual y las editas como cualquier otra.
          </p>
        </div>
        <button type="button" aria-label="Cerrar" onClick={onCerrar} className="rounded p-1 hover:bg-muted">
          <X className="size-4" />
        </button>
      </div>

      {!origen ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay presentaciones de otros partidos de las que copiar.
        </p>
      ) : (
        <>
          <select
            value={origen.partido.id}
            onChange={(e) => cambiarOrigen(e.target.value)}
            aria-label="Partido del que copiar"
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {origenes!.map((o) => (
              <option key={o.partido.id} value={o.partido.id}>
                vs {o.partido.rival} · {fechaHoja(o.partido.fecha)}
              </option>
            ))}
          </select>

          <ul className="max-h-64 space-y-0.5 overflow-y-auto">
            {origen.diapositivas.map((d, k) => (
              <li key={d.id}>
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted",
                    seleccion.has(d.id) && "bg-primary/10",
                  )}
                >
                  <input type="checkbox" checked={seleccion.has(d.id)} onChange={() => alternar(d.id)} />
                  <span className="w-5 text-right text-xs text-muted-foreground tabular-nums">{k + 1}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {resumenDiapositiva(d)}
                    {d.tipo === "pizarra" && d.titulo && (
                      <span className="ml-1 text-xs text-muted-foreground">({d.titulo})</span>
                    )}
                  </span>
                  {esDiapositivaDePlan(d) && <span className="text-[10px] font-medium text-primary uppercase">plan</span>}
                </label>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={seleccion.size === 0} onClick={copiar}>
              <Copy className="size-4" />
              Copiar {seleccion.size} {seleccion.size === 1 ? "diapositiva" : "diapositivas"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setMarcadas(new Set(origen.diapositivas.map((d) => d.id)))}
            >
              Marcar todas
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setMarcadas(new Set())}>
              Ninguna
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
