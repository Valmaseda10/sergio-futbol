"use client";

import { useRef } from "react";

interface Posicion {
  top: number;
  left: number;
}

const MARGEN = 3;

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
      <div className="absolute inset-x-[45%] top-0 h-[3%] border-x-2 border-b-2 border-white/70" />
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
