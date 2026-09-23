"use client";

import { useRef } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Posicion {
  top: number;
  left: number;
}

const MARGEN = 3;

// Zonas del campo completo para el selector de Tagueo: 3 columnas x 3 filas
// — se toca dentro de una zona y se selecciona la zona entera (su centro),
// en vez de guardar el punto exacto del toque. Menos preciso pero mucho más
// rápido de tocar en marcha y, sobre todo, comparable entre registros: dos
// toques en la misma franja del campo caen siempre en el mismo punto.
const ZONA_FILAS = 3;
const ZONA_COLUMNAS = 3;

function indiceZona(valorPorcentual: number, cantidad: number) {
  return Math.min(
    cantidad - 1,
    Math.max(0, Math.floor((valorPorcentual / 100) * cantidad)),
  );
}

function centroDeZona(fila: number, columna: number): Posicion {
  return {
    top: ((fila + 0.5) / ZONA_FILAS) * 100,
    left: ((columna + 0.5) / ZONA_COLUMNAS) * 100,
  };
}

// Textura de red para la portería: dos tramas diagonales cruzadas.
const ESTILO_RED: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(45deg, rgba(255,255,255,0.4) 0, rgba(255,255,255,0.4) 1px, transparent 1px, transparent 5px), " +
    "repeating-linear-gradient(-45deg, rgba(255,255,255,0.4) 0, rgba(255,255,255,0.4) 1px, transparent 1px, transparent 5px)",
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function PitchHalfLines() {
  return (
    <>
      <div className="absolute inset-x-[12%] top-0 h-[42%] border-x border-b border-white/40" />
      <div className="absolute inset-x-[35%] top-0 h-[18%] border-x border-b border-white/40" />
      <div className="absolute left-1/2 top-[32%] size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-white/40" />
      <div className="absolute left-1/2 bottom-0 size-24 -translate-x-1/2 translate-y-1/2 rounded-full border border-white/40" />
      <div
        className="absolute inset-x-[45%] top-0 h-[5%] border-x-2 border-t border-white/80"
        style={ESTILO_RED}
      />
      <div className="absolute left-0 top-0 size-3 rounded-br-full border-r border-b border-white/50" />
      <div className="absolute right-0 top-0 size-3 rounded-bl-full border-l border-b border-white/50" />
    </>
  );
}

export function CampoMiniSelector({
  value,
  onChange,
}: {
  value: Posicion | null;
  onChange: (pos: Posicion) => void;
}) {
  const pitchRef = useRef<HTMLDivElement>(null);

  function handlePick(e: React.PointerEvent<HTMLDivElement>) {
    const rect = pitchRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = clamp(((e.clientX - rect.left) / rect.width) * 100, MARGEN, 100 - MARGEN);
    const top = clamp(((e.clientY - rect.top) / rect.height) * 100, MARGEN, 100 - MARGEN);
    onChange({ top, left });
  }

  return (
    <div
      ref={pitchRef}
      onPointerDown={handlePick}
      className="relative aspect-[4/3] w-full touch-none overflow-hidden rounded-md bg-pitch"
    >
      <PitchHalfLines />
      {value && (
        <span
          className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-gold shadow"
          style={{ top: `${value.top}%`, left: `${value.left}%` }}
        />
      )}
    </div>
  );
}

// Campo completo (no solo un lado) para elegir una zona genérica del
// partido — a diferencia de CampoMiniSelector, pensado para tagueo, donde la
// acción puede pasar en cualquier parte del campo, no solo cerca de una
// portería.
//
// `flip`: en la 2ª parte los equipos cambian de lado, así que la portería
// que se atacaba arriba en la 1ª parte pasa a estar abajo. Las coordenadas
// que se tocan se guardan tal cual, sin transformar nada por dentro (cada
// registro ya lleva su `parte`, así que un análisis posterior puede tener
// en cuenta el cambio de lado si hace falta) — lo único que cambia con
// `flip` es cuál de las dos porterías se resalta en el color del club, para
// que se vea de un vistazo hacia dónde se ataca en cada momento, con una
// transición suave al cambiar de parte.
export function CampoCompletoSelector({
  value,
  onChange,
  flip = false,
}: {
  value: Posicion | null;
  onChange: (pos: Posicion) => void;
  flip?: boolean;
}) {
  const pitchRef = useRef<HTMLDivElement>(null);

  function handlePick(e: React.PointerEvent<HTMLDivElement>) {
    const rect = pitchRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = ((e.clientX - rect.left) / rect.width) * 100;
    const top = ((e.clientY - rect.top) / rect.height) * 100;
    const fila = indiceZona(top, ZONA_FILAS);
    const columna = indiceZona(left, ZONA_COLUMNAS);
    onChange(centroDeZona(fila, columna));
  }

  const zonaSeleccionada = value
    ? {
        fila: indiceZona(value.top, ZONA_FILAS),
        columna: indiceZona(value.left, ZONA_COLUMNAS),
      }
    : null;

  return (
    <div
      ref={pitchRef}
      onPointerDown={handlePick}
      className="relative mx-auto aspect-[2/3] w-full max-w-xs touch-none overflow-hidden rounded-lg bg-pitch"
    >
      <div
        className={cn(
          "absolute inset-x-0 top-1 z-10 flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wide transition-opacity duration-300",
          flip ? "opacity-0" : "opacity-100",
        )}
      >
        <span className="rounded-full bg-primary px-2 py-0.5 text-primary-foreground shadow">
          ▲ Atacamos hacia aquí
        </span>
      </div>
      <div
        className={cn(
          "absolute inset-x-0 bottom-1 z-10 flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wide transition-opacity duration-300",
          flip ? "opacity-100" : "opacity-0",
        )}
      >
        <span className="rounded-full bg-primary px-2 py-0.5 text-primary-foreground shadow">
          ▼ Atacamos hacia aquí
        </span>
      </div>
      <div className="absolute inset-x-0 top-1/2 h-px bg-white/40" />
      <div className="absolute top-1/2 left-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40" />
      <div
        className={cn(
          "absolute inset-x-[20%] top-0 h-[16%] border-x border-b transition-colors duration-300",
          flip ? "border-white/40" : "border-primary shadow-[0_0_12px_var(--primary)]",
        )}
      />
      <div
        className={cn(
          "absolute inset-x-[20%] bottom-0 h-[16%] border-x border-t transition-colors duration-300",
          flip ? "border-primary shadow-[0_0_12px_var(--primary)]" : "border-white/40",
        )}
      />
      <div className="absolute inset-x-[38%] top-0 h-[6%] border-x border-b border-white/40" />
      <div className="absolute inset-x-[38%] bottom-0 h-[6%] border-x border-t border-white/40" />

      {/* Rejilla de zonas (3x3): líneas divisorias discontinuas */}
      <div className="absolute inset-y-0 left-1/3 w-px border-l border-dashed border-white/50" />
      <div className="absolute inset-y-0 left-2/3 w-px border-l border-dashed border-white/50" />
      <div className="absolute inset-x-0 top-1/3 h-px border-t border-dashed border-white/50" />
      <div className="absolute inset-x-0 top-2/3 h-px border-t border-dashed border-white/50" />

      {zonaSeleccionada && (
        <div
          className="absolute flex items-center justify-center bg-gold/35"
          style={{
            top: `${(zonaSeleccionada.fila / ZONA_FILAS) * 100}%`,
            left: `${(zonaSeleccionada.columna / ZONA_COLUMNAS) * 100}%`,
            width: `${100 / ZONA_COLUMNAS}%`,
            height: `${100 / ZONA_FILAS}%`,
          }}
        >
          <span className="flex size-6 items-center justify-center rounded-full border-2 border-white bg-gold shadow">
            <Check className="size-4 text-gold-foreground" strokeWidth={3} />
          </span>
        </div>
      )}
    </div>
  );
}

// Versión pequeña y de solo lectura del campo completo, para mostrar en una
// fila de lista (p. ej. el detalle de un tagueo) el punto marcado sin poder
// tocarlo ni editarlo.
export function CampoCompletoMini({ value }: { value: Posicion | null }) {
  return (
    <div className="relative aspect-[2/3] w-10 shrink-0 overflow-hidden rounded bg-pitch">
      <div className="absolute inset-x-0 top-1/2 h-px bg-white/40" />
      <div className="absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40" />
      <div className="absolute inset-x-[20%] top-0 h-[16%] border-x border-b border-white/40" />
      <div className="absolute inset-x-[20%] bottom-0 h-[16%] border-x border-t border-white/40" />
      {value ? (
        <span
          className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-gold"
          style={{ top: `${value.top}%`, left: `${value.left}%` }}
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-[7px] text-white/50">
          s/z
        </span>
      )}
    </div>
  );
}

function MarcadorCentro({ pos }: { pos: Posicion }) {
  return (
    <span
      className="absolute flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-primary text-[9px] font-bold text-primary-foreground shadow"
      style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
    >
      C
    </span>
  );
}

function MarcadorGol({ pos }: { pos: Posicion }) {
  return (
    <span
      className="absolute flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-gold text-[9px] font-bold text-gold-foreground shadow"
      style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
    >
      G
    </span>
  );
}

function LineaConexion({ centro, gol }: { centro: Posicion; gol: Posicion }) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 size-full"
      preserveAspectRatio="none"
    >
      <line
        x1={`${centro.left}%`}
        y1={`${centro.top}%`}
        x2={`${gol.left}%`}
        y2={`${gol.top}%`}
        stroke="white"
        strokeOpacity={0.8}
        strokeWidth={2}
        strokeDasharray="5 4"
      />
    </svg>
  );
}

export function CampoMiniSelectorDoble({
  centro,
  gol,
  onPick,
}: {
  centro: Posicion | null;
  gol: Posicion | null;
  onPick: (pos: Posicion) => void;
}) {
  const pitchRef = useRef<HTMLDivElement>(null);

  function handlePick(e: React.PointerEvent<HTMLDivElement>) {
    const rect = pitchRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = clamp(((e.clientX - rect.left) / rect.width) * 100, MARGEN, 100 - MARGEN);
    const top = clamp(((e.clientY - rect.top) / rect.height) * 100, MARGEN, 100 - MARGEN);
    onPick({ top, left });
  }

  return (
    <div
      ref={pitchRef}
      onPointerDown={handlePick}
      className="relative aspect-[4/3] w-full touch-none overflow-hidden rounded-md bg-pitch"
    >
      <PitchHalfLines />
      {centro && gol && <LineaConexion centro={centro} gol={gol} />}
      {centro && <MarcadorCentro pos={centro} />}
      {gol && <MarcadorGol pos={gol} />}
    </div>
  );
}

export function CampoMiniDisplay({
  centro,
  gol,
}: {
  centro?: Posicion | null;
  gol?: Posicion | null;
}) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-pitch">
      <PitchHalfLines />
      {centro && gol && <LineaConexion centro={centro} gol={gol} />}
      {centro && <MarcadorCentro pos={centro} />}
      {gol && <MarcadorGol pos={gol} />}
    </div>
  );
}
