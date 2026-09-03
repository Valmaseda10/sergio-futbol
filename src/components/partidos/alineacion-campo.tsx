"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import {
  FORMACIONES,
  mejorFormacionInicial,
  remapearAFormacion,
  type Formacion,
} from "@/lib/formaciones";
import { createClient } from "@/lib/supabase/client";
import { JugadorAvatar } from "@/components/plantilla/jugador-avatar";
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

interface EntradaLibre {
  nombre: string;
}

interface Ficha {
  esLibre: boolean;
  dorsal: number | null;
  nombreCampo: string;
  nombreCompleto: string;
  fotoUrl: string | null;
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

export function AlineacionCampo({
  titulo,
  convocados,
  titularesIniciales,
  onGuardar,
}: {
  titulo?: string;
  convocados: Jugador[];
  titularesIniciales: {
    jugadorId: string | null;
    nombreLibre?: string | null;
    posicion: string;
    posX?: number;
    posY?: number;
  }[];
  onGuardar: (
    titulares: {
      jugadorId: string | null;
      nombreLibre?: string | null;
      posicion: string;
      posX?: number;
      posY?: number;
    }[],
    suplentesIds: string[],
  ) => Promise<{ error: string } | { success: true }>;
}) {
  const pitchRef = useRef<HTMLDivElement>(null);

  // Los jugadores "solo por hoy" (invitados/de prueba, sin fila real en
  // `jugadores`) no tienen un id estable: se les da uno sintético una sola
  // vez al montar, a partir de lo ya guardado (nombre_libre).
  const [entradasLibresIniciales] = useState<Record<string, EntradaLibre>>(() => {
    const mapa: Record<string, EntradaLibre> = {};
    titularesIniciales
      .filter((t) => t.jugadorId == null)
      .forEach((t) => {
        mapa[crypto.randomUUID()] = { nombre: t.nombreLibre ?? "" };
      });
    return mapa;
  });
  const idsLibresIniciales = Object.keys(entradasLibresIniciales);

  const paresIniciales = [
    ...titularesIniciales
      .filter((t) => t.jugadorId != null)
      .map((t) => ({ id: t.jugadorId as string, label: t.posicion })),
    ...titularesIniciales
      .filter((t) => t.jugadorId == null)
      .map((t, i) => ({ id: idsLibresIniciales[i], label: t.posicion })),
  ];

  const [formacion, setFormacion] = useState<Formacion>(() =>
    mejorFormacionInicial(paresIniciales),
  );
  const [asignaciones, setAsignaciones] = useState<Record<string, string>>(
    () => remapearAFormacion(paresIniciales, mejorFormacionInicial(paresIniciales)),
  );
  const [posiciones, setPosiciones] = useState<Record<string, Posicion>>(() => {
    const inicial: Record<string, Posicion> = {};
    titularesIniciales
      .filter((t) => t.jugadorId != null)
      .forEach((t) => {
        if (t.posX != null && t.posY != null) {
          inicial[t.jugadorId as string] = { left: t.posX, top: t.posY };
        }
      });
    titularesIniciales
      .filter((t) => t.jugadorId == null)
      .forEach((t, i) => {
        if (t.posX != null && t.posY != null) {
          inicial[idsLibresIniciales[i]] = { left: t.posX, top: t.posY };
        }
      });
    return inicial;
  });
  const [entradasLibres, setEntradasLibres] =
    useState<Record<string, EntradaLibre>>(entradasLibresIniciales);
  const [nombreLibreForm, setNombreLibreForm] = useState("");
  const [huecoAbierto, setHuecoAbierto] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [fotoUrls, setFotoUrls] = useState<Record<string, string>>({});

  const dragRef = useRef<{
    huecoId: string;
    id: string;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  const jugadoresPorId = useMemo(
    () => new Map(convocados.map((j) => [j.id, j])),
    [convocados],
  );

  function fichaPara(id: string | undefined): Ficha | undefined {
    if (!id) return undefined;
    const jugador = jugadoresPorId.get(id);
    if (jugador) {
      return {
        esLibre: false,
        dorsal: jugador.dorsal,
        nombreCampo: nombreCampo(jugador),
        nombreCompleto: nombreCompleto(jugador),
        fotoUrl: jugador.foto_url,
      };
    }
    const libre = entradasLibres[id];
    if (libre) {
      return {
        esLibre: true,
        dorsal: null,
        nombreCampo: libre.nombre,
        nombreCompleto: libre.nombre,
        fotoUrl: null,
      };
    }
    return undefined;
  }

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
      ([huecoId, id]) => ({
        id,
        label: formacion.huecos.find((h) => h.id === huecoId)?.label ?? "",
      }),
    );

    setFormacion(nuevaFormacion);
    setAsignaciones(remapearAFormacion(paresActuales, nuevaFormacion));
  }

  function handleAsignar(huecoId: string, id: string) {
    setAsignaciones((prev) => ({ ...prev, [huecoId]: id }));
    setHuecoAbierto(null);
  }

  function handleAñadirLibre() {
    if (!huecoAbierto) return;
    const nombre = nombreLibreForm.trim();
    if (!nombre) {
      toast.error("Escribe un nombre");
      return;
    }
    const id = crypto.randomUUID();
    setEntradasLibres((prev) => ({ ...prev, [id]: { nombre } }));
    setAsignaciones((prev) => ({ ...prev, [huecoAbierto]: id }));
    setNombreLibreForm("");
    setHuecoAbierto(null);
  }

  function handleQuitar(huecoId: string) {
    const id = asignaciones[huecoId];
    setAsignaciones((prev) => {
      const next = { ...prev };
      delete next[huecoId];
      return next;
    });
    // Un jugador "solo por hoy" no tiene sentido guardado en ningún sitio si
    // no está en el campo (no es un convocado real que pueda ir al
    // banquillo), así que al quitarlo se olvida del todo.
    if (id && entradasLibres[id]) {
      setEntradasLibres((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
    setHuecoAbierto(null);
  }

  function handlePointerDown(
    e: React.PointerEvent<HTMLButtonElement>,
    huecoId: string,
    id: string,
  ) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      huecoId,
      id,
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
    setPosiciones((prev) => ({ ...prev, [drag.id]: { top, left } }));
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
    const titulares = Object.entries(asignaciones).map(([huecoId, id]) => {
      const hueco = formacion.huecos.find((h) => h.id === huecoId);
      const pos = posiciones[id];
      const esReal = jugadoresPorId.has(id);
      return {
        jugadorId: esReal ? id : null,
        nombreLibre: esReal ? null : entradasLibres[id]?.nombre ?? null,
        posicion: hueco?.label ?? "",
        posX: pos?.left ?? hueco?.left,
        posY: pos?.top ?? hueco?.top,
      };
    });
    const suplentesIds = disponibles.map((j) => j.id);

    const result = await onGuardar(titulares, suplentesIds);
    setGuardando(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Alineación guardada");
  }

  const huecoActivo = formacion.huecos.find((h) => h.id === huecoAbierto);
  const fichaEnHuecoActivo = huecoAbierto
    ? fichaPara(asignaciones[huecoAbierto])
    : undefined;

  return (
    <div className="space-y-4">
      {titulo && <h2 className="text-base font-semibold">{titulo}</h2>}
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
        Toca una ficha para asignarla (o escribe el nombre de alguien solo para
        hoy); mantén y arrastra para moverla libremente por el campo.
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
          const id = asignaciones[hueco.id];
          const ficha = fichaPara(id);
          const pos = (id && posiciones[id]) || {
            top: hueco.top,
            left: hueco.left,
          };
          return (
            <button
              key={hueco.id}
              type="button"
              onPointerDown={
                ficha ? (e) => handlePointerDown(e, hueco.id, id) : undefined
              }
              onPointerMove={
                ficha ? (e) => handlePointerMove(e, hueco.id) : undefined
              }
              onPointerUp={(e) =>
                ficha ? handlePointerUp(e, hueco.id) : setHuecoAbierto(hueco.id)
              }
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
              style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
            >
              <span
                className={
                  ficha
                    ? "flex size-9 items-center justify-center rounded-full border-2 border-gold bg-white font-heading text-sm tabular-nums text-foreground shadow"
                    : "flex size-9 items-center justify-center rounded-full border-2 border-dashed border-white/70 text-white/70"
                }
              >
                {ficha ? (ficha.dorsal ?? ficha.nombreCampo[0]) : "+"}
              </span>
              <span className="max-w-16 truncate rounded bg-black/40 px-1 text-[10px] text-white">
                {ficha ? ficha.nombreCampo : hueco.label}
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
          <div className="space-y-3">
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {fichaEnHuecoActivo && (
                <button
                  type="button"
                  onClick={() => huecoAbierto && handleQuitar(huecoAbierto)}
                  className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm text-destructive hover:bg-destructive/10"
                >
                  <X className="size-4" />
                  Quitar a {fichaEnHuecoActivo.nombreCampo}
                </button>
              )}
              {disponibles.length === 0 && !fichaEnHuecoActivo && (
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

            <div className="space-y-2 border-t pt-3">
              <Label htmlFor="nombreLibreAlineacion">
                O escribe a alguien solo para hoy
              </Label>
              <div className="flex gap-2">
                <Input
                  id="nombreLibreAlineacion"
                  value={nombreLibreForm}
                  onChange={(e) => setNombreLibreForm(e.target.value)}
                  placeholder="Ej: un jugador de prueba"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAñadirLibre();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={handleAñadirLibre}>
                  Añadir
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
