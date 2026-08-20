"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Save, X } from "lucide-react";
import { FORMACIONES } from "@/lib/formaciones";
import { guardarCampogramaLocal } from "@/app/(app)/campograma/local-actions";
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

export interface CampogramaInicial {
  id: string;
  nombre: string;
  notas: string | null;
  titulares: { jugadorId: string; posicion: string | null; top: number; left: number }[];
  suplentesIds: string[];
}

export function CampogramaEditor({
  jugadores,
  inicial,
}: {
  jugadores: Jugador[];
  inicial?: CampogramaInicial;
}) {
  const router = useRouter();
  const pitchRef = useRef<HTMLDivElement>(null);

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

      <p className="text-xs text-muted-foreground">
        Toca un jugador de &quot;Disponibles&quot; para ponerlo de titular; arrastra
        para colocarlo en el campo; tócalo de nuevo para quitarlo. ({titulares.length}/11
        titulares)
      </p>

      <div
        ref={pitchRef}
        className="relative aspect-[2/3] w-full touch-none overflow-hidden rounded-lg bg-pitch"
      >
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/40" />
        <div className="absolute top-1/2 left-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40" />
        <div className="absolute inset-x-[20%] top-0 h-[16%] border-x border-b border-white/40" />
        <div className="absolute inset-x-[20%] bottom-0 h-[16%] border-x border-t border-white/40" />
        <div className="absolute inset-x-[38%] top-0 h-[6%] border-x border-b border-white/40" />
        <div className="absolute inset-x-[38%] bottom-0 h-[6%] border-x border-t border-white/40" />

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

      <Button className={cn("w-full")} disabled={guardando} onClick={handleGuardar}>
        <Save className="size-4" />
        {guardando ? "Guardando..." : "Guardar campograma"}
      </Button>
    </div>
  );
}
