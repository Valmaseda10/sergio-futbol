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
  Shirt,
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
  anadirPiernas,
  COLORES_DIAGRAMA,
  diagramaASvg,
  diagramaAPng,
  diagramaVacio,
  dimensionesCampo,
  elementoEn,
  puntoMedioFlecha,
  type Diagrama,
  type ElementoDiagrama,
  type TipoCampo,
  type TipoElemento,
} from "@/lib/ficha-entrenamiento";
import { COLOR_ESTADO_PARTIDO, type EstadoPartido } from "@/lib/plan-partido";
import { OpcionesJugador } from "@/components/plan-partido/sincronizar-partido";

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
  { id: "icono", label: "Lanzador", icono: <Shirt className="size-4" /> },
];

// Dónde queda el nombre respecto al centro de la camiseta (en unidades del lienzo).
function posicionNombre(
  e: ElementoDiagrama,
  pos: "debajo" | "arriba" | "izquierda" | "derecha",
  k: number,
): Partial<ElementoDiagrama> {
  const ancho = 30 * k * (e.escala ?? 1);
  const alto = ancho * 1.24;
  switch (pos) {
    case "debajo":
      return { nombreDx: undefined, nombreDy: undefined };
    case "arriba":
      return { nombreDx: 0, nombreDy: -(alto / 2 + 8 * k) };
    case "izquierda":
      return { nombreDx: -(ancho / 2 + 38 * k), nombreDy: 5 * k };
    case "derecha":
      return { nombreDx: ancho / 2 + 38 * k, nombreDy: 5 * k };
  }
}

const COLOR_POR_DEFECTO: Partial<Record<TipoElemento, string>> = {
  cono: "#f97316",
  pica: "#facc15",
};

// Curvatura para que la flecha pase por el punto (px, py) a mitad de camino.
function curvaPorPunto(e: ElementoDiagrama, px: number, py: number): number | undefined {
  const x2 = e.x2 ?? e.x;
  const y2 = e.y2 ?? e.y;
  const dx = x2 - e.x;
  const dy = y2 - e.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1) return undefined;
  // Punto de control que hace pasar la curva cuadrática por (px, py) en t=0,5.
  const cx = 2 * px - 0.5 * (e.x + x2);
  const cy = 2 * py - 0.5 * (e.y + y2);
  const k = ((cx - (e.x + x2) / 2) * -dy + (cy - (e.y + y2) / 2) * dx) / len2;
  const acotada = Math.max(-1, Math.min(1, k));
  return Math.abs(acotada) < 0.05 ? undefined : Math.round(acotada * 100) / 100;
}

function descripcion(e: ElementoDiagrama): string {
  switch (e.tipo) {
    case "jugador":
      return `Camiseta ${e.etiqueta ?? ""}`.trim();
    case "icono":
      return e.icono === "lanzador" ? "Lanzador" : "Icono";
    case "texto":
      return `Texto: ${e.etiqueta ?? ""}`;
    case "flecha":
      return e.curva ? "Flecha curva" : "Flecha";
    case "zona":
      return "Zona";
    case "balon":
      return "Balón";
    case "cono":
      return "Cono";
    case "pica":
      return "Pica";
    case "porteria":
      return "Portería";
  }
}

function nuevoId() {
  return crypto.randomUUID();
}

export function DiagramaEditor({
  abierto,
  numeroTarea,
  titulo,
  camisetas,
  jugadores = [],
  estados,
  inicial,
  onCerrar,
  onGuardar,
}: {
  abierto: boolean;
  numeroTarea: number;
  /** Título del cuadro; por defecto, "Diagrama de la tarea N". */
  titulo?: string;
  /** Jugadores como camisetas de la Cultural (las jugadas de ABP). */
  camisetas?: boolean;
  /** Plantilla para el desplegable de cada camiseta (nombre ya en el formato que se quiera ver). */
  jugadores?: { id: string; nombre: string; pierna_dominante?: string | null }[];
  /** Titulares (verde) y suplentes (rojo) de un partido: raya bajo sus nombres y desplegable agrupado. */
  estados?: Map<string, EstadoPartido>;
  inicial: Diagrama | null;
  onCerrar: () => void;
  onGuardar: (diagrama: Diagrama, png: File) => void;
}) {
  const [diagrama, setDiagrama] = useState<Diagrama>(
    inicial ?? diagramaVacio(camisetas ? "abp" : "medio"),
  );
  const [historial, setHistorial] = useState<string[]>([]);
  const [herramienta, setHerramienta] = useState<Herramienta>("jugador");
  const [color, setColor] = useState("#dc2626");
  const [etiqueta, setEtiqueta] = useState("");
  const [discontinua, setDiscontinua] = useState(false);
  const [curvaNueva, setCurvaNueva] = useState(0);
  const [seleccionId, setSeleccionId] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<ElementoDiagrama | null>(null);
  const [guardando, setGuardando] = useState(false);
  const campoRef = useRef<HTMLDivElement>(null);
  const arrastre = useRef<{
    id: string;
    ox: number;
    oy: number;
    original: ElementoDiagrama;
    // Si se arrastra solo un extremo de una flecha o zona.
    punta?: "ini" | "fin" | "medio";
  } | null>(null);

  const nombres = useMemo(
    () => anadirPiernas(new Map(jugadores.map((j) => [j.id, j.nombre])), jugadores),
    [jugadores],
  );
  const { ancho: ANCHO, alto: ALTO, k: K } = dimensionesCampo(diagrama.campo);

  const subrayados = useMemo(
    () =>
      estados
        ? new Map([...estados].map(([id, e]) => [id, COLOR_ESTADO_PARTIDO[e]] as const))
        : undefined,
    [estados],
  );
  const svg = useMemo(
    () => diagramaASvg(diagrama, { seleccionId, borrador, camisetas, nombres, subrayados }),
    [diagrama, seleccionId, borrador, camisetas, nombres, subrayados],
  );

  function punto(e: React.PointerEvent) {
    const rect = campoRef.current!.getBoundingClientRect();
    return {
      x: Math.round(((e.clientX - rect.left) / rect.width) * ANCHO),
      y: Math.round(((e.clientY - rect.top) / rect.height) * ALTO),
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
      // Con una flecha o zona seleccionada, tocar uno de sus extremos lo mueve
      // solo a él (para cambiar hacia dónde va el movimiento).
      const sel = diagrama.elementos.find((x) => x.id === seleccionId);
      if (sel && sel.tipo === "flecha") {
        const m = puntoMedioFlecha(sel);
        if (Math.hypot(p.x - m.x, p.y - m.y) < 14 * K) {
          guardarHistorial();
          arrastre.current = { id: sel.id, ox: p.x, oy: p.y, original: sel, punta: "medio" };
          return;
        }
      }
      if (sel && (sel.tipo === "flecha" || sel.tipo === "zona")) {
        const dIni = Math.hypot(p.x - sel.x, p.y - sel.y);
        const dFin = Math.hypot(p.x - (sel.x2 ?? sel.x), p.y - (sel.y2 ?? sel.y));
        if (Math.min(dIni, dFin) < 16 * K) {
          guardarHistorial();
          arrastre.current = {
            id: sel.id,
            ox: p.x,
            oy: p.y,
            original: sel,
            punta: dIni <= dFin ? "ini" : "fin",
          };
          return;
        }
      }
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
        curva: herramienta === "flecha" && curvaNueva ? curvaNueva : undefined,
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
      icono: herramienta === "icono" ? "lanzador" : undefined,
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
          : a.punta === "medio"
            ? { ...el, curva: curvaPorPunto(el, p.x, p.y) }
            : a.punta === "ini"
              ? { ...el, x: p.x, y: p.y }
              : a.punta === "fin"
                ? { ...el, x2: p.x, y2: p.y }
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

  // Cambia propiedades del elemento seleccionado (texto, color, curva...).
  function actualizarSeleccion(parche: Partial<ElementoDiagrama>) {
    if (!seleccionId) return;
    guardarHistorial();
    setDiagrama((d) => ({
      ...d,
      elementos: d.elementos.map((e) => (e.id === seleccionId ? { ...e, ...parche } : e)),
    }));
  }

  function limpiar() {
    guardarHistorial();
    setDiagrama((d) => ({ ...d, elementos: [] }));
    setSeleccionId(null);
  }

  async function handleGuardar() {
    setGuardando(true);
    try {
      const png = await diagramaAPng(diagrama, `tarea-${numeroTarea}.png`, nombres);
      onGuardar(diagrama, png);
    } finally {
      setGuardando(false);
    }
  }

  const usaColor = ["jugador", "flecha", "texto"].includes(herramienta);
  const seleccionado = diagrama.elementos.find((e) => e.id === seleccionId) ?? null;

  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && onCerrar()}>
      <DialogContent className="max-h-[95vh] max-w-3xl overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{titulo ?? `Diagrama de la tarea ${numeroTarea}`}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-1.5">
          {HERRAMIENTAS.filter((h) => camisetas || h.id !== "icono").map((h) => (
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
          {herramienta === "flecha" && (
            <div className="flex items-center gap-1" role="group" aria-label="Trazo">
              {[
                { v: 0, t: "Recta" },
                { v: 0.3, t: "Curva ↷" },
                { v: -0.3, t: "Curva ↶" },
              ].map((o) => (
                <Button
                  key={o.v}
                  type="button"
                  size="sm"
                  variant={curvaNueva === o.v ? "default" : "outline"}
                  onClick={() => setCurvaNueva(o.v)}
                >
                  {o.t}
                </Button>
              ))}
            </div>
          )}
          <div className={cn("ml-auto flex gap-1.5", camisetas && "hidden")}>
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
          arrastra. Con &quot;Mover&quot; puedes arrastrar un elemento o, si es una
          flecha o zona, sus extremos (y el cuadradito del medio de una flecha
          para curvarla); al seleccionarlo puedes cambiarle el texto, el color, el
          grosor o la curva, o borrarlo. Si algo queda tapado, tócalo en la lista
          de arriba.
        </p>

        {diagrama.elementos.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold">
              Todo lo que hay en el dibujo (toca uno para seleccionarlo y editarlo)
            </p>
            <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
              {diagrama.elementos.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    setHerramienta("mover");
                    setSeleccionId(e.id);
                  }}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[11px]",
                    e.id === seleccionId
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-muted",
                  )}
                >
                  {descripcion(e)}
                </button>
              ))}
            </div>
          </div>
        )}

        {seleccionado && (
          <div className="space-y-2 rounded-md border bg-muted/30 p-2">
            <p className="text-xs font-semibold">Elemento seleccionado</p>
            {camisetas &&
              (seleccionado.tipo === "jugador" ||
                (seleccionado.tipo === "icono" && seleccionado.icono === "lanzador")) && (
              <div className="flex flex-wrap items-end gap-3 border-b pb-2">
                <div className="space-y-1">
                  <Label htmlFor="jugador-seleccion" className="text-xs">
                    {seleccionado.tipo === "icono"
                      ? "Lanzador (su nombre sale junto al icono)"
                      : "Jugador (su nombre sale junto a la camiseta)"}
                  </Label>
                  <select
                    id="jugador-seleccion"
                    value={seleccionado.jugador_id ?? ""}
                    onChange={(e) =>
                      actualizarSeleccion({
                        jugador_id: e.target.value || null,
                        nombre: e.target.value ? undefined : seleccionado.nombre,
                      })
                    }
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="">— Sin elegir / escribir a mano —</option>
                    <OpcionesJugador jugadores={jugadores} estados={estados} />
                  </select>
                </div>
                {!seleccionado.jugador_id && (
                  <div className="space-y-1">
                    <Label htmlFor="nombre-seleccion" className="text-xs">
                      Nombre a mano
                    </Label>
                    <Input
                      id="nombre-seleccion"
                      value={seleccionado.nombre ?? ""}
                      onChange={(e) => actualizarSeleccion({ nombre: e.target.value })}
                      className="h-8 w-40"
                      maxLength={30}
                    />
                  </div>
                )}
                {(
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="jugador2-seleccion" className="text-xs">
                        {seleccionado.tipo === "icono"
                          ? "Segundo lanzador (la otra pierna: zurdo o diestro)"
                          : "Segundo jugador (alterna en esta posición)"}
                      </Label>
                      <select
                        id="jugador2-seleccion"
                        value={seleccionado.jugador2_id ?? ""}
                        onChange={(e) =>
                          actualizarSeleccion({
                            jugador2_id: e.target.value || null,
                            nombre2: e.target.value ? undefined : seleccionado.nombre2,
                          })
                        }
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="">— Ninguno / escribir a mano —</option>
                        <OpcionesJugador jugadores={jugadores} estados={estados} />
                      </select>
                    </div>
                    {!seleccionado.jugador2_id && (
                      <div className="space-y-1">
                        <Label htmlFor="nombre2-seleccion" className="text-xs">
                          Nombre a mano (segundo)
                        </Label>
                        <Input
                          id="nombre2-seleccion"
                          value={seleccionado.nombre2 ?? ""}
                          onChange={(e) => actualizarSeleccion({ nombre2: e.target.value })}
                          className="h-8 w-40"
                          maxLength={30}
                        />
                      </div>
                    )}
                  </>
                )}
                <div className="flex items-center gap-1.5" role="group" aria-label="Color del nombre">
                  {COLORES_DIAGRAMA.map((c) => (
                    <button
                      key={c.valor}
                      type="button"
                      aria-label={`Nombre en ${c.nombre}`}
                      title={`Nombre en ${c.nombre}`}
                      onClick={() => actualizarSeleccion({ colorNombre: c.valor })}
                      className={cn(
                        "size-5 rounded-full border-2",
                        (seleccionado.colorNombre ?? "#111111") === c.valor
                          ? "border-primary ring-2 ring-primary/40"
                          : "border-border",
                      )}
                      style={{ backgroundColor: c.valor }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1" role="group" aria-label="Posición del nombre">
                  {(["debajo", "arriba", "izquierda", "derecha"] as const).map((pos) => (
                    <Button
                      key={pos}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => actualizarSeleccion(posicionNombre(seleccionado, pos, dimensionesCampo(diagrama.campo).k))}
                    >
                      {pos}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-1" role="group" aria-label="Tamaño">
                  {[
                    { v: 0.8, t: "Pequeña" },
                    { v: 1, t: "Normal" },
                    { v: 1.6, t: "Grande" },
                  ].map((o) => (
                    <Button
                      key={o.t}
                      type="button"
                      size="sm"
                      variant={(seleccionado.escala ?? 1) === o.v ? "default" : "outline"}
                      onClick={() => actualizarSeleccion({ escala: o.v === 1 ? undefined : o.v })}
                    >
                      {o.t}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-end gap-3">
              {(seleccionado.tipo === "jugador" || seleccionado.tipo === "texto") && (
                <div className="space-y-1">
                  <Label htmlFor="etiqueta-seleccion" className="text-xs">
                    {seleccionado.tipo === "jugador" ? "Número / letra" : "Texto"}
                  </Label>
                  <Input
                    id="etiqueta-seleccion"
                    value={seleccionado.etiqueta ?? ""}
                    onChange={(e) => actualizarSeleccion({ etiqueta: e.target.value })}
                    className="h-8 w-40"
                    maxLength={seleccionado.tipo === "jugador" ? 3 : 40}
                  />
                </div>
              )}
              {seleccionado.tipo !== "balon" && seleccionado.tipo !== "porteria" && (
                <div className="flex items-center gap-1.5">
                  {COLORES_DIAGRAMA.map((c) => (
                    <button
                      key={c.valor}
                      type="button"
                      aria-label={c.nombre}
                      title={c.nombre}
                      onClick={() => actualizarSeleccion({ color: c.valor })}
                      className={cn(
                        "size-6 rounded-full border-2",
                        seleccionado.color === c.valor
                          ? "border-primary ring-2 ring-primary/40"
                          : "border-border",
                      )}
                      style={{ backgroundColor: c.valor }}
                    />
                  ))}
                </div>
              )}
              {(seleccionado.tipo === "flecha" || seleccionado.tipo === "zona") && (
                <div className="flex items-center gap-1" role="group" aria-label="Grosor">
                  {[
                    { v: 2, t: "Fina" },
                    { v: seleccionado.tipo === "flecha" ? 3 : 2.5, t: "Normal" },
                    { v: 5, t: "Gruesa" },
                  ].map((o) => (
                    <Button
                      key={o.t}
                      type="button"
                      size="sm"
                      variant={(seleccionado.grosor ?? (seleccionado.tipo === "flecha" ? 3 : 2.5)) === o.v ? "default" : "outline"}
                      onClick={() => actualizarSeleccion({ grosor: o.v })}
                    >
                      {o.t}
                    </Button>
                  ))}
                </div>
              )}
              {seleccionado.tipo === "zona" && (
                <label className="flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={!seleccionado.solida}
                    onChange={(e) => actualizarSeleccion({ solida: !e.target.checked })}
                  />
                  Borde discontinuo
                </label>
              )}
              {seleccionado.tipo === "flecha" && (
                <>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={!seleccionado.sinPunta}
                      onChange={(e) => actualizarSeleccion({ sinPunta: !e.target.checked })}
                    />
                    Con punta
                  </label>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={!!seleccionado.discontinua}
                      onChange={(e) => actualizarSeleccion({ discontinua: e.target.checked })}
                    />
                    Discontinua
                  </label>
                  <div className="flex items-center gap-1" role="group" aria-label="Trazo">
                    {[
                { v: 0, t: "Recta" },
                { v: 0.3, t: "Curva ↷" },
                { v: -0.3, t: "Curva ↶" },
              ].map((o) => (
                      <Button
                        key={o.v}
                        type="button"
                        size="sm"
                        variant={(seleccionado.curva ?? 0) === o.v ? "default" : "outline"}
                        onClick={() => actualizarSeleccion({ curva: o.v || undefined })}
                      >
                        {o.t}
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

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
