"use client";

// Registrar un cambio en dos pasos sobre el propio campo: toca en el campo
// al jugador que sale (se resalta en rojo), toca en el banquillo al que
// entra, pon el minuto y confirma. Se guardan como un par de eventos
// enlazados (cambio_sale/cambio_entra) para poder verlos y borrarlos juntos,
// en vez de dar de alta cada evento suelto desde Eventos.
//
// Los jugadores "solo por hoy" (alineación libre, sin ficha en Plantilla) se
// dibujan en el campo para que el once cuadre, pero no se pueden seleccionar
// como salida: el modelo de eventos solo admite jugadores reales.

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, Trash2 } from "lucide-react";
import {
  crearCambioLocal,
  eliminarCambioLocal,
} from "@/app/(app)/partidos/local-actions";
import type { LocalAlineacion, LocalEventoPartido } from "@/lib/db/local-db";
import { calcularOnceFinal } from "@/lib/alineacion-final";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Jugador {
  id: string;
  nombre: string;
  apellidos: string;
  alias: string | null;
  dorsal: number | null;
}

function nombreMostrado(j: Jugador) {
  return j.alias || `${j.nombre} ${j.apellidos}`;
}

export function CambiosList({
  partidoId,
  convocados,
  titularesIniciales,
  eventos,
}: {
  partidoId: string;
  convocados: Jugador[];
  titularesIniciales: Pick<
    LocalAlineacion,
    "id" | "jugador_id" | "nombre_libre" | "posicion_jugada" | "pos_x" | "pos_y"
  >[];
  eventos: LocalEventoPartido[];
}) {
  const [saleId, setSaleId] = useState("");
  const [entraId, setEntraId] = useState("");
  const [minuto, setMinuto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [borrando, setBorrando] = useState<string | null>(null);

  const jugadoresPorId = new Map(convocados.map((j) => [j.id, j]));

  const onceFinal = useMemo(
    () => calcularOnceFinal(titularesIniciales, eventos),
    [titularesIniciales, eventos],
  );

  const enCampoIds = useMemo(
    () =>
      new Set(
        onceFinal.titulares
          .map((t) => t.jugadorId)
          .filter((id): id is string => !!id),
      ),
    [onceFinal],
  );
  const yaSalieron = useMemo(
    () =>
      new Set(
        eventos
          .filter((e) => e.tipo === "cambio_sale" && e.jugador_id)
          .map((e) => e.jugador_id as string),
      ),
    [eventos],
  );

  // Los que ya salieron se quedan en el banquillo (no desaparecen) pero en
  // rojo y sin poder tocarlos, para ver de un vistazo quién ha salido ya.
  const banquillo = convocados.filter((j) => !enCampoIds.has(j.id));

  const cambios = useMemo(() => {
    const grupos = new Map<
      string,
      { sale?: LocalEventoPartido; entra?: LocalEventoPartido }
    >();
    for (const e of eventos) {
      if (!e.cambio_grupo_id) continue;
      if (e.tipo !== "cambio_sale" && e.tipo !== "cambio_entra") continue;
      const g = grupos.get(e.cambio_grupo_id) ?? {};
      if (e.tipo === "cambio_sale") g.sale = e;
      else g.entra = e;
      grupos.set(e.cambio_grupo_id, g);
    }
    return Array.from(grupos.entries())
      .map(([grupoId, g]) => ({ grupoId, ...g }))
      .sort(
        (a, b) =>
          (a.sale?.minuto ?? a.entra?.minuto ?? 999) -
          (b.sale?.minuto ?? b.entra?.minuto ?? 999),
      );
  }, [eventos]);

  async function handleConfirmar() {
    if (!saleId || !entraId) return;
    setEnviando(true);
    const result = await crearCambioLocal(partidoId, saleId, entraId, minuto);
    setEnviando(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Cambio registrado");
    setSaleId("");
    setEntraId("");
    setMinuto("");
  }

  async function handleBorrar(grupoId: string) {
    setBorrando(grupoId);
    await eliminarCambioLocal(grupoId);
    setBorrando(null);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          En el campo ({onceFinal.titulares.length}) — toca quién sale
        </p>
        <div className="relative mx-auto aspect-[2/3] w-full max-w-xs touch-none overflow-hidden rounded-lg bg-pitch">
          <div className="absolute inset-x-0 top-1/2 h-px bg-white/40" />
          <div className="absolute top-1/2 left-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40" />
          <div className="absolute inset-x-[20%] top-0 h-[16%] border-x border-b border-white/40" />
          <div className="absolute inset-x-[20%] bottom-0 h-[16%] border-x border-t border-white/40" />
          <div className="absolute inset-x-[38%] top-0 h-[6%] border-x border-b border-white/40" />
          <div className="absolute inset-x-[38%] bottom-0 h-[6%] border-x border-t border-white/40" />

          {onceFinal.titulares.map((t, i) => {
            const jugador = t.jugadorId ? jugadoresPorId.get(t.jugadorId) : null;
            const seleccionado = !!t.jugadorId && t.jugadorId === saleId;
            const top = t.posY ?? 50;
            const left = t.posX ?? 50;
            return (
              <button
                key={t.jugadorId ?? `libre-${i}`}
                type="button"
                disabled={!t.jugadorId}
                onClick={() =>
                  setSaleId((prev) =>
                    prev === t.jugadorId ? "" : (t.jugadorId ?? prev),
                  )
                }
                className={cn(
                  "absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5",
                  !t.jugadorId && "cursor-default",
                )}
                style={{ top: `${top}%`, left: `${left}%` }}
              >
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full border-2 bg-white font-heading text-sm tabular-nums text-foreground shadow",
                    seleccionado ? "border-destructive" : "border-gold",
                  )}
                >
                  {jugador
                    ? (jugador.dorsal ?? nombreMostrado(jugador)[0])
                    : (t.nombreLibre?.[0] ?? "?")}
                </span>
                <span className="max-w-16 truncate rounded bg-black/40 px-1 text-[10px] text-white">
                  {jugador ? nombreMostrado(jugador) : `${t.nombreLibre} (invitado)`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Banquillo ({banquillo.length}) — toca quién entra
        </p>
        {banquillo.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No queda nadie en el banquillo.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {banquillo.map((j) => {
              const salio = yaSalieron.has(j.id);
              return (
                <li key={j.id}>
                  <button
                    type="button"
                    disabled={salio}
                    onClick={() =>
                      setEntraId((prev) => (prev === j.id ? "" : j.id))
                    }
                    className={cn(
                      "flex items-center gap-2 rounded-full border py-1 pr-3 pl-2 text-sm",
                      salio
                        ? "border-destructive bg-destructive/10 text-destructive"
                        : entraId === j.id
                          ? "border-pitch bg-pitch/10 text-pitch"
                          : "hover:bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full text-[10px] font-medium",
                        salio
                          ? "bg-destructive text-white"
                          : "bg-primary text-primary-foreground",
                      )}
                    >
                      {j.dorsal ?? nombreMostrado(j)[0]}
                    </span>
                    {nombreMostrado(j)}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="space-y-2 rounded-md border p-3">
        <Label htmlFor="minutoCambio">Minuto (opcional)</Label>
        <Input
          id="minutoCambio"
          type="number"
          min={0}
          max={130}
          value={minuto}
          onChange={(e) => setMinuto(e.target.value)}
        />
        <Button
          className="w-full"
          disabled={!saleId || !entraId || enviando}
          onClick={handleConfirmar}
        >
          <ArrowLeftRight className="size-4" />
          {enviando ? "Registrando..." : "Confirmar cambio"}
        </Button>
      </div>

      {cambios.length > 0 && (
        <ul className="divide-y rounded-md border">
          {cambios.map(({ grupoId, sale, entra }) => {
            const jSale = sale?.jugador_id
              ? jugadoresPorId.get(sale.jugador_id)
              : null;
            const jEntra = entra?.jugador_id
              ? jugadoresPorId.get(entra.jugador_id)
              : null;
            return (
              <li key={grupoId} className="flex items-center gap-3 p-3 text-sm">
                <span className="w-9 shrink-0 font-heading tabular-nums text-muted-foreground">
                  {sale?.minuto != null ? `${sale.minuto}'` : "—"}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="text-destructive">
                    {jSale ? nombreMostrado(jSale) : "?"}
                  </span>
                  {" → "}
                  <span className="text-pitch">
                    {jEntra ? nombreMostrado(jEntra) : "?"}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={borrando === grupoId}
                  onClick={() => handleBorrar(grupoId)}
                  aria-label="Eliminar cambio"
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
