"use client";

// Registrar un cambio en dos pasos sobre el propio campo: toca en el campo
// al jugador que sale (se resalta en rojo), toca en el banquillo al que
// entra, pon el minuto y confirma. Se guardan como un par de eventos
// enlazados (cambio_sale/cambio_entra) para poder verlos y borrarlos juntos,
// en vez de dar de alta cada evento suelto desde Eventos.
//
// Los jugadores "solo por hoy" (alineación libre, sin ficha en Plantilla)
// también se pueden dar de baja tocándolos en el campo: como no tienen
// jugador_id con el que enlazar el evento, se guardan por nombre.
//
// Las fichas también se pueden arrastrar (igual que en Alineación o
// Campograma) para retocar posiciones a mano, y "Aplicar" una formación
// distinta las reparte a todas de golpe. El campo mostrado es siempre el
// calculado en vivo a partir del once inicial + los cambios registrados
// (nunca se congela), así que sigue reaccionando a cambios nuevos aunque ya
// se haya guardado una alineación a mano; "Guardar alineación" solo vuelca
// una foto del momento a la tabla de "once que termina" para que quede
// también en Alineación.

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, Save, Trash2 } from "lucide-react";
import {
  crearCambioLocal,
  eliminarCambioLocal,
  guardarAlineacionFinalLocal,
} from "@/app/(app)/partidos/local-actions";
import type { LocalAlineacion, LocalEventoPartido } from "@/lib/db/local-db";
import { calcularOnceFinal } from "@/lib/alineacion-final";
import { FORMACIONES } from "@/lib/formaciones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Jugador {
  id: string;
  nombre: string;
  apellidos: string;
  alias: string | null;
  dorsal: number | null;
}

interface Posicion {
  top: number;
  left: number;
}

const MARGEN = 5;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function nombreMostrado(j: Jugador) {
  return j.alias || `${j.nombre} ${j.apellidos}`;
}

// "jugador:<id>" para un titular real, "libre:<nombre>" para uno "solo por
// hoy" (no tiene jugador_id con el que identificarlo de otra forma).
function claveDe(t: { jugadorId: string | null; nombreLibre: string | null }) {
  if (t.jugadorId) return `jugador:${t.jugadorId}`;
  if (t.nombreLibre) return `libre:${t.nombreLibre}`;
  return null;
}

export function CambiosList({
  partidoId,
  convocados,
  titularesIniciales,
  eventos,
  alineacionesFinalesIniciales,
}: {
  partidoId: string;
  convocados: Jugador[];
  titularesIniciales: Pick<
    LocalAlineacion,
    "id" | "jugador_id" | "nombre_libre" | "posicion_jugada" | "pos_x" | "pos_y"
  >[];
  eventos: LocalEventoPartido[];
  alineacionesFinalesIniciales: {
    jugador_id: string | null;
    nombre_libre: string | null;
    pos_x: number | null;
    pos_y: number | null;
  }[];
}) {
  const pitchRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ clave: string; startX: number; startY: number; moved: boolean } | null>(
    null,
  );

  const [saleKey, setSaleKey] = useState<string | null>(null);
  const [entraId, setEntraId] = useState("");
  const [minuto, setMinuto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [borrando, setBorrando] = useState<string | null>(null);
  const [formacionValue, setFormacionValue] = useState(FORMACIONES[0].value);
  const [guardandoAlineacion, setGuardandoAlineacion] = useState(false);

  // Posiciones tocadas a mano (arrastre o "Aplicar formación"), por encima
  // de las que trae el cálculo en vivo. Se siembran una sola vez con lo que
  // hubiera guardado en "once que termina" para no perder el trabajo de una
  // sesión anterior, pero a partir de ahí el campo sigue el cálculo en
  // vivo — así un cambio nuevo no se queda tapado por una foto antigua.
  const [posOverrides, setPosOverrides] = useState<Record<string, Posicion>>(() => {
    const seed: Record<string, Posicion> = {};
    for (const a of alineacionesFinalesIniciales) {
      const clave = claveDe({ jugadorId: a.jugador_id, nombreLibre: a.nombre_libre });
      if (clave && a.pos_x != null && a.pos_y != null) {
        seed[clave] = { top: a.pos_y, left: a.pos_x };
      }
    }
    return seed;
  });

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

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>, clave: string) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { clave, startX: e.clientX, startY: e.clientY, moved: false };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>, clave: string) {
    const drag = dragRef.current;
    if (!drag || drag.clave !== clave) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;

    const rect = pitchRef.current?.getBoundingClientRect();
    if (!rect) return;

    drag.moved = true;
    const left = clamp(((e.clientX - rect.left) / rect.width) * 100, MARGEN, 100 - MARGEN);
    const top = clamp(((e.clientY - rect.top) / rect.height) * 100, MARGEN, 100 - MARGEN);
    setPosOverrides((prev) => ({ ...prev, [clave]: { top, left } }));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLButtonElement>, clave: string) {
    const drag = dragRef.current;
    dragRef.current = null;
    // Solo si no se ha arrastrado cuenta como un toque: selecciona/deselecciona
    // como salida del cambio.
    if (drag && drag.clave === clave && !drag.moved) {
      setSaleKey((prev) => (prev === clave ? null : clave));
    }
  }

  function handleAplicarFormacion() {
    const formacion = FORMACIONES.find((f) => f.value === formacionValue);
    if (!formacion) return;
    const nuevo: Record<string, Posicion> = {};
    onceFinal.titulares.forEach((t, i) => {
      const clave = claveDe(t);
      const hueco = formacion.huecos[i];
      if (clave && hueco) {
        nuevo[clave] = { top: hueco.top, left: hueco.left };
      }
    });
    setPosOverrides((prev) => ({ ...prev, ...nuevo }));
  }

  async function handleConfirmar() {
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
    setMinuto("");
  }

  async function handleBorrar(grupoId: string) {
    setBorrando(grupoId);
    await eliminarCambioLocal(grupoId);
    setBorrando(null);
  }

  async function handleGuardarAlineacion() {
    setGuardandoAlineacion(true);
    const titulares = onceFinal.titulares.map((t) => {
      const clave = claveDe(t);
      const override = clave ? posOverrides[clave] : undefined;
      return {
        jugadorId: t.jugadorId,
        nombreLibre: t.nombreLibre,
        posicion: t.posicion ?? "",
        posX: override?.left ?? t.posX ?? undefined,
        posY: override?.top ?? t.posY ?? undefined,
      };
    });
    const suplentesIds = banquillo
      .filter((j) => !yaSalieron.has(j.id))
      .map((j) => j.id);

    const result = await guardarAlineacionFinalLocal(partidoId, titulares, suplentesIds);
    setGuardandoAlineacion(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Alineación guardada");
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          En el campo ({onceFinal.titulares.length}) — toca quién sale,
          arrastra para colocar
        </p>

        <div className="flex gap-2">
          <Select value={formacionValue} onValueChange={(v) => v && setFormacionValue(v)}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMACIONES.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={handleAplicarFormacion}>
            Aplicar
          </Button>
        </div>

        <div
          ref={pitchRef}
          className="relative mx-auto aspect-[2/3] w-full max-w-xs touch-none overflow-hidden rounded-lg bg-pitch"
        >
          <div className="absolute inset-x-0 top-1/2 h-px bg-white/40" />
          <div className="absolute top-1/2 left-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40" />
          <div className="absolute inset-x-[20%] top-0 h-[16%] border-x border-b border-white/40" />
          <div className="absolute inset-x-[20%] bottom-0 h-[16%] border-x border-t border-white/40" />
          <div className="absolute inset-x-[38%] top-0 h-[6%] border-x border-b border-white/40" />
          <div className="absolute inset-x-[38%] bottom-0 h-[6%] border-x border-t border-white/40" />

          {onceFinal.titulares.map((t, i) => {
            const jugador = t.jugadorId ? jugadoresPorId.get(t.jugadorId) : null;
            const clave = claveDe(t);
            const seleccionado = clave != null && clave === saleKey;
            const override = clave ? posOverrides[clave] : undefined;
            const top = override?.top ?? t.posY ?? 50;
            const left = override?.left ?? t.posX ?? 50;
            return (
              <button
                key={clave ?? `sin-clave-${i}`}
                type="button"
                disabled={!clave}
                onPointerDown={(e) => clave && handlePointerDown(e, clave)}
                onPointerMove={(e) => clave && handlePointerMove(e, clave)}
                onPointerUp={(e) => clave && handlePointerUp(e, clave)}
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

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          disabled={guardandoAlineacion}
          onClick={handleGuardarAlineacion}
        >
          <Save className="size-4" />
          {guardandoAlineacion ? "Guardando..." : "Guardar alineación"}
        </Button>
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
          disabled={!saleKey || !entraId || enviando}
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
            const nombreSale = jSale
              ? nombreMostrado(jSale)
              : (sale?.nombre_libre ?? "?");
            const jEntra = entra?.jugador_id
              ? jugadoresPorId.get(entra.jugador_id)
              : null;
            return (
              <li key={grupoId} className="flex items-center gap-3 p-3 text-sm">
                <span className="w-9 shrink-0 font-heading tabular-nums text-muted-foreground">
                  {sale?.minuto != null ? `${sale.minuto}'` : "—"}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="text-destructive">{nombreSale}</span>
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
