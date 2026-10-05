"use client";

// Editor de diagramas tácticos de una tarea: campo con jugadores, material,
// flechas y zonas que se colocan tocando/arrastrando (vale con el dedo en
// iPad). Sustituye al diagrama que antes se hacía en PowerPoint: al guardar
// se genera un PNG que se usa como imagen de la tarea y se conserva el
// dibujo para poder retocarlo después.

import { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Circle,
  Cone,
  Goal,
  Hand,
  Minus,
  MoveDiagonal,
  Trash2,
  Type,
  Undo2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  CAMPO_ALTO,
  CAMPO_ANCHO,
  COLORES_DIAGRAMA,
  diagramaASvg,
  diagramaAPng,
  diagramaVacio,
  elementoEn,
  type Diagrama,
  type ElementoDiagrama,
  type TipoCampo,
  type TipoElemento,
} from "@/lib/ficha-entrenamiento";

type Herramienta = "mover" | TipoElemento;

const HERRAMIENTAS: { id: Herramienta; label: string; icono: React.ReactNode }[] = [
  { id: "mover", label: "Mover", icono: <Hand className="size-4" /> },
  { id: "jugador", label: "Jugador", icono: <User className="size-4" /> },
  { id: "porteria", label: "Portería", icono: <Goal className="size-4" /> },
  { id: "cono", label: "Cono", icono: <Cone className="size-4" /> },
  { id: "pica", label: "Pica", icono: <Minus className="size-4 rotate-90" /> },
  { id: "balon", label: "Balón", icono: <Circle className="size-4" /> },
  { id: "texto", label: "Texto", icono: <Type className="size-4" /> },
  { id: "flecha", label: "Flecha", icono: <ArrowRight className="size-4" /> },
  { id: "zona", label: "Zona", icono: <MoveDiagonal className="size-4" /> },
];

const COLOR_POR_DEFECTO: Partial<Record<TipoElemento, string>> = {
  cono: "#f97316",
  pica: "#facc15",
};

function nuevoId() {
  return crypto.randomUUID();
}

export function DiagramaEditor({
  abierto,
  numeroTarea,
  inicial,
  onCerrar,
  onGuardar,
}: {
  abierto: boolean;
  numeroTarea: number;
  inicial: Diagrama | null;
  onCerrar: () => void;
  onGuardar: (diagrama: Diagrama, png: File) => void;
}) {
  const [diagrama, setDiagrama] = useState<Diagrama>(inicial ?? diagramaVacio());
  const [historial, setHistorial] = useState<string[]>([]);
  const [herramienta, setHerramienta] = useState<Herramienta>("jugador");
  const [color, setColor] = useState("#dc2626");
  const [etiqueta, setEtiqueta] = useState("");
  const [discontinua, setDiscontinua] = useState(false);
  const [seleccionId, setSeleccionId] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<ElementoDiagrama | null>(null);
  const [guardando, setGuardando] = useState(false);
  const campoRef = useRef<HTMLDivElement>(null);
  const arrastre = useRef<{
    id: string;
    ox: number;
    oy: number;
    original: ElementoDiagrama;
  } | null>(null);

  const svg = useMemo(
    () => diagramaASvg(diagrama, { seleccionId, borrador }),
    [diagrama, seleccionId, borrador],
  );

  function punto(e: React.PointerEvent) {
    const rect = campoRef.current!.getBoundingClientRect();
    return {
      x: Math.round(((e.clientX - rect.left) / rect.width) * CAMPO_ANCHO),
      y: Math.round(((e.clientY - rect.top) / rect.height) * CAMPO_ALTO),
    };
  }

  function guardarHistorial() {
    setHistorial((h) => [...h.slice(-30), JSON.stringify(diagrama)]);
  }

  function deshacer() {
    setHistorial((h) => {
      const ultimo = h[h.length - 1];
      if (!ultimo) return h;
      setDiagrama(JSON.parse(ultimo) as Diagrama);
      setSeleccionId(null);
      return h.slice(0, -1);
    });
  }

  function cambiarCampo(campo: TipoCampo) {
    guardarHistorial();
    setDiagrama((d) => ({ ...d, campo }));
  }

  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault();
    campoRef.current?.setPointerCapture(e.pointerId);
    const p = punto(e);

    if (herramienta === "mover") {
      const el = elementoEn(diagrama, p.x, p.y);
      setSeleccionId(el?.id ?? null);
      if (el) {
        guardarHistorial();
        arrastre.current = { id: el.id, ox: p.x, oy: p.y, original: el };
      }
      return;
    }

    if (herramienta === "flecha" || herramienta === "zona") {
      setBorrador({
        id: "borrador",
        tipo: herramienta,
        x: p.x,
        y: p.y,
        x2: p.x,
        y2: p.y,
        color: herramienta === "zona" ? "#111111" : color,
        discontinua,
      });
      return;
    }

    guardarHistorial();
    const colorElemento = COLOR_POR_DEFECTO[herramienta] ?? color;
    const nuevo: ElementoDiagrama = {
      id: nuevoId(),
      tipo: herramienta,
      x: p.x,
      y: p.y,
      color: herramienta === "balon" || herramienta === "porteria" ? undefined : colorElemento,
      etiqueta: herramienta === "jugador" || herramienta === "texto" ? etiqueta : undefined,
    };
    if (herramienta === "texto" && !etiqueta.trim()) {
      setHistorial((h) => h.slice(0, -1));
      return;
    }
    setDiagrama((d) => ({ ...d, elementos: [...d.elementos, nuevo] }));
    setSeleccionId(nuevo.id);
    // Con dorsales numéricos, el siguiente jugador sale ya con el número
    // siguiente: se pueden colocar 1, 2, 3... seguidos.
    if (herramienta === "jugador" && /^\d+$/.test(etiqueta)) {
      setEtiqueta(String(Number(etiqueta) + 1));
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const p = punto(e);
    if (borrador) {
      setBorrador({ ...borrador, x2: p.x, y2: p.y });
      return;
    }
    const a = arrastre.current;
    if (!a) return;
    const dx = p.x - a.ox;
    const dy = p.y - a.oy;
    setDiagrama((d) => ({
      ...d,
      elementos: d.elementos.map((el) =>
        el.id !== a.id
          ? el
          : {
              ...el,
              x: a.original.x + dx,
              y: a.original.y + dy,
              ...(a.original.x2 != null
                ? { x2: a.original.x2 + dx, y2: (a.original.y2 ?? 0) + dy }
                : {}),
            },
      ),
    }));
  }

  function onPointerUp() {
    arrastre.current = null;
    if (!borrador) return;
    const largo = Math.hypot((borrador.x2 ?? 0) - borrador.x, (borrador.y2 ?? 0) - borrador.y);
    if (largo > 10) {
      guardarHistorial();
      const nuevo = { ...borrador, id: nuevoId() };
      setDiagrama((d) => ({ ...d, elementos: [...d.elementos, nuevo] }));
      setSeleccionId(nuevo.id);
    }
    setBorrador(null);
  }

  function borrarSeleccion() {
    if (!seleccionId) return;
    guardarHistorial();
    setDiagrama((d) => ({
      ...d,
      elementos: d.elementos.filter((e) => e.id !== seleccionId),
    }));
    setSeleccionId(null);
  }

  function limpiar() {
    guardarHistorial();
    setDiagrama((d) => ({ ...d, elementos: [] }));
    setSeleccionId(null);
  }

  async function handleGuardar() {
    setGuardando(true);
    try {
      const png = await diagramaAPng(diagrama, `tarea-${numeroTarea}.png`);
      onGuardar(diagrama, png);
    } finally {
      setGuardando(false);
    }
  }

  const usaColor = ["jugador", "flecha", "texto"].includes(herramienta);

  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && onCerrar()}>
      <DialogContent className="max-h-[95vh] max-w-3xl overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Diagrama de la tarea {numeroTarea}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-1.5">
          {HERRAMIENTAS.map((h) => (
            <Button
              key={h.id}
              type="button"
              size="sm"
              variant={herramienta === h.id ? "default" : "outline"}
              onClick={() => setHerramienta(h.id)}
            >
              {h.icono}
              {h.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {usaColor && (
            <div className="flex items-center gap-1.5">
              {COLORES_DIAGRAMA.map((c) => (
                <button
                  key={c.valor}
                  type="button"
                  aria-label={c.nombre}
                  title={c.nombre}
                  onClick={() => setColor(c.valor)}
                  className={cn(
                    "size-7 rounded-full border-2",
                    color === c.valor ? "border-primary ring-2 ring-primary/40" : "border-border",
                  )}
                  style={{ backgroundColor: c.valor }}
                />
              ))}
            </div>
          )}
          {(herramienta === "jugador" || herramienta === "texto") && (
            <div className="space-y-1">
              <Label htmlFor="etiqueta-diagrama" className="text-xs">
                {herramienta === "jugador" ? "Número / letra" : "Texto"}
              </Label>
              <Input
                id="etiqueta-diagrama"
                value={etiqueta}
                onChange={(e) => setEtiqueta(e.target.value)}
                className="h-8 w-28"
                maxLength={herramienta === "jugador" ? 3 : 40}
              />
            </div>
          )}
          {herramienta === "flecha" && (
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={discontinua}
                onChange={(e) => setDiscontinua(e.target.checked)}
              />
              Discontinua (desplazamiento sin balón)
            </label>
          )}
          <div className="ml-auto flex gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={diagrama.campo === "medio" ? "default" : "outline"}
              onClick={() => cambiarCampo("medio")}
            >
              Medio campo
            </Button>
            <Button
              type="button"
              size="sm"
              variant={diagrama.campo === "completo" ? "default" : "outline"}
              onClick={() => cambiarCampo("completo")}
            >
              Campo completo
            </Button>
          </div>
        </div>

        <div
          ref={campoRef}
          className="w-full touch-none overflow-hidden rounded-md border select-none [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <p className="text-xs text-muted-foreground">
          Elige una herramienta y toca el campo para colocar. Flecha y zona:
          arrastra. Con &quot;Mover&quot; puedes arrastrar o seleccionar un
          elemento para borrarlo.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={historial.length === 0}
              onClick={deshacer}
            >
              <Undo2 className="size-4" />
              Deshacer
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!seleccionId}
              onClick={borrarSeleccion}
            >
              <Trash2 className="size-4" />
              Borrar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={diagrama.elementos.length === 0}
              onClick={limpiar}
            >
              Limpiar todo
            </Button>
          </div>
          <div className="flex gap-1.5">
            <Button type="button" variant="outline" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button type="button" disabled={guardando} onClick={handleGuardar}>
              {guardando ? "Generando..." : "Usar este diagrama"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
