"use client";

// Campograma con las dos alineaciones sobre el mismo campo: nuestro equipo
// (fichas doradas, ataca hacia arriba) y el rival (fichas rojas, reflejado
// verticalmente para simular que defiende el lado contrario), para poder
// compararlas de un vistazo en vez de en dos campos separados.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Save, Trash2, X } from "lucide-react";
import {
  FORMACIONES,
  mejorFormacionInicial,
  remapearAFormacion,
  type Formacion,
} from "@/lib/formaciones";
import {
  guardarCampogramaLocal,
  guardarCampogramaRivalLocal,
  type RivalTitularGuardar,
} from "@/app/(app)/campograma/local-actions";
import type { CampogramaInicial } from "@/components/campograma/campograma-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
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
}

interface Posicion {
  top: number;
  left: number;
}

interface EntradaRival {
  nombre: string;
  dorsal: number | null;
}

const MARGEN = 5;

const POSICIONES_SPAWN: Posicion[] = [
  { top: 15, left: 25 },
  { top: 15, left: 50 },
  { top: 15, left: 75 },
  { top: 26, left: 37 },
  { top: 26, left: 63 },
];

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function nombreJugador(j: Jugador) {
  return j.alias || j.apellidos;
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

export function CampogramaCampoUnificado({
  campogramaId,
  jugadores,
  inicial,
  inicialRival,
}: {
  campogramaId: string;
  jugadores: Jugador[];
  inicial?: CampogramaInicial;
  inicialRival?: CampogramaRivalInicial;
}) {
  const router = useRouter();
  const pitchRef = useRef<HTMLDivElement>(null);

  // --- Nuestro equipo ---
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [notas, setNotas] = useState(inicial?.notas ?? "");
  const [posiciones, setPosiciones] = useState<Record<string, Posicion>>(
    () =>
      Object.fromEntries(
        (inicial?.titulares ?? []).map((t) => [t.jugadorId, { top: t.top, left: t.left }]),
      ),
  );
  const [suplentes, setSuplentes] = useState<string[]>(inicial?.suplentesIds ?? []);
  const [formacionValue, setFormacionValue] = useState(FORMACIONES[0].value);
  const [guardando, setGuardando] = useState(false);

  const dragRef = useRef<{ jugadorId: string; startX: number; startY: number; moved: boolean } | null>(
    null,
  );
  const spawnContador = useRef(0);

  const jugadoresPorId = new Map(jugadores.map((j) => [j.id, j]));
  const titulares = jugadores.filter((j) => posiciones[j.id]);
  const enSuplentes = suplentes
    .map((id) => jugadoresPorId.get(id))
    .filter((j): j is Jugador => !!j);
  const disponibles = jugadores.filter((j) => !posiciones[j.id] && !suplentes.includes(j.id));

  function siguientePosicionSpawn(): Posicion {
    const pos = POSICIONES_SPAWN[spawnContador.current % POSICIONES_SPAWN.length];
    spawnContador.current += 1;
    return pos;
  }

  function añadirATitular(jugadorId: string) {
    setPosiciones((prev) => ({ ...prev, [jugadorId]: siguientePosicionSpawn() }));
    setSuplentes((prev) => prev.filter((id) => id !== jugadorId));
  }

  function quitarDeTitular(jugadorId: string) {
    setPosiciones((prev) => {
      const next = { ...prev };
      delete next[jugadorId];
      return next;
    });
  }

  function añadirASuplente(jugadorId: string) {
    setSuplentes((prev) => (prev.includes(jugadorId) ? prev : [...prev, jugadorId]));
  }

  function quitarDeSuplente(jugadorId: string) {
    setSuplentes((prev) => prev.filter((id) => id !== jugadorId));
  }

  function moverSuplente(jugadorId: string, direccion: -1 | 1) {
    setSuplentes((prev) => {
      const i = prev.indexOf(jugadorId);
      const j = i + direccion;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function handleAplicarFormacion() {
    const formacion = FORMACIONES.find((f) => f.value === formacionValue);
    if (!formacion) return;
    const siguientes = jugadores
      .filter((j) => !suplentes.includes(j.id))
      .slice(0, formacion.huecos.length);
    const nuevo: Record<string, Posicion> = {};
    siguientes.forEach((j, i) => {
      const hueco = formacion.huecos[i];
      nuevo[j.id] = { top: hueco.top, left: hueco.left };
    });
    setPosiciones(nuevo);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>, jugadorId: string) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { jugadorId, startX: e.clientX, startY: e.clientY, moved: false };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>, jugadorId: string) {
    const drag = dragRef.current;
    if (!drag || drag.jugadorId !== jugadorId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;

    const rect = pitchRef.current?.getBoundingClientRect();
    if (!rect) return;

    drag.moved = true;
    const left = clamp(((e.clientX - rect.left) / rect.width) * 100, MARGEN, 100 - MARGEN);
    const top = clamp(((e.clientY - rect.top) / rect.height) * 100, MARGEN, 100 - MARGEN);
    setPosiciones((prev) => ({ ...prev, [jugadorId]: { top, left } }));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLButtonElement>, jugadorId: string) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag && drag.jugadorId === jugadorId && !drag.moved) {
      quitarDeTitular(jugadorId);
    }
  }

  async function handleGuardar() {
    if (!nombre.trim()) {
      toast.error("Ponle un nombre al campograma");
      return;
    }
    setGuardando(true);
    const result = await guardarCampogramaLocal({
      id: inicial?.id,
      nombre,
      notas: notas.trim() || null,
      titulares: titulares.map((j) => ({
        jugadorId: j.id,
        posicion: null,
        posX: posiciones[j.id].left,
        posY: posiciones[j.id].top,
      })),
      suplentesIds: suplentes,
    });
    setGuardando(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Campograma guardado");
    router.push(`/campograma/${result.id}`);
    router.refresh();
  }

  // --- Rival ---
  // Cada jugador rival se identifica con un id sintético (no existe una fila
  // real en `jugadores`, son de otro equipo), generado una sola vez al
  // montar a partir de lo ya guardado.
  const [entradasIniciales] = useState<Record<string, EntradaRival>>(() => {
    const mapa: Record<string, EntradaRival> = {};
    (inicialRival?.titulares ?? []).forEach((t) => {
      mapa[crypto.randomUUID()] = { nombre: t.nombre, dorsal: t.dorsal };
    });
    return mapa;
  });
  const paresIniciales = Object.entries(entradasIniciales).map(([id], i) => ({
    id,
    label: inicialRival?.titulares[i]?.posicion ?? "",
  }));

  const [entradasRival, setEntradasRival] = useState<Record<string, EntradaRival>>(entradasIniciales);
  const [formacionRival, setFormacionRival] = useState<Formacion>(() =>
    mejorFormacionInicial(paresIniciales),
  );
  const [asignacionesRival, setAsignacionesRival] = useState<Record<string, string>>(() =>
    remapearAFormacion(paresIniciales, mejorFormacionInicial(paresIniciales)),
  );
  const [posicionesRival, setPosicionesRival] = useState<Record<string, Posicion>>(() => {
    const mapa: Record<string, Posicion> = {};
    const ids = Object.keys(entradasIniciales);
    (inicialRival?.titulares ?? []).forEach((t, i) => {
      const id = ids[i];
      if (id) mapa[id] = { left: t.left, top: t.top };
    });
    return mapa;
  });
  const [huecoRivalAbierto, setHuecoRivalAbierto] = useState<string | null>(null);
  const [nombreRivalForm, setNombreRivalForm] = useState("");
  const [dorsalRivalForm, setDorsalRivalForm] = useState("");
  const [guardandoRival, setGuardandoRival] = useState(false);

  const dragRivalRef = useRef<{
    huecoId: string;
    entryId: string;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  function abrirHuecoRival(huecoId: string) {
    const entryId = asignacionesRival[huecoId];
    const entrada = entryId ? entradasRival[entryId] : undefined;
    setNombreRivalForm(entrada?.nombre ?? "");
    setDorsalRivalForm(entrada?.dorsal != null ? String(entrada.dorsal) : "");
    setHuecoRivalAbierto(huecoId);
  }

  function handleGuardarHuecoRival() {
    if (!huecoRivalAbierto) return;
    const nombreRival = nombreRivalForm.trim();
    if (!nombreRival) {
      toast.error("Ponle un nombre al jugador rival");
      return;
    }
    const dorsal = dorsalRivalForm.trim() ? Number(dorsalRivalForm.trim()) : null;

    const entryIdExistente = asignacionesRival[huecoRivalAbierto];
    const entryId = entryIdExistente ?? crypto.randomUUID();
    setEntradasRival((prev) => ({ ...prev, [entryId]: { nombre: nombreRival, dorsal } }));
    setAsignacionesRival((prev) => ({ ...prev, [huecoRivalAbierto]: entryId }));
    setHuecoRivalAbierto(null);
  }

  function handleQuitarHuecoRival() {
    if (!huecoRivalAbierto) return;
    setAsignacionesRival((prev) => {
      const next = { ...prev };
      delete next[huecoRivalAbierto];
      return next;
    });
    setHuecoRivalAbierto(null);
  }

  function handleCambiarFormacionRival(nuevoValue: string | null) {
    const nuevaFormacion = FORMACIONES.find((f) => f.value === nuevoValue);
    if (!nuevaFormacion) return;

    const paresActuales = Object.entries(asignacionesRival).map(([huecoId, entryId]) => ({
      id: entryId,
      label: formacionRival.huecos.find((h) => h.id === huecoId)?.label ?? "",
    }));

    setFormacionRival(nuevaFormacion);
    setAsignacionesRival(remapearAFormacion(paresActuales, nuevaFormacion));
  }

  function handlePointerDownRival(
    e: React.PointerEvent<HTMLButtonElement>,
    huecoId: string,
    entryId: string,
  ) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRivalRef.current = { huecoId, entryId, startX: e.clientX, startY: e.clientY, moved: false };
  }

  function handlePointerMoveRival(e: React.PointerEvent<HTMLButtonElement>, huecoId: string) {
    const drag = dragRivalRef.current;
    if (!drag || drag.huecoId !== huecoId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;

    const rect = pitchRef.current?.getBoundingClientRect();
    if (!rect) return;

    drag.moved = true;
    const left = clamp(((e.clientX - rect.left) / rect.width) * 100, MARGEN, 100 - MARGEN);
    // El rival se pinta reflejado verticalmente en el campo compartido (para
    // simular que defiende el lado contrario), así que aquí se deshace el
    // reflejo al arrastrar: se sigue guardando en su misma orientación
    // "hacia arriba" de siempre, coherente con lo que ya hubiera guardado.
    const topPantalla = clamp(((e.clientY - rect.top) / rect.height) * 100, MARGEN, 100 - MARGEN);
    const top = 100 - topPantalla;
    setPosicionesRival((prev) => ({ ...prev, [drag.entryId]: { top, left } }));
  }

  function handlePointerUpRival(e: React.PointerEvent<HTMLButtonElement>, huecoId: string) {
    const drag = dragRivalRef.current;
    dragRivalRef.current = null;
    if (drag && drag.huecoId === huecoId && !drag.moved) {
      abrirHuecoRival(huecoId);
    }
  }

  async function handleGuardarRival() {
    setGuardandoRival(true);
    const titularesRival: RivalTitularGuardar[] = Object.entries(asignacionesRival).map(
      ([huecoId, entryId]) => {
        const hueco = formacionRival.huecos.find((h) => h.id === huecoId);
        const pos = posicionesRival[entryId];
        const entrada = entradasRival[entryId];
        return {
          nombre: entrada?.nombre ?? "",
          dorsal: entrada?.dorsal ?? null,
          posicion: hueco?.label ?? "",
          posX: pos?.left ?? hueco?.left ?? 50,
          posY: pos?.top ?? hueco?.top ?? 50,
        };
      },
    );

    const result = await guardarCampogramaRivalLocal(campogramaId, titularesRival);
    setGuardandoRival(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Alineación rival guardada");
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-md border p-3">
        <div className="space-y-2">
          <Label htmlFor="nombreCampograma">Nombre</Label>
          <Input
            id="nombreCampograma"
            placeholder="Ej: 1-4-3-3 base"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notasCampograma">Notas (opcional)</Label>
          <Textarea
            id="notasCampograma"
            rows={2}
            placeholder="Ej: para partidos fuera de casa"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Nuestra formación</p>
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
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Formación del rival</p>
          <Select value={formacionRival.value} onValueChange={handleCambiarFormacionRival}>
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
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Fichas doradas: nuestro equipo — toca &quot;Disponibles&quot; para ponerlas, arrastra
        para moverlas, tócalas para quitarlas. Fichas rojas: el rival — toca un hueco vacío
        para escribir su nombre, arrastra una ya puesta para moverla. (
        {titulares.length}/11 nuestros, {Object.keys(asignacionesRival).length}/11 rival)
      </p>

      <div
        ref={pitchRef}
        className="relative mx-auto aspect-[2/3] h-[52vh] max-h-[480px] w-auto touch-none overflow-hidden rounded-lg bg-pitch"
      >
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/40" />
        <div className="absolute top-1/2 left-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40" />
        <div className="absolute inset-x-[20%] top-0 h-[16%] border-x border-b border-white/40" />
        <div className="absolute inset-x-[20%] bottom-0 h-[16%] border-x border-t border-white/40" />
        <div className="absolute inset-x-[38%] top-0 h-[6%] border-x border-b border-white/40" />
        <div className="absolute inset-x-[38%] bottom-0 h-[6%] border-x border-t border-white/40" />

        {/* Rival: fichas rojas, reflejadas verticalmente para simular que
            defiende el lado contrario del campo */}
        {formacionRival.huecos.map((hueco) => {
          const entryId = asignacionesRival[hueco.id];
          const entrada = entryId ? entradasRival[entryId] : undefined;
          const pos = (entryId && posicionesRival[entryId]) || { top: hueco.top, left: hueco.left };
          const topPantalla = 100 - pos.top;
          return (
            <button
              key={`rival-${hueco.id}`}
              type="button"
              onPointerDown={
                entrada ? (e) => handlePointerDownRival(e, hueco.id, entryId) : undefined
              }
              onPointerMove={entrada ? (e) => handlePointerMoveRival(e, hueco.id) : undefined}
              onPointerUp={(e) =>
                entrada ? handlePointerUpRival(e, hueco.id) : abrirHuecoRival(hueco.id)
              }
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
              style={{ top: `${topPantalla}%`, left: `${pos.left}%` }}
            >
              <span
                className={
                  entrada
                    ? "flex size-9 items-center justify-center rounded-full border-2 border-white bg-red-500 font-heading text-sm tabular-nums text-white shadow"
                    : "flex size-9 items-center justify-center rounded-full border-2 border-dashed border-red-500/60 text-red-500/80"
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

        {/* Nuestro equipo: fichas doradas */}
        {titulares.map((j) => {
          const pos = posiciones[j.id];
          return (
            <button
              key={j.id}
              type="button"
              onPointerDown={(e) => handlePointerDown(e, j.id)}
              onPointerMove={(e) => handlePointerMove(e, j.id)}
              onPointerUp={(e) => handlePointerUp(e, j.id)}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
              style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
            >
              <span className="flex size-9 items-center justify-center rounded-full border-2 border-gold bg-white font-heading text-sm tabular-nums text-foreground shadow">
                {j.dorsal ?? nombreJugador(j)[0]}
              </span>
              <span className="max-w-16 truncate rounded bg-black/40 px-1 text-[10px] text-white">
                {nombreJugador(j)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Suplentes ({enSuplentes.length})
        </p>
        {enSuplentes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Toca un jugador de &quot;Disponibles&quot; abajo para añadirlo al banquillo.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {enSuplentes.map((j, i) => (
              <li
                key={j.id}
                className="flex items-center gap-2 rounded-md border py-1.5 pr-2 pl-3"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                  {j.dorsal ?? nombreJugador(j)[0]}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{nombreJugador(j)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={i === 0}
                  aria-label="Subir"
                  onClick={() => moverSuplente(j.id, -1)}
                >
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={i === enSuplentes.length - 1}
                  aria-label="Bajar"
                  onClick={() => moverSuplente(j.id, 1)}
                >
                  <ArrowDown className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Quitar de suplentes"
                  onClick={() => quitarDeSuplente(j.id)}
                >
                  <X className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Disponibles ({disponibles.length})
        </p>
        {disponibles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todos los jugadores están en el campo o en el banquillo.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {disponibles.map((j) => (
              <li key={j.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => añadirATitular(j.id)}
                  className="flex items-center gap-2 rounded-full border py-1 pr-3 pl-2 text-sm hover:bg-muted"
                  title="Añadir como titular"
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                    {j.dorsal ?? nombreJugador(j)[0]}
                  </span>
                  {nombreJugador(j)}
                </button>
                <button
                  type="button"
                  onClick={() => añadirASuplente(j.id)}
                  className="rounded-full border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                  title="Añadir como suplente"
                >
                  Banquillo
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button className={cn("w-full")} disabled={guardando} onClick={handleGuardar}>
          <Save className="size-4" />
          {guardando ? "Guardando..." : "Guardar campograma"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={guardandoRival}
          onClick={handleGuardarRival}
        >
          <Save className="size-4" />
          {guardandoRival ? "Guardando..." : "Guardar alineación rival"}
        </Button>
      </div>

      <Dialog
        open={huecoRivalAbierto !== null}
        onOpenChange={(open) => !open && setHuecoRivalAbierto(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {formacionRival.huecos.find((h) => h.id === huecoRivalAbierto)?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="nombreRival">Nombre</Label>
              <Input
                id="nombreRival"
                value={nombreRivalForm}
                onChange={(e) => setNombreRivalForm(e.target.value)}
                placeholder="Ej: González"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dorsalRival">Dorsal (opcional)</Label>
              <Input
                id="dorsalRival"
                type="number"
                value={dorsalRivalForm}
                onChange={(e) => setDorsalRivalForm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={handleGuardarHuecoRival} className="flex-1">
                Guardar
              </Button>
              {huecoRivalAbierto && asignacionesRival[huecoRivalAbierto] && (
                <Button type="button" variant="outline" onClick={handleQuitarHuecoRival}>
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
