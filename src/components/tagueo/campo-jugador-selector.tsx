"use client";

// Selector de jugador para el paso "¿Quién ha sido?" de Tagueo: en vez de
// una lista plana, los titulares se ven colocados en el campo (igual que en
// Alineación/Cambios) y se elige tocando directamente su ficha. El
// banquillo se ve debajo, también tocable.
//
// Desde aquí mismo se puede registrar un cambio (alternando a modo "Hacer un
// cambio"), con el mismo gesto que en el apartado Cambios: tocar quién sale
// en el campo, tocar quién entra en el banquillo, y confirmar con un minuto
// — precargado con el minuto actual del cronómetro, pero editable.

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, Users } from "lucide-react";
import { crearCambioLocal } from "@/app/(app)/partidos/local-actions";
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

type Modo = "elegir" | "cambio";

function nombreMostrado(j: Jugador) {
  return j.alias || `${j.nombre} ${j.apellidos}`;
}

// "jugador:<id>" para un titular real, "libre:<nombre>" para uno "solo por
// hoy" (no tiene jugador_id con el que identificarlo de otra forma) — igual
// que en CambiosList.
function claveDe(t: { jugadorId: string | null; nombreLibre: string | null }) {
  if (t.jugadorId) return `jugador:${t.jugadorId}`;
  if (t.nombreLibre) return `libre:${t.nombreLibre}`;
  return null;
}

export function CampoJugadorSelector({
  partidoId,
  convocados,
  titularesIniciales,
  eventos,
  minutoSugerido,
  onSeleccionarJugador,
}: {
  partidoId: string;
  convocados: Jugador[];
  titularesIniciales: Pick<
    LocalAlineacion,
    "id" | "jugador_id" | "nombre_libre" | "posicion_jugada" | "pos_x" | "pos_y"
  >[];
  eventos: LocalEventoPartido[];
  minutoSugerido: number;
  onSeleccionarJugador: (jugadorId: string | null) => void;
}) {
  const [modo, setModo] = useState<Modo>("elegir");
  const [saleKey, setSaleKey] = useState<string | null>(null);
  const [entraId, setEntraId] = useState("");
  const [minuto, setMinuto] = useState(String(minutoSugerido));
  const [enviando, setEnviando] = useState(false);

  const jugadoresPorId = useMemo(
    () => new Map(convocados.map((j) => [j.id, j])),
    [convocados],
  );

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
  const banquillo = convocados.filter((j) => !enCampoIds.has(j.id));

  function handleTocarPitch(t: { jugadorId: string | null; nombreLibre: string | null }) {
    if (modo === "elegir") {
      // Un jugador "solo por hoy" no tiene ficha en Plantilla (sin
      // jugador_id): no se puede atribuir un tagueo a alguien sin ficha, así
      // que un toque en su ficha no hace nada en este modo.
      if (t.jugadorId) onSeleccionarJugador(t.jugadorId);
      return;
    }
    const clave = claveDe(t);
    if (!clave) return;
    setSaleKey((prev) => (prev === clave ? null : clave));
  }

  function handleTocarBanquillo(j: Jugador) {
    if (modo === "elegir") {
      onSeleccionarJugador(j.id);
      return;
    }
    setEntraId((prev) => (prev === j.id ? "" : j.id));
  }

  function handleCambiarModo(nuevo: Modo) {
    setModo(nuevo);
    setSaleKey(null);
    setEntraId("");
  }

  async function handleConfirmarCambio() {
    if (!saleKey || !entraId) return;
    const salida = saleKey.startsWith("jugador:")
      ? { jugadorId: saleKey.slice("jugador:".length) }
      : { nombreLibre: saleKey.slice("libre:".length) };

    setEnviando(true);
    const result = await crearCambioLocal(partidoId, salida, entraId, minuto);
    setEnviando(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Cambio registrado");
    setSaleKey(null);
    setEntraId("");
    setModo("elegir");
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={modo === "elegir" ? "default" : "outline"}
          size="sm"
          onClick={() => handleCambiarModo("elegir")}
        >
          <Users className="size-4" />
          Elegir jugador
        </Button>
        <Button
          type="button"
          variant={modo === "cambio" ? "default" : "outline"}
          size="sm"
          onClick={() => handleCambiarModo("cambio")}
        >
          <ArrowLeftRight className="size-4" />
          Hacer un cambio
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {modo === "elegir"
          ? "Toca al jugador en el campo o en el banquillo."
          : "Toca en el campo quién sale y en el banquillo quién entra."}
      </p>

      <div className="relative mx-auto aspect-[2/3] w-full max-w-xs overflow-hidden rounded-lg bg-pitch">
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/40" />
        <div className="absolute top-1/2 left-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40" />
        <div className="absolute inset-x-[20%] top-0 h-[16%] border-x border-b border-white/40" />
        <div className="absolute inset-x-[20%] bottom-0 h-[16%] border-x border-t border-white/40" />
        <div className="absolute inset-x-[38%] top-0 h-[6%] border-x border-b border-white/40" />
        <div className="absolute inset-x-[38%] bottom-0 h-[6%] border-x border-t border-white/40" />

        {onceFinal.titulares.map((t, i) => {
          const jugador = t.jugadorId ? jugadoresPorId.get(t.jugadorId) : null;
          const clave = claveDe(t);
          const seleccionado = modo === "cambio" && clave != null && clave === saleKey;
          const top = t.posY ?? 50;
          const left = t.posX ?? 50;
          return (
            <button
              key={clave ?? `sin-clave-${i}`}
              type="button"
              onClick={() => handleTocarPitch(t)}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
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

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Banquillo ({banquillo.length})
        </p>
        {banquillo.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No queda nadie en el banquillo.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {banquillo.map((j) => {
              const seleccionado = modo === "cambio" && entraId === j.id;
              return (
                <li key={j.id}>
                  <button
                    type="button"
                    onClick={() => handleTocarBanquillo(j)}
                    className={cn(
                      "flex items-center gap-2 rounded-full border py-1 pr-3 pl-2 text-sm",
                      seleccionado
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
              );
            })}
          </ul>
        )}
      </div>

      {modo === "elegir" ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => onSeleccionarJugador(null)}
        >
          Equipo (sin jugador)
        </Button>
      ) : (
        <div className="space-y-2 rounded-md border p-3">
          <Label htmlFor="minutoCambioTagueo">Minuto</Label>
          <Input
            id="minutoCambioTagueo"
            type="number"
            min={0}
            max={130}
            value={minuto}
            onChange={(e) => setMinuto(e.target.value)}
          />
          <Button
            className="w-full"
            disabled={!saleKey || !entraId || enviando}
            onClick={handleConfirmarCambio}
          >
            <ArrowLeftRight className="size-4" />
            {enviando ? "Registrando..." : "Confirmar cambio"}
          </Button>
        </div>
      )}
    </div>
  );
}
