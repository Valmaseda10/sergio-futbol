"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  FORMACIONES,
  mejorFormacionInicial,
  remapearAFormacion,
  type Formacion,
} from "@/lib/formaciones";
import {
  guardarCampogramaRivalLocal,
  type RivalTitularGuardar,
} from "@/app/(app)/campograma/local-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Posicion {
  top: number;
  left: number;
}

interface EntradaRival {
  nombre: string;
  dorsal: number | null;
}

const MARGEN = 5;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export interface CampogramaRivalInicial {
  titulares: {
    nombre: string;
    dorsal: number | null;
    posicion: string | null;
    left: number;
    top: number;
  }[];
}

export function CampogramaRivalCampo({
  campogramaId,
  inicial,
}: {
  campogramaId: string;
  inicial?: CampogramaRivalInicial;
}) {
  const pitchRef = useRef<HTMLDivElement>(null);

  // Cada jugador rival se identifica con un id sintético (no existe una fila
  // real en `jugadores`, son de otro equipo), generado una sola vez al
  // montar a partir de lo ya guardado.
  const [entradasIniciales] = useState<Record<string, EntradaRival>>(() => {
    const mapa: Record<string, EntradaRival> = {};
    (inicial?.titulares ?? []).forEach((t) => {
      mapa[crypto.randomUUID()] = { nombre: t.nombre, dorsal: t.dorsal };
    });
    return mapa;
  });
  const paresIniciales = Object.entries(entradasIniciales).map(([id], i) => ({
    id,
    label: inicial?.titulares[i]?.posicion ?? "",
  }));

  const [entradas, setEntradas] = useState<Record<string, EntradaRival>>(entradasIniciales);
  const [formacion, setFormacion] = useState<Formacion>(() =>
    mejorFormacionInicial(paresIniciales),
  );
  const [asignaciones, setAsignaciones] = useState<Record<string, string>>(() =>
    remapearAFormacion(paresIniciales, mejorFormacionInicial(paresIniciales)),
  );
  const [posiciones, setPosiciones] = useState<Record<string, Posicion>>(() => {
    const mapa: Record<string, Posicion> = {};
    const ids = Object.keys(entradasIniciales);
    (inicial?.titulares ?? []).forEach((t, i) => {
      const id = ids[i];
      if (id) mapa[id] = { left: t.left, top: t.top };
    });
    return mapa;
  });
  const [huecoAbierto, setHuecoAbierto] = useState<string | null>(null);
  const [nombreForm, setNombreForm] = useState("");
  const [dorsalForm, setDorsalForm] = useState("");
  const [guardando, setGuardando] = useState(false);

  const dragRef = useRef<{
    huecoId: string;
    entryId: string;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  function abrirHueco(huecoId: string) {
    const entryId = asignaciones[huecoId];
    const entrada = entryId ? entradas[entryId] : undefined;
    setNombreForm(entrada?.nombre ?? "");
    setDorsalForm(entrada?.dorsal != null ? String(entrada.dorsal) : "");
    setHuecoAbierto(huecoId);
  }

  function handleGuardarHueco() {
    if (!huecoAbierto) return;
    const nombre = nombreForm.trim();
    if (!nombre) {
      toast.error("Ponle un nombre al jugador rival");
      return;
    }
    const dorsal = dorsalForm.trim() ? Number(dorsalForm.trim()) : null;

    const entryIdExistente = asignaciones[huecoAbierto];
    const entryId = entryIdExistente ?? crypto.randomUUID();
    setEntradas((prev) => ({ ...prev, [entryId]: { nombre, dorsal } }));
    setAsignaciones((prev) => ({ ...prev, [huecoAbierto]: entryId }));
    setHuecoAbierto(null);
  }

  function handleQuitarHueco() {
    if (!huecoAbierto) return;
    setAsignaciones((prev) => {
      const next = { ...prev };
      delete next[huecoAbierto];
      return next;
    });
    setHuecoAbierto(null);
  }

  function handleCambiarFormacion(nuevoValue: string | null) {
    const nuevaFormacion = FORMACIONES.find((f) => f.value === nuevoValue);
    if (!nuevaFormacion) return;

    const paresActuales = Object.entries(asignaciones).map(([huecoId, entryId]) => ({
      id: entryId,
      label: formacion.huecos.find((h) => h.id === huecoId)?.label ?? "",
    }));

    setFormacion(nuevaFormacion);
    setAsignaciones(remapearAFormacion(paresActuales, nuevaFormacion));
  }

  function handlePointerDown(
    e: React.PointerEvent<HTMLButtonElement>,
    huecoId: string,
    entryId: string,
  ) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { huecoId, entryId, startX: e.clientX, startY: e.clientY, moved: false };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>, huecoId: string) {
    const drag = dragRef.current;
    if (!drag || drag.huecoId !== huecoId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;

    const rect = pitchRef.current?.getBoundingClientRect();
    if (!rect) return;

    drag.moved = true;
    const left = clamp(((e.clientX - rect.left) / rect.width) * 100, MARGEN, 100 - MARGEN);
    const top = clamp(((e.clientY - rect.top) / rect.height) * 100, MARGEN, 100 - MARGEN);
    setPosiciones((prev) => ({ ...prev, [drag.entryId]: { top, left } }));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLButtonElement>, huecoId: string) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag && drag.huecoId === huecoId && !drag.moved) {
      abrirHueco(huecoId);
    }
  }

  async function handleGuardar() {
    setGuardando(true);
    const titulares: RivalTitularGuardar[] = Object.entries(asignaciones).map(
      ([huecoId, entryId]) => {
        const hueco = formacion.huecos.find((h) => h.id === huecoId);
        const pos = posiciones[entryId];
        const entrada = entradas[entryId];
        return {
          nombre: entrada?.nombre ?? "",
          dorsal: entrada?.dorsal ?? null,
          posicion: hueco?.label ?? "",
          posX: pos?.left ?? hueco?.left ?? 50,
          posY: pos?.top ?? hueco?.top ?? 50,
        };
      },
    );

    const result = await guardarCampogramaRivalLocal(campogramaId, titulares);
    setGuardando(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Alineación rival guardada");
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Alineación del rival</h2>
      <Select value={formacion.value} onValueChange={handleCambiarFormacion}>
        <SelectTrigger className="w-full">
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

      <p className="text-xs text-muted-foreground">
        Toca un hueco vacío para escribir el nombre de un jugador rival;
        arrastra una ficha ya puesta para moverla.
      </p>

      <div
        ref={pitchRef}
        className="relative mx-auto aspect-[2/3] h-[46vh] max-h-[420px] w-auto touch-none overflow-hidden rounded-lg bg-pitch"
      >
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/40" />
        <div className="absolute top-1/2 left-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40" />
        <div className="absolute inset-x-[20%] top-0 h-[12%] border-x border-b border-white/40" />
        <div className="absolute inset-x-[20%] bottom-0 h-[12%] border-x border-t border-white/40" />
        <div className="absolute inset-x-[42%] top-0 h-[3%] border-x-2 border-b-2 border-white/70" />
        <div className="absolute inset-x-[42%] bottom-0 h-[3%] border-x-2 border-t-2 border-white/70" />

        {formacion.huecos.map((hueco) => {
          const entryId = asignaciones[hueco.id];
          const entrada = entryId ? entradas[entryId] : undefined;
          const pos = (entryId && posiciones[entryId]) || { top: hueco.top, left: hueco.left };
          return (
            <button
              key={hueco.id}
              type="button"
              onPointerDown={
                entrada ? (e) => handlePointerDown(e, hueco.id, entryId) : undefined
              }
              onPointerMove={entrada ? (e) => handlePointerMove(e, hueco.id) : undefined}
              onPointerUp={(e) => (entrada ? handlePointerUp(e, hueco.id) : abrirHueco(hueco.id))}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
              style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
            >
              <span
                className={
                  entrada
                    ? "flex size-9 items-center justify-center rounded-full border-2 border-destructive bg-white font-heading text-sm tabular-nums text-foreground shadow"
                    : "flex size-9 items-center justify-center rounded-full border-2 border-dashed border-white/70 text-white/70"
                }
              >
                {entrada ? (entrada.dorsal ?? entrada.nombre[0]) : "+"}
              </span>
              <span className="max-w-16 truncate rounded bg-black/40 px-1 text-[10px] text-white">
                {entrada ? entrada.nombre : hueco.label}
              </span>
            </button>
          );
        })}
      </div>

      <Button onClick={handleGuardar} disabled={guardando} className="w-full">
        {guardando ? "Guardando..." : "Guardar alineación rival"}
      </Button>

      <Dialog
        open={huecoAbierto !== null}
        onOpenChange={(open) => !open && setHuecoAbierto(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {formacion.huecos.find((h) => h.id === huecoAbierto)?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="nombreRival">Nombre</Label>
              <Input
                id="nombreRival"
                value={nombreForm}
                onChange={(e) => setNombreForm(e.target.value)}
                placeholder="Ej: González"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dorsalRival">Dorsal (opcional)</Label>
              <Input
                id="dorsalRival"
                type="number"
                value={dorsalForm}
                onChange={(e) => setDorsalForm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={handleGuardarHueco} className="flex-1">
                Guardar
              </Button>
              {huecoAbierto && asignaciones[huecoAbierto] && (
                <Button type="button" variant="outline" onClick={handleQuitarHueco}>
                  <Trash2 className="size-4" />
                  Quitar
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
