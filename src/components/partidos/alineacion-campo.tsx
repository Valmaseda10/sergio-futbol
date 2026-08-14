"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { FORMACIONES, type Formacion } from "@/lib/formaciones";
import { guardarAlineacionLocal } from "@/app/(app)/partidos/local-actions";
import { createClient } from "@/lib/supabase/client";
import { JugadorAvatar } from "@/components/plantilla/jugador-avatar";
import { Button } from "@/components/ui/button";
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

interface Jugador {
  id: string;
  nombre: string;
  apellidos: string;
  alias: string | null;
  dorsal: number | null;
  foto_url: string | null;
}

interface Posicion {
  top: number;
  left: number;
}

const MARGEN = 5;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function nombreCampo(j: Jugador) {
  return j.alias || j.apellidos;
}

function nombreCompleto(j: Jugador) {
  return j.alias ? `${j.alias} (${j.nombre} ${j.apellidos})` : `${j.nombre} ${j.apellidos}`;
}

function remapearAFormacion(
  pares: { jugadorId: string; label: string }[],
  formacion: Formacion,
) {
  const restantes = [...pares];
  const resultado: Record<string, string> = {};

  for (const hueco of formacion.huecos) {
    const idx = restantes.findIndex((p) => p.label === hueco.label);
    if (idx !== -1) {
      resultado[hueco.id] = restantes[idx].jugadorId;
      restantes.splice(idx, 1);
    }
  }

  return resultado;
}

function mejorFormacionInicial(pares: { jugadorId: string; label: string }[]) {
  if (pares.length === 0) return FORMACIONES[0];

  let mejor = FORMACIONES[0];
  let mejorPuntuacion = -1;

  for (const formacion of FORMACIONES) {
    const asignados = Object.keys(remapearAFormacion(pares, formacion)).length;
    if (asignados > mejorPuntuacion) {
      mejorPuntuacion = asignados;
      mejor = formacion;
    }
  }

  return mejor;
}

export function AlineacionCampo({
  partidoId,
  convocados,
  titularesIniciales,
}: {
  partidoId: string;
  convocados: Jugador[];
  titularesIniciales: {
    jugadorId: string;
    posicion: string;
    posX?: number;
    posY?: number;
  }[];
}) {
  const router = useRouter();
  const pitchRef = useRef<HTMLDivElement>(null);
  const paresIniciales = titularesIniciales.map((t) => ({
    jugadorId: t.jugadorId,
    label: t.posicion,
  }));

  const [formacion, setFormacion] = useState<Formacion>(() =>
    mejorFormacionInicial(paresIniciales),
  );
  const [asignaciones, setAsignaciones] = useState<Record<string, string>>(
    () => remapearAFormacion(paresIniciales, mejorFormacionInicial(paresIniciales)),
  );
  const [posiciones, setPosiciones] = useState<Record<string, Posicion>>(() => {
    const inicial: Record<string, Posicion> = {};
    for (const t of titularesIniciales) {
      if (t.posX != null && t.posY != null) {
        inicial[t.jugadorId] = { left: t.posX, top: t.posY };
      }
    }
    return inicial;
  });
  const [huecoAbierto, setHuecoAbierto] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [fotoUrls, setFotoUrls] = useState<Record<string, string>>({});

  const dragRef = useRef<{
    huecoId: string;
    jugadorId: string;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  const jugadoresPorId = useMemo(
    () => new Map(convocados.map((j) => [j.id, j])),
    [convocados],
  );

  const rutasFoto = useMemo(
    () => convocados.map((j) => j.foto_url).filter((v): v is string => !!v),
    [convocados],
  );
  const rutasFotoKey = rutasFoto.join(",");

  useEffect(() => {
    if (rutasFoto.length === 0 || !navigator.onLine) return;
    const supabase = createClient();
    supabase.storage
      .from("jugadores")
      .createSignedUrls(rutasFoto, 3600)
      .then(({ data }) => {
        if (!data) return;
        setFotoUrls((prev) => {
          const next = { ...prev };
          for (const d of data) {
            if (d.signedUrl && d.path) next[d.path] = d.signedUrl;
          }
          return next;
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rutasFotoKey]);

  const asignadosIds = new Set(Object.values(asignaciones));
  const disponibles = convocados.filter((j) => !asignadosIds.has(j.id));

  function handleCambiarFormacion(nuevoValue: string | null) {
    const nuevaFormacion = FORMACIONES.find((f) => f.value === nuevoValue);
    if (!nuevaFormacion) return;

    const paresActuales = Object.entries(asignaciones).map(
      ([huecoId, jugadorId]) => ({
        jugadorId,
        label: formacion.huecos.find((h) => h.id === huecoId)?.label ?? "",
      }),
    );

    setFormacion(nuevaFormacion);
    setAsignaciones(remapearAFormacion(paresActuales, nuevaFormacion));
  }

  function handleAsignar(huecoId: string, jugadorId: string) {
    setAsignaciones((prev) => ({ ...prev, [huecoId]: jugadorId }));
    setHuecoAbierto(null);
  }

  function handleQuitar(huecoId: string) {
    setAsignaciones((prev) => {
      const next = { ...prev };
      delete next[huecoId];
      return next;
    });
    setHuecoAbierto(null);
  }

  function handlePointerDown(
    e: React.PointerEvent<HTMLButtonElement>,
    huecoId: string,
    jugadorId: string,
  ) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      huecoId,
      jugadorId,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
  }

  function handlePointerMove(
    e: React.PointerEvent<HTMLButtonElement>,
    huecoId: string,
  ) {
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
    setPosiciones((prev) => ({ ...prev, [drag.jugadorId]: { top, left } }));
  }

  function handlePointerUp(
    e: React.PointerEvent<HTMLButtonElement>,
    huecoId: string,
  ) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag && drag.huecoId === huecoId && !drag.moved) {
      setHuecoAbierto(huecoId);
    }
  }

  async function handleGuardar() {
    setGuardando(true);
    const titulares = Object.entries(asignaciones).map(([huecoId, jugadorId]) => {
      const hueco = formacion.huecos.find((h) => h.id === huecoId);
      const pos = posiciones[jugadorId];
      return {
        jugadorId,
        posicion: hueco?.label ?? "",
        posX: pos?.left ?? hueco?.left,
        posY: pos?.top ?? hueco?.top,
      };
    });
    const suplentesIds = disponibles.map((j) => j.id);

    const result = await guardarAlineacionLocal(partidoId, titulares, suplentesIds);
    setGuardando(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Alineación guardada");
    router.push(`/partidos/${partidoId}`);
  }

  const huecoActivo = formacion.huecos.find((h) => h.id === huecoAbierto);
  const jugadorEnHuecoActivo = huecoAbierto
    ? jugadoresPorId.get(asignaciones[huecoAbierto] ?? "")
    : undefined;

  return (
    <div className="space-y-4">
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
        Toca una ficha para asignarla; mantén y arrastra para moverla libremente por el campo.
      </p>

      <div
        ref={pitchRef}
        className="relative aspect-[2/3] w-full touch-none overflow-hidden rounded-lg bg-pitch"
      >
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/40" />
        <div className="absolute top-1/2 left-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40" />
        <div className="absolute inset-x-[20%] top-0 h-[12%] border-x border-b border-white/40" />
        <div className="absolute inset-x-[20%] bottom-0 h-[12%] border-x border-t border-white/40" />
        <div className="absolute inset-x-[42%] top-0 h-[3%] border-x-2 border-b-2 border-white/70" />
        <div className="absolute inset-x-[42%] bottom-0 h-[3%] border-x-2 border-t-2 border-white/70" />

        {formacion.huecos.map((hueco) => {
          const jugadorId = asignaciones[hueco.id];
          const jugador = jugadoresPorId.get(jugadorId ?? "");
          const pos = (jugadorId && posiciones[jugadorId]) || {
            top: hueco.top,
            left: hueco.left,
          };
          return (
            <button
              key={hueco.id}
              type="button"
              onPointerDown={
                jugador
                  ? (e) => handlePointerDown(e, hueco.id, jugador.id)
                  : undefined
              }
              onPointerMove={
                jugador ? (e) => handlePointerMove(e, hueco.id) : undefined
              }
              onPointerUp={(e) =>
                jugador ? handlePointerUp(e, hueco.id) : setHuecoAbierto(hueco.id)
              }
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
              style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
            >
              <span
                className={
                  jugador
                    ? "flex size-9 items-center justify-center rounded-full border-2 border-gold bg-white font-heading text-sm tabular-nums text-foreground shadow"
                    : "flex size-9 items-center justify-center rounded-full border-2 border-dashed border-white/70 text-white/70"
                }
              >
                {jugador ? (jugador.dorsal ?? jugador.nombre[0]) : "+"}
              </span>
              <span className="max-w-16 truncate rounded bg-black/40 px-1 text-[10px] text-white">
                {jugador ? nombreCampo(jugador) : hueco.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Suplentes ({disponibles.length})
        </p>
        {disponibles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todos los convocados están en el campo.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {disponibles.map((j) => (
              <li
                key={j.id}
                className="flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm"
              >
                <JugadorAvatar
                  src={j.foto_url ? fotoUrls[j.foto_url] ?? null : null}
                  nombre={j.nombre}
                  apellidos={j.apellidos}
                  className="size-6"
                />
                {j.dorsal != null ? `${j.dorsal} · ` : ""}
                {nombreCampo(j)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Button onClick={handleGuardar} disabled={guardando} className="w-full">
        {guardando ? "Guardando..." : "Guardar alineación"}
      </Button>

      <Dialog
        open={huecoAbierto !== null}
        onOpenChange={(open) => !open && setHuecoAbierto(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{huecoActivo?.label}</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {jugadorEnHuecoActivo && (
              <button
                type="button"
                onClick={() => huecoAbierto && handleQuitar(huecoAbierto)}
                className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm text-destructive hover:bg-destructive/10"
              >
                <X className="size-4" />
                Quitar a {nombreCampo(jugadorEnHuecoActivo)}
              </button>
            )}
            {disponibles.length === 0 && !jugadorEnHuecoActivo && (
              <p className="p-2 text-sm text-muted-foreground">
                No quedan convocados libres.
              </p>
            )}
            {disponibles.map((j) => (
              <button
                key={j.id}
                type="button"
                onClick={() => huecoAbierto && handleAsignar(huecoAbierto, j.id)}
                className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-muted"
              >
                <JugadorAvatar
                  src={j.foto_url ? fotoUrls[j.foto_url] ?? null : null}
                  nombre={j.nombre}
                  apellidos={j.apellidos}
                  className="size-7"
                />
                {j.dorsal != null ? `${j.dorsal} · ` : ""}
                {nombreCompleto(j)}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
