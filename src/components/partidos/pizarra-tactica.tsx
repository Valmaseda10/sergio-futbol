"use client";

import { useRef, useState } from "react";
import {
  RotateCcw,
  Pencil,
  Eraser,
  Trash2,
  Undo2,
  TrafficCone,
} from "lucide-react";
import { FORMACIONES } from "@/lib/formaciones";
import { Button } from "@/components/ui/button";
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

type ColorFicha = "azul" | "verde" | "amarillo" | "rojo";
type ColorTrazo = ColorFicha | "blanco";
type TipoMaterial = "cono" | "pica" | "maniqui" | "escalera" | "porteria";
type ColorConoChino = "rojo" | "azul" | "blanco";

interface FichaGenerica extends Posicion {
  color: ColorFicha;
}

interface ElementoMaterial extends Posicion {
  tipo: TipoMaterial;
}

// Los conos chinos (los planos, para marcar zonas) son un material aparte
// de los conos altos: se guardan como su propio tipo de elemento porque,
// a diferencia del resto del material, tienen color a elegir.
interface ConoChino extends Posicion {
  color: ColorConoChino;
}

interface Trazo {
  id: string;
  color: ColorTrazo;
  puntos: Posicion[];
}

interface PuntoBorrado extends Posicion {
  radioX: number;
  radioY: number;
}

type Elemento =
  | { kind: "jugador"; id: string }
  | { kind: "ficha"; id: string }
  | { kind: "material"; id: string }
  | { kind: "conoChino"; id: string };

const MARGEN = 5;
// Radio de la goma de borrar, en píxeles de pantalla (se convierte a
// porcentaje del campo según su tamaño real al usarla).
const RADIO_BORRADO_PX = 18;

const COLORES_FICHA: { value: ColorFicha; label: string; clase: string }[] = [
  { value: "azul", label: "Ficha azul", clase: "bg-blue-500" },
  { value: "verde", label: "Ficha verde", clase: "bg-green-500" },
  { value: "amarillo", label: "Ficha amarilla", clase: "bg-yellow-400" },
  { value: "rojo", label: "Ficha roja", clase: "bg-red-500" },
];

const COLORES_TRAZO: { value: ColorTrazo; label: string; clase: string }[] = [
  { value: "blanco", label: "Lápiz blanco", clase: "bg-white border" },
  ...COLORES_FICHA.map((c) => ({
    value: c.value as ColorTrazo,
    label: c.label.replace("Ficha", "Lápiz"),
    clase: c.clase,
  })),
];

const HEX_TRAZO: Record<ColorTrazo, string> = {
  blanco: "#ffffff",
  azul: "#3b82f6",
  verde: "#22c55e",
  amarillo: "#eab308",
  rojo: "#ef4444",
};

const COLORES_CONO_CHINO: { value: ColorConoChino; label: string; clase: string }[] = [
  { value: "rojo", label: "Cono chino rojo", clase: "bg-red-500" },
  { value: "azul", label: "Cono chino azul", clase: "bg-blue-500" },
  { value: "blanco", label: "Cono chino blanco", clase: "bg-white border border-black/20" },
];

const TEXT_CLASE_CONO_CHINO: Record<ColorConoChino, string> = {
  rojo: "text-red-500",
  azul: "text-blue-500",
  blanco: "text-white",
};

const ETIQUETA_MATERIAL: Record<TipoMaterial, string> = {
  cono: "Cono",
  pica: "Pica",
  maniqui: "Maniquí",
  escalera: "Escalera de agilidad",
  porteria: "Minipuerta",
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function nombreFicha(j: Jugador) {
  return j.alias || j.apellidos;
}

function nuevoId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

// El campo es muy alto (aspect-[2/3]): si una ficha nueva apareciera en el
// centro exacto (50%), quedaría fuera de la pantalla en móvil hasta hacer
// scroll y parecería que el botón no hace nada. Por eso las fichas y el
// material nuevos aparecen cerca de la parte de arriba, que es lo que se ve
// justo debajo de la barra de herramientas, y se reparten en varias
// posiciones para que añadir varias seguidas no las deje apiladas.
const POSICIONES_SPAWN: Posicion[] = [
  { top: 15, left: 25 },
  { top: 15, left: 50 },
  { top: 15, left: 75 },
  { top: 26, left: 37 },
  { top: 26, left: 63 },
];

function PicaIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="12" y1="2" x2="12" y2="20" />
      <circle cx="12" cy="21" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Silueta de maniquí/muñeco de entrenamiento (los que se usan para barreras
// de faltas o para simular a un rival estático).
function ManiquiIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="12" cy="4.2" r="2.4" />
      <path d="M7.5 8.5c0-.6.5-1 1-1h7c.5 0 1 .4 1 1l-1 6.5H8.5z" />
      <path d="M8.8 15h6.4l-.7 6a1 1 0 0 1-1 .9h-3a1 1 0 0 1-1-.9z" />
    </svg>
  );
}

// Cono chino / cono plano: un disco bajo, no el cono alto de tráfico.
function ConoChinoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M2 19c0-6 4.5-11 10-11s10 5 10 11" />
      <ellipse cx="12" cy="19" rx="10" ry="2" opacity="0.55" />
    </svg>
  );
}

function EscaleraIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
    >
      <line x1="4" y1="2" x2="4" y2="22" />
      <line x1="20" y1="2" x2="20" y2="22" />
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

function PorteriaIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 21V5h16v16" />
      <path d="M4 5 8 9M20 5 16 9" strokeWidth="1.2" opacity="0.6" />
    </svg>
  );
}

export function PizarraTactica({ jugadores }: { jugadores: Jugador[] }) {
  const pitchRef = useRef<HTMLDivElement>(null);
  const [posiciones, setPosiciones] = useState<Record<string, Posicion>>({});
  const [fichas, setFichas] = useState<Record<string, FichaGenerica>>({});
  const [material, setMaterial] = useState<Record<string, ElementoMaterial>>(
    {},
  );
  const [conosChinos, setConosChinos] = useState<Record<string, ConoChino>>({});
  const [trazos, setTrazos] = useState<Trazo[]>([]);
  const [trazoActual, setTrazoActual] = useState<Trazo | null>(null);
  const [modoDibujo, setModoDibujo] = useState(false);
  const [modoBorrado, setModoBorrado] = useState(false);
  const [puntoBorrado, setPuntoBorrado] = useState<PuntoBorrado | null>(null);
  const [colorDibujo, setColorDibujo] = useState<ColorTrazo>("blanco");
  const [formacionValue, setFormacionValue] = useState(FORMACIONES[0].value);

  const dragRef = useRef<{
    elemento: Elemento;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const dibujoIdRef = useRef<string | null>(null);
  const borrandoActivoRef = useRef(false);
  const spawnContador = useRef(0);

  function siguientePosicionSpawn(): Posicion {
    const pos = POSICIONES_SPAWN[spawnContador.current % POSICIONES_SPAWN.length];
    spawnContador.current += 1;
    return pos;
  }

  const enCampo = jugadores.filter((j) => posiciones[j.id]);
  const enBanquillo = jugadores.filter((j) => !posiciones[j.id]);

  // `jugadores` ya llega ordenado por dorsal (y alfabéticamente si no hay
  // dorsal); para los jugadores sin dorsal asignado, se usa su posición en
  // esa lista como número de ficha, de forma que la pizarra siempre muestre
  // un número —nunca una letra— y esos números salgan ordenados.
  const numeroPorJugador = new Map(
    jugadores.map((j, i) => [j.id, j.dorsal ?? i + 1]),
  );

  function handleAplicarFormacion() {
    const formacion = FORMACIONES.find((f) => f.value === formacionValue);
    if (!formacion) return;
    const siguientes = jugadores.slice(0, formacion.huecos.length);
    const nuevo: Record<string, Posicion> = {};
    siguientes.forEach((j, i) => {
      const hueco = formacion.huecos[i];
      nuevo[j.id] = { top: hueco.top, left: hueco.left };
    });
    setPosiciones(nuevo);
  }

  function handleReiniciar() {
    setPosiciones({});
    setFichas({});
    setMaterial({});
    setConosChinos({});
    setTrazos([]);
    setTrazoActual(null);
    setPuntoBorrado(null);
    spawnContador.current = 0;
  }

  function handleBanquilloClick(jugadorId: string) {
    setPosiciones((prev) => ({ ...prev, [jugadorId]: siguientePosicionSpawn() }));
  }

  function handleAñadirFicha(color: ColorFicha) {
    const id = nuevoId();
    setFichas((prev) => ({ ...prev, [id]: { color, ...siguientePosicionSpawn() } }));
  }

  function handleAñadirMaterial(tipo: TipoMaterial) {
    const id = nuevoId();
    setMaterial((prev) => ({ ...prev, [id]: { tipo, ...siguientePosicionSpawn() } }));
  }

  function handleAñadirConoChino(color: ColorConoChino) {
    const id = nuevoId();
    setConosChinos((prev) => ({ ...prev, [id]: { color, ...siguientePosicionSpawn() } }));
  }

  function actualizarPosicion(elemento: Elemento, pos: Posicion) {
    if (elemento.kind === "jugador") {
      setPosiciones((prev) => ({ ...prev, [elemento.id]: pos }));
    } else if (elemento.kind === "ficha") {
      setFichas((prev) => ({ ...prev, [elemento.id]: { ...prev[elemento.id], ...pos } }));
    } else if (elemento.kind === "material") {
      setMaterial((prev) => ({ ...prev, [elemento.id]: { ...prev[elemento.id], ...pos } }));
    } else {
      setConosChinos((prev) => ({ ...prev, [elemento.id]: { ...prev[elemento.id], ...pos } }));
    }
  }

  function quitarElemento(elemento: Elemento) {
    if (elemento.kind === "jugador") {
      setPosiciones((prev) => {
        const next = { ...prev };
        delete next[elemento.id];
        return next;
      });
    } else if (elemento.kind === "ficha") {
      setFichas((prev) => {
        const next = { ...prev };
        delete next[elemento.id];
        return next;
      });
    } else if (elemento.kind === "material") {
      setMaterial((prev) => {
        const next = { ...prev };
        delete next[elemento.id];
        return next;
      });
    } else {
      setConosChinos((prev) => {
        const next = { ...prev };
        delete next[elemento.id];
        return next;
      });
    }
  }

  function handlePointerDown(
    e: React.PointerEvent<HTMLButtonElement>,
    elemento: Elemento,
  ) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      elemento,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
  }

  function handlePointerMove(
    e: React.PointerEvent<HTMLButtonElement>,
    elemento: Elemento,
  ) {
    const drag = dragRef.current;
    if (
      !drag ||
      drag.elemento.kind !== elemento.kind ||
      drag.elemento.id !== elemento.id
    )
      return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;

    const rect = pitchRef.current?.getBoundingClientRect();
    if (!rect) return;

    drag.moved = true;
    const left = clamp(((e.clientX - rect.left) / rect.width) * 100, MARGEN, 100 - MARGEN);
    const top = clamp(((e.clientY - rect.top) / rect.height) * 100, MARGEN, 100 - MARGEN);
    actualizarPosicion(elemento, { top, left });
  }

  function handlePointerUp(
    e: React.PointerEvent<HTMLButtonElement>,
    elemento: Elemento,
  ) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (
      drag &&
      drag.elemento.kind === elemento.kind &&
      drag.elemento.id === elemento.id &&
      !drag.moved
    ) {
      quitarElemento(elemento);
    }
  }

  function puntoDesdeEvento(e: React.PointerEvent<HTMLDivElement>): Posicion | null {
    const rect = pitchRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      left: clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100),
      top: clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100),
    };
  }

  function handleDibujoPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const punto = puntoDesdeEvento(e);
    if (!punto) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const id = nuevoId();
    dibujoIdRef.current = id;
    setTrazoActual({ id, color: colorDibujo, puntos: [punto] });
  }

  function handleDibujoPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dibujoIdRef.current) return;
    const punto = puntoDesdeEvento(e);
    if (!punto) return;
    setTrazoActual((prev) =>
      prev ? { ...prev, puntos: [...prev.puntos, punto] } : prev,
    );
  }

  function handleDibujoPointerUp() {
    if (!dibujoIdRef.current) return;
    dibujoIdRef.current = null;
    setTrazoActual((prev) => {
      if (prev && prev.puntos.length > 1) {
        setTrazos((rest) => [...rest, prev]);
      }
      return null;
    });
  }

  function handleDeshacerTrazo() {
    setTrazos((prev) => prev.slice(0, -1));
  }

  function handleBorrarTrazos() {
    setTrazos([]);
    setTrazoActual(null);
  }

  function handleTogglePencil() {
    setModoDibujo((prev) => {
      const siguiente = !prev;
      if (siguiente) setModoBorrado(false);
      return siguiente;
    });
    setPuntoBorrado(null);
  }

  function handleToggleGoma() {
    setModoBorrado((prev) => {
      const siguiente = !prev;
      if (siguiente) setModoDibujo(false);
      return siguiente;
    });
    setPuntoBorrado(null);
  }

  // Borra solo el trozo de trazo que toca la goma en ese punto: cada trazo se
  // recorre punto a punto y, donde entra en el radio de borrado, se corta en
  // dos trazos separados en vez de desaparecer entero.
  function borrarEnPunto(punto: Posicion, radioX: number, radioY: number) {
    setTrazos((prev) => {
      const siguiente: Trazo[] = [];
      for (const trazo of prev) {
        let tramo: Posicion[] = [];
        for (const p of trazo.puntos) {
          const dx = (p.left - punto.left) / radioX;
          const dy = (p.top - punto.top) / radioY;
          const dentroDelRadio = dx * dx + dy * dy <= 1;
          if (dentroDelRadio) {
            if (tramo.length > 1) {
              siguiente.push({ id: nuevoId(), color: trazo.color, puntos: tramo });
            }
            tramo = [];
          } else {
            tramo.push(p);
          }
        }
        if (tramo.length > 1) {
          siguiente.push({ id: nuevoId(), color: trazo.color, puntos: tramo });
        }
      }
      return siguiente;
    });
  }

  // Actualiza a la vez el borrado real y el círculo que sigue al dedo, para
  // que la goma se note como tal: en una tablet no hay cursor de ratón, así
  // que sin esta marca no se ve dónde ni cuánto se está borrando.
  function procesarBorrado(e: React.PointerEvent<HTMLDivElement>) {
    const rect = pitchRef.current?.getBoundingClientRect();
    if (!rect) return;
    const punto = {
      left: clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100),
      top: clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100),
    };
    const radioX = (RADIO_BORRADO_PX / rect.width) * 100;
    const radioY = (RADIO_BORRADO_PX / rect.height) * 100;
    setPuntoBorrado({ ...punto, radioX, radioY });
    borrarEnPunto(punto, radioX, radioY);
  }

  function handleGomaPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    borrandoActivoRef.current = true;
    procesarBorrado(e);
  }

  function handleGomaPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!borrandoActivoRef.current) return;
    procesarBorrado(e);
  }

  function handleGomaPointerUp() {
    borrandoActivoRef.current = false;
    setPuntoBorrado(null);
  }

  return (
    <div className="space-y-4">
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
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleReiniciar}
          aria-label="Reiniciar pizarra"
        >
          <RotateCcw className="size-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-md border p-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Fichas</span>
          {COLORES_FICHA.map((c) => (
            <button
              key={c.value}
              type="button"
              aria-label={`Añadir ${c.label.toLowerCase()}`}
              onClick={() => handleAñadirFicha(c.value)}
              className={cn(
                "size-7 rounded-full border-2 border-white shadow ring-1 ring-black/10",
                c.clase,
              )}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Material</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Añadir cono"
            onClick={() => handleAñadirMaterial("cono")}
          >
            <TrafficCone className="size-4 text-orange-500" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Añadir pica"
            onClick={() => handleAñadirMaterial("pica")}
          >
            <PicaIcon className="size-4 text-amber-600" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Añadir maniquí"
            onClick={() => handleAñadirMaterial("maniqui")}
          >
            <ManiquiIcon className="size-4 text-slate-600" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Añadir escalera de agilidad"
            onClick={() => handleAñadirMaterial("escalera")}
          >
            <EscaleraIcon className="size-4 text-slate-600" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Añadir minipuerta"
            onClick={() => handleAñadirMaterial("porteria")}
          >
            <PorteriaIcon className="size-4 text-slate-600" />
          </Button>
          <span className="ml-1 text-xs text-muted-foreground">Chinos</span>
          {COLORES_CONO_CHINO.map((c) => (
            <button
              key={c.value}
              type="button"
              aria-label={`Añadir ${c.label.toLowerCase()}`}
              onClick={() => handleAñadirConoChino(c.value)}
              className={cn(
                "size-6 rounded-full border-2 border-white shadow ring-1 ring-black/10",
                c.clase,
              )}
            />
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant={modoDibujo ? "default" : "outline"}
            size="icon"
            aria-label={modoDibujo ? "Desactivar lápiz" : "Activar lápiz"}
            onClick={handleTogglePencil}
          >
            <Pencil className="size-4" />
          </Button>
          {modoDibujo &&
            COLORES_TRAZO.map((c) => (
              <button
                key={c.value}
                type="button"
                aria-label={c.label}
                onClick={() => setColorDibujo(c.value)}
                className={cn(
                  "size-6 rounded-full border-2 shadow",
                  c.clase,
                  colorDibujo === c.value ? "border-gold" : "border-white",
                )}
              />
            ))}
          <Button
            type="button"
            variant={modoBorrado ? "default" : "outline"}
            size="icon"
            aria-label={
              modoBorrado ? "Desactivar goma de borrar" : "Activar goma de borrar"
            }
            disabled={trazos.length === 0 && !modoBorrado}
            onClick={handleToggleGoma}
          >
            <Eraser className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Deshacer último trazo"
            disabled={trazos.length === 0}
            onClick={handleDeshacerTrazo}
          >
            <Undo2 className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Borrar todos los trazos"
            disabled={trazos.length === 0}
            onClick={handleBorrarTrazos}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Toca un color o un icono de material para añadirlo al campo; mantén y
        arrastra para moverlo; tócalo de nuevo para quitarlo. Con el lápiz
        activado, dibuja sobre el campo para explicar la jugada o el
        ejercicio; con la goma activada, arrastra sobre un trazo para borrar
        solo esa parte.
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

        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 size-full"
        >
          {trazos.map((t) => (
            <polyline
              key={t.id}
              points={t.puntos.map((p) => `${p.left},${p.top}`).join(" ")}
              fill="none"
              stroke={HEX_TRAZO[t.color]}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {trazoActual && (
            <polyline
              points={trazoActual.puntos.map((p) => `${p.left},${p.top}`).join(" ")}
              fill="none"
              stroke={HEX_TRAZO[trazoActual.color]}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {puntoBorrado && (
            <ellipse
              cx={puntoBorrado.left}
              cy={puntoBorrado.top}
              rx={puntoBorrado.radioX}
              ry={puntoBorrado.radioY}
              fill="white"
              fillOpacity="0.35"
              stroke="white"
              strokeOpacity="0.9"
              strokeWidth="1.5"
              strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {enCampo.map((j) => {
          const pos = posiciones[j.id];
          if (!pos) return null;
          return (
            <button
              key={j.id}
              type="button"
              onPointerDown={(e) => handlePointerDown(e, { kind: "jugador", id: j.id })}
              onPointerMove={(e) => handlePointerMove(e, { kind: "jugador", id: j.id })}
              onPointerUp={(e) => handlePointerUp(e, { kind: "jugador", id: j.id })}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
              style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
            >
              <span className="flex size-9 items-center justify-center rounded-full border-2 border-gold bg-white font-heading text-sm tabular-nums text-foreground shadow">
                {numeroPorJugador.get(j.id)}
              </span>
              <span className="max-w-16 truncate rounded bg-black/40 px-1 text-[10px] text-white">
                {nombreFicha(j)}
              </span>
            </button>
          );
        })}

        {Object.entries(fichas).map(([id, f]) => (
          <button
            key={id}
            type="button"
            onPointerDown={(e) => handlePointerDown(e, { kind: "ficha", id })}
            onPointerMove={(e) => handlePointerMove(e, { kind: "ficha", id })}
            onPointerUp={(e) => handlePointerUp(e, { kind: "ficha", id })}
            aria-label={`Ficha ${f.color}`}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ top: `${f.top}%`, left: `${f.left}%` }}
          >
            <span
              className={cn(
                "block size-7 rounded-full border-2 border-white shadow",
                COLORES_FICHA.find((c) => c.value === f.color)?.clase,
              )}
            />
          </button>
        ))}

        {Object.entries(material).map(([id, m]) => (
          <button
            key={id}
            type="button"
            onPointerDown={(e) => handlePointerDown(e, { kind: "material", id })}
            onPointerMove={(e) => handlePointerMove(e, { kind: "material", id })}
            onPointerUp={(e) => handlePointerUp(e, { kind: "material", id })}
            aria-label={ETIQUETA_MATERIAL[m.tipo]}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1 shadow"
            style={{ top: `${m.top}%`, left: `${m.left}%` }}
          >
            {m.tipo === "cono" && <TrafficCone className="size-5 text-orange-500" />}
            {m.tipo === "pica" && <PicaIcon className="size-5 text-amber-600" />}
            {m.tipo === "maniqui" && <ManiquiIcon className="size-5 text-slate-700" />}
            {m.tipo === "escalera" && <EscaleraIcon className="size-5 text-slate-700" />}
            {m.tipo === "porteria" && <PorteriaIcon className="size-5 text-slate-700" />}
          </button>
        ))}

        {Object.entries(conosChinos).map(([id, c]) => (
          <button
            key={id}
            type="button"
            onPointerDown={(e) => handlePointerDown(e, { kind: "conoChino", id })}
            onPointerMove={(e) => handlePointerMove(e, { kind: "conoChino", id })}
            onPointerUp={(e) => handlePointerUp(e, { kind: "conoChino", id })}
            aria-label={`Cono chino ${c.color}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60 p-0.5 shadow"
            style={{ top: `${c.top}%`, left: `${c.left}%` }}
          >
            <ConoChinoIcon className={cn("size-4", TEXT_CLASE_CONO_CHINO[c.color])} />
          </button>
        ))}

        {modoDibujo && (
          <div
            className="absolute inset-0 z-10 cursor-crosshair touch-none"
            onPointerDown={handleDibujoPointerDown}
            onPointerMove={handleDibujoPointerMove}
            onPointerUp={handleDibujoPointerUp}
          />
        )}
        {modoBorrado && (
          <div
            className="absolute inset-0 z-10 cursor-cell touch-none"
            onPointerDown={handleGomaPointerDown}
            onPointerMove={handleGomaPointerMove}
            onPointerUp={handleGomaPointerUp}
          />
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Banquillo ({enBanquillo.length})
        </p>
        {enBanquillo.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todos los jugadores están en el campo.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {enBanquillo.map((j) => (
              <li key={j.id}>
                <button
                  type="button"
                  onClick={() => handleBanquilloClick(j.id)}
                  className="flex items-center gap-2 rounded-full border py-1 pr-3 pl-2 text-sm hover:bg-muted"
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                    {numeroPorJugador.get(j.id)}
                  </span>
                  {nombreFicha(j)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
