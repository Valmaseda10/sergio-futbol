"use client";

// Campograma en pequeño con la alineación que puso el rival contra
// nosotros: fichas rojas numeradas (igual que las fichas rival del
// campograma general), pero guardadas atadas a este rival en vez de a un
// campograma genérico, para verlas de un vistazo en su ficha de scouting.

import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { Pencil, Plus, Save, X } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { FORMACIONES } from "@/lib/formaciones";
import { guardarAlineacionRivalLocal } from "@/app/(app)/rivales/local-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Ficha {
  top: number;
  left: number;
  numero: number | null;
  nombre: string | null;
  suplente: boolean;
}

const MARGEN = 6;
const POSICIONES_SPAWN = [
  { top: 55, left: 50 },
  { top: 45, left: 30 },
  { top: 45, left: 70 },
  { top: 65, left: 30 },
  { top: 65, left: 70 },
];

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function AlineacionRival({ rivalId }: { rivalId: string }) {
  const guardadas = useLiveQuery(
    () =>
      localDb.rivales_alineacion
        .where("rival_id")
        .equals(rivalId)
        .sortBy("orden"),
    [rivalId],
    [],
  );

  const pitchRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; moved: boolean } | null>(
    null,
  );
  const spawnContador = useRef(0);
  const numeroContador = useRef(0);

  const [editando, setEditando] = useState(false);
  const [fichas, setFichas] = useState<Record<string, Ficha>>({});
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const [formacionValue, setFormacionValue] = useState(FORMACIONES[0].value);
  const [guardando, setGuardando] = useState(false);

  function entrarEdicion() {
    const iniciales: Record<string, Ficha> = {};
    guardadas.forEach((f) => {
      iniciales[f.id] = {
        top: f.pos_y,
        left: f.pos_x,
        numero: f.dorsal,
        nombre: f.nombre,
        suplente: f.suplente,
      };
    });
    numeroContador.current = guardadas.reduce(
      (max, f) => Math.max(max, f.dorsal ?? 0),
      0,
    );
    spawnContador.current = 0;
    setFichas(iniciales);
    setSeleccionada(null);
    setEditando(true);
  }

  function siguientePosicionSpawn() {
    const pos = POSICIONES_SPAWN[spawnContador.current % POSICIONES_SPAWN.length];
    spawnContador.current += 1;
    return pos;
  }

  function añadirFicha() {
    const id = crypto.randomUUID();
    numeroContador.current += 1;
    setFichas((prev) => ({
      ...prev,
      [id]: {
        ...siguientePosicionSpawn(),
        numero: numeroContador.current,
        nombre: null,
        suplente: false,
      },
    }));
    setSeleccionada(id);
  }

  function quitarFicha(id: string) {
    setFichas((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSeleccionada((sel) => (sel === id ? null : sel));
  }

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>, id: string) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, moved: false };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>, id: string) {
    const drag = dragRef.current;
    if (!drag || drag.id !== id) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;

    const rect = pitchRef.current?.getBoundingClientRect();
    if (!rect) return;

    drag.moved = true;
    const left = clamp(((e.clientX - rect.left) / rect.width) * 100, MARGEN, 100 - MARGEN);
    const top = clamp(((e.clientY - rect.top) / rect.height) * 100, MARGEN, 100 - MARGEN);
    setFichas((prev) => ({ ...prev, [id]: { ...prev[id], top, left } }));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLButtonElement>, id: string) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag && drag.id === id && !drag.moved) {
      setSeleccionada((sel) => (sel === id ? null : id));
    }
  }

  function handleAplicarFormacion() {
    const formacion = FORMACIONES.find((f) => f.value === formacionValue);
    if (!formacion) return;
    const nuevo: Record<string, Ficha> = {};
    formacion.huecos.forEach((hueco, i) => {
      nuevo[crypto.randomUUID()] = {
        top: hueco.top,
        left: hueco.left,
        numero: i + 1,
        nombre: null,
        suplente: false,
      };
    });
    numeroContador.current = formacion.huecos.length;
    setFichas(nuevo);
    setSeleccionada(null);
  }

  async function handleGuardar() {
    setGuardando(true);
    const result = await guardarAlineacionRivalLocal(
      rivalId,
      Object.values(fichas).map((f) => ({
        nombre: f.nombre,
        dorsal: f.numero,
        posX: f.left,
        posY: f.top,
        suplente: f.suplente,
      })),
    );
    setGuardando(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Alineación guardada");
    setEditando(false);
    setSeleccionada(null);
  }

  const fichaSeleccionada = seleccionada ? fichas[seleccionada] : null;
  const listaVista = editando
    ? Object.entries(fichas)
    : guardadas.map(
        (f) =>
          [
            f.id,
            {
              top: f.pos_y,
              left: f.pos_x,
              numero: f.dorsal,
              nombre: f.nombre,
              suplente: f.suplente,
            },
          ] as const,
      );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Alineación contra nosotros</CardTitle>
        {editando ? (
          <Button type="button" size="sm" disabled={guardando} onClick={handleGuardar}>
            <Save className="size-3.5" />
            {guardando ? "Guardando..." : "Guardar"}
          </Button>
        ) : (
          <Button type="button" size="sm" variant="ghost" onClick={entrarEdicion}>
            <Pencil className="size-3.5" />
            Editar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {editando && (
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
            <Button type="button" variant="outline" size="sm" onClick={handleAplicarFormacion}>
              Aplicar
            </Button>
          </div>
        )}

        <div
          ref={pitchRef}
          className="relative mx-auto aspect-[2/3] w-full max-w-[180px] touch-none overflow-hidden rounded-lg bg-pitch"
        >
          <div className="absolute inset-x-0 top-1/2 h-px bg-white/40" />
          <div className="absolute top-1/2 left-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40" />
          <div className="absolute inset-x-[20%] top-0 h-[14%] border-x border-b border-white/40" />
          <div className="absolute inset-x-[20%] bottom-0 h-[14%] border-x border-t border-white/40" />

          {listaVista.map(([id, f]) => (
            <button
              key={id}
              type="button"
              disabled={!editando}
              aria-label={f.numero ? `Ficha ${f.numero}` : "Ficha"}
              onPointerDown={(e) => editando && handlePointerDown(e, id)}
              onPointerMove={(e) => editando && handlePointerMove(e, id)}
              onPointerUp={(e) => editando && handlePointerUp(e, id)}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ top: `${f.top}%`, left: `${f.left}%` }}
            >
              <span
                className={`flex size-7 items-center justify-center rounded-full border-2 font-heading text-[11px] tabular-nums text-white shadow ${
                  seleccionada === id ? "border-gold" : "border-white"
                } ${f.suplente ? "bg-red-500" : "bg-blue-600"}`}
              >
                {f.numero ?? "?"}
              </span>
            </button>
          ))}
        </div>

        {listaVista.length > 0 && (
          <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="size-2.5 rounded-full bg-blue-600" />
              Titular
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2.5 rounded-full bg-red-500" />
              Salió del banquillo
            </span>
          </div>
        )}

        {editando && (
          <>
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={añadirFicha}>
              <Plus className="size-3.5" />
              Añadir jugador
            </Button>

            {fichaSeleccionada && seleccionada && (
              <div className="space-y-2 rounded-md border p-2">
                <div className="flex items-end gap-2">
                  <div className="w-16 space-y-1">
                    <label className="text-[10px] text-muted-foreground">Dorsal</label>
                    <Input
                      type="number"
                      min={1}
                      max={99}
                      value={fichaSeleccionada.numero ?? ""}
                      onChange={(e) =>
                        setFichas((prev) => ({
                          ...prev,
                          [seleccionada]: {
                            ...prev[seleccionada],
                            numero: e.target.value ? Number(e.target.value) : null,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] text-muted-foreground">Nombre (opcional)</label>
                    <Input
                      value={fichaSeleccionada.nombre ?? ""}
                      onChange={(e) =>
                        setFichas((prev) => ({
                          ...prev,
                          [seleccionada]: { ...prev[seleccionada], nombre: e.target.value || null },
                        }))
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Quitar ficha"
                    onClick={() => quitarFicha(seleccionada)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={
                    fichaSeleccionada.suplente
                      ? "w-full border-red-500 bg-red-500/10 text-red-600 hover:bg-red-500/20 hover:text-red-600"
                      : "w-full"
                  }
                  onClick={() =>
                    setFichas((prev) => ({
                      ...prev,
                      [seleccionada]: {
                        ...prev[seleccionada],
                        suplente: !prev[seleccionada].suplente,
                      },
                    }))
                  }
                >
                  {fichaSeleccionada.suplente
                    ? "Salió del banquillo"
                    : "Marcar como suplente que entró"}
                </Button>
              </div>
            )}
          </>
        )}

        {!editando && guardadas.length === 0 && (
          <p className="text-center text-xs text-muted-foreground">
            Sin alineación registrada todavía.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
