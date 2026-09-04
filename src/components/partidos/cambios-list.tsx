"use client";

// Registrar un cambio en dos pasos: toca quién sale (de los que están en el
// campo ahora mismo, calculado a partir del once inicial + cambios previos),
// toca quién entra (del banquillo), pon el minuto y confirma. Se guardan como
// un par de eventos enlazados (cambio_sale/cambio_entra) para poder verlos y
// borrarlos juntos, en vez de dar de alta cada evento suelto desde Eventos.

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

  const { enCampoIds, yaSalieron } = useMemo(() => {
    const { titulares } = calcularOnceFinal(titularesIniciales, eventos);
    const enCampo = new Set(
      titulares.map((t) => t.jugadorId).filter((id): id is string => !!id),
    );
    const salieron = new Set(
      eventos
        .filter((e) => e.tipo === "cambio_sale" && e.jugador_id)
        .map((e) => e.jugador_id as string),
    );
    return { enCampoIds: enCampo, yaSalieron: salieron };
  }, [titularesIniciales, eventos]);

  const enCampo = convocados.filter((j) => enCampoIds.has(j.id));
  const banquillo = convocados.filter(
    (j) => !enCampoIds.has(j.id) && !yaSalieron.has(j.id),
  );

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
          En el campo ({enCampo.length}) — toca quién sale
        </p>
        {enCampo.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No queda nadie en el campo.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {enCampo.map((j) => (
              <li key={j.id}>
                <button
                  type="button"
                  onClick={() => setSaleId((prev) => (prev === j.id ? "" : j.id))}
                  className={cn(
                    "flex items-center gap-2 rounded-full border py-1 pr-3 pl-2 text-sm",
                    saleId === j.id
                      ? "border-destructive bg-destructive/10 text-destructive"
                      : "hover:bg-muted",
                  )}
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                    {j.dorsal ?? nombreMostrado(j)[0]}
                  </span>
                  {nombreMostrado(j)}
                </button>
              </li>
            ))}
          </ul>
        )}
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
            {banquillo.map((j) => (
              <li key={j.id}>
                <button
                  type="button"
                  onClick={() => setEntraId((prev) => (prev === j.id ? "" : j.id))}
                  className={cn(
                    "flex items-center gap-2 rounded-full border py-1 pr-3 pl-2 text-sm",
                    entraId === j.id
                      ? "border-pitch bg-pitch/10 text-pitch"
                      : "hover:bg-muted",
                  )}
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                    {j.dorsal ?? nombreMostrado(j)[0]}
                  </span>
                  {nombreMostrado(j)}
                </button>
              </li>
            ))}
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
