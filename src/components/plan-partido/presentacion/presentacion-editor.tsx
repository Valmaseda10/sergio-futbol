"use client";

// Editor de la presentación de un partido: lista de diapositivas a la izquierda (arriba en el
// móvil), la diapositiva elegida en grande y debajo sus campos. Se guarda solo. Desde aquí se
// presenta a pantalla completa (sesión de vídeo), se imprime y se descarga en PDF.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  Copy,
  Download,
  Pencil,
  Plus,
  Presentation,
  Printer,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DiagramaEditor } from "@/components/entrenamientos/diagrama-editor";
import { localDb } from "@/lib/db/local-db";
import { diagramaVacio, type Diagrama } from "@/lib/ficha-entrenamiento";
import {
  guardarPresentacionLocal,
  obtenerOCrearPresentacionLocal,
} from "@/app/(app)/plan-partido/local-actions";
import {
  COLORES_TITULO,
  TIPOS_DIAPOSITIVA,
  leerPresentacion,
  nuevaDiapositiva,
  resumenDiapositiva,
  type ColorTitulo,
  type Diapositiva,
  type TipoDiapositiva,
} from "@/lib/presentacion-partido";
import {
  DiapositivaEscalada,
  type ContextoPresentacion,
} from "@/components/plan-partido/presentacion/diapositiva-vista";
import { HojasImpresion } from "@/components/plan-partido/presentacion/hojas-impresion";
import { useContextoPresentacion } from "@/components/plan-partido/presentacion/use-contexto-presentacion";
import { descargarPresentacionPdf } from "@/components/plan-partido/presentacion/presentacion-pdf";
import { fechaHoja } from "@/lib/plan-partido";
import { cn } from "@/lib/utils";

function SelectorColor({
  valor,
  onChange,
  etiqueta,
}: {
  valor: ColorTitulo;
  onChange: (c: ColorTitulo) => void;
  etiqueta: string;
}) {
  return (
    <div className="space-y-1">
      <Label>{etiqueta}</Label>
      <div className="flex gap-1.5">
        {COLORES_TITULO.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange(c.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium",
              valor === c.value ? "border-primary bg-primary/10" : "text-muted-foreground",
            )}
          >
            <span className="size-3 rounded-full border" style={{ backgroundColor: c.hex }} />
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Campo({
  etiqueta,
  valor,
  onChange,
  placeholder,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label>{etiqueta}</Label>
      <Input value={valor} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function CampoLargo({
  etiqueta,
  valor,
  onChange,
  filas = 4,
  placeholder,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  filas?: number;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label>{etiqueta}</Label>
      <Textarea value={valor} rows={filas} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function BotonDibujo({
  diagrama,
  onAbrir,
  onQuitar,
}: {
  diagrama: Diagrama | null;
  onAbrir: () => void;
  onQuitar: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="outline" onClick={onAbrir}>
        <Pencil className="size-4" />
        {diagrama ? "Editar dibujo" : "Dibujar"}
      </Button>
      {diagrama && (
        <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={onQuitar}>
          <X className="size-4" />
          Quitar dibujo
        </Button>
      )}
    </div>
  );
}

function FormularioDiapositiva({
  d,
  ctx,
  cambiar,
  dibujar,
}: {
  d: Diapositiva;
  ctx: ContextoPresentacion;
  cambiar: (parche: Partial<Diapositiva>) => void;
  /** Abre el dibujo de la diapositiva (o de uno de sus bloques). */
  dibujar: (indiceBloque?: number) => void;
}) {
  const parchar = (p: Record<string, unknown>) => cambiar(p as Partial<Diapositiva>);
  switch (d.tipo) {
    case "portada":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Equipo" valor={d.titulo} onChange={(v) => parchar({ titulo: v })} />
          <Campo etiqueta="Club" valor={d.subtitulo} onChange={(v) => parchar({ subtitulo: v })} />
          <Campo etiqueta="Temporada" valor={d.pie} onChange={(v) => parchar({ pie: v })} />
        </div>
      );
    case "informe":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Título" valor={d.titulo} onChange={(v) => parchar({ titulo: v })} />
          <Campo etiqueta="Competición" valor={d.competicion} onChange={(v) => parchar({ competicion: v })} />
          <Campo etiqueta="Jornada" valor={d.jornada} onChange={(v) => parchar({ jornada: v })} placeholder="JORNADA 2" />
          <Campo etiqueta="Día" valor={d.dia} onChange={(v) => parchar({ dia: v })} />
          <Campo etiqueta="Hora" valor={d.hora} onChange={(v) => parchar({ hora: v })} />
          <Campo etiqueta="Lugar" valor={d.lugar} onChange={(v) => parchar({ lugar: v })} />
          <Campo etiqueta="Superficie" valor={d.superficie} onChange={(v) => parchar({ superficie: v })} placeholder="CÉSPED ARTIFICIAL" />
          <Campo etiqueta="Citación" valor={d.citacion} onChange={(v) => parchar({ citacion: v })} placeholder="09:45h" />
          <CampoLargo etiqueta="Equipación" valor={d.equipacion} onChange={(v) => parchar({ equipacion: v })} filas={2} />
          <CampoLargo etiqueta="Árbitros" valor={d.arbitros} onChange={(v) => parchar({ arbitros: v })} filas={2} />
        </div>
      );
    case "texto":
      return (
        <div className="space-y-3">
          <Campo etiqueta="Título" valor={d.titulo} onChange={(v) => parchar({ titulo: v })} />
          <SelectorColor etiqueta="Color del título" valor={d.color} onChange={(c) => parchar({ color: c })} />
          <CampoLargo
            etiqueta="Texto (un renglón por línea)"
            valor={d.texto}
            onChange={(v) => parchar({ texto: v })}
            filas={8}
          />
        </div>
      );
    case "pizarra":
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Título" valor={d.titulo} onChange={(v) => parchar({ titulo: v })} />
            <SelectorColor etiqueta="Color del título" valor={d.color} onChange={(c) => parchar({ color: c })} />
          </div>
          <BotonDibujo
            diagrama={d.diagrama}
            onAbrir={() => dibujar()}
            onQuitar={() => parchar({ diagrama: null })}
          />
          <CampoLargo
            etiqueta="Texto al pie del campo"
            valor={d.pie}
            onChange={(v) => parchar({ pie: v })}
            filas={2}
            placeholder="ZONA 1: INICIOS PRESS – 1433 > INTERMEDIAS"
          />
          <SelectorColor etiqueta="Color del texto" valor={d.colorPie} onChange={(c) => parchar({ colorPie: c })} />
        </div>
      );
    case "bloques":
      return (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Título" valor={d.titulo} onChange={(v) => parchar({ titulo: v })} />
            <SelectorColor etiqueta="Color del título" valor={d.color} onChange={(c) => parchar({ color: c })} />
          </div>
          {d.bloques.map((b, i) => {
            const poner = (p: Partial<typeof b>) =>
              parchar({ bloques: d.bloques.map((x, k) => (k === i ? { ...x, ...p } : x)) });
            return (
              <div key={i} className="space-y-3 rounded-md border p-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Campo etiqueta={`Bloque ${i + 1}`} valor={b.titulo} onChange={(v) => poner({ titulo: v })} />
                  </div>
                  <input
                    type="color"
                    value={b.color}
                    onChange={(e) => poner({ color: e.target.value })}
                    aria-label="Color de la cabecera"
                    className="h-9 w-10 shrink-0 cursor-pointer rounded-md border bg-background p-0.5"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    aria-label="Quitar bloque"
                    onClick={() => parchar({ bloques: d.bloques.filter((_, k) => k !== i) })}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <CampoLargo etiqueta="Texto" valor={b.texto} onChange={(v) => poner({ texto: v })} filas={4} />
                <BotonDibujo
                  diagrama={b.diagrama}
                  onAbrir={() => dibujar(i)}
                  onQuitar={() => poner({ diagrama: null })}
                />
              </div>
            );
          })}
          {d.bloques.length < 4 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                parchar({
                  bloques: [...d.bloques, { titulo: "NUEVO BLOQUE", color: "#5b87a6", texto: "", diagrama: null }],
                })
              }
            >
              <Plus className="size-4" />
              Añadir bloque
            </Button>
          )}
        </div>
      );
    case "abp": {
      const todas = [...ctx.abp].sort((a, b) => a.orden - b.orden || a.created_at.localeCompare(b.created_at));
      const marcadas = new Set(d.jugadas);
      return (
        <div className="space-y-3">
          <Campo etiqueta="Título" valor={d.titulo} onChange={(v) => parchar({ titulo: v })} />
          <div className="space-y-1">
            <Label>Jugadas por fila</Label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => parchar({ columnas: n })}
                  className={cn(
                    "size-9 rounded-md border text-sm font-medium",
                    d.columnas === n ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          {todas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este partido todavía no tiene jugadas de ABP. Créalas en la ficha del partido → ABP; aparecerán aquí.
            </p>
          ) : (
            <div className="space-y-1">
              <Label>Jugadas que salen {d.jugadas.length === 0 && "(ahora salen todas)"}</Label>
              <div className="flex flex-wrap gap-1.5">
                {todas.map((j) => {
                  const on = marcadas.has(j.id);
                  return (
                    <button
                      key={j.id}
                      type="button"
                      onClick={() => {
                        const s = new Set(marcadas);
                        if (on) s.delete(j.id);
                        else s.add(j.id);
                        parchar({ jugadas: [...s] });
                      }}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium",
                        on ? "border-primary bg-primary text-primary-foreground" : "bg-background",
                      )}
                    >
                      {j.nombre}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }
    case "nuestro_once":
    case "rival_plantilla":
    case "rival_goles":
    case "rival_once":
      return (
        <div className="space-y-3">
          <Campo etiqueta="Título" valor={d.titulo} onChange={(v) => parchar({ titulo: v })} />
          <p className="text-xs text-muted-foreground">
            {d.tipo === "nuestro_once"
              ? "Sale sola con la alineación de este partido (Partidos → Alineación)."
              : "Sale sola con los datos de la ficha del rival (Rivales)."}
            {!ctx.rival && d.tipo !== "nuestro_once" && " Este partido todavía no tiene ficha de rival enlazada."}
          </p>
        </div>
      );
  }
}

export function PresentacionEditor({ partidoId }: { partidoId: string }) {
  const ctx = useContextoPresentacion(partidoId);
  const filas = useLiveQuery(
    () => localDb.presentaciones_partido.where("partido_id").equals(partidoId).toArray(),
    [partidoId],
  );
  const fila = filas?.[0] ?? null;
  const filaId = fila?.id ?? null;

  const [diapos, setDiapos] = useState<Diapositiva[] | null>(null);
  const [indice, setIndice] = useState(0);
  const [dibujando, setDibujando] = useState<{ bloque?: number } | null>(null);
  const [anadiendo, setAnadiendo] = useState(false);
  const [generando, setGenerando] = useState(false);

  // Guardado: se guarda poco después de la última edición y al salir.
  const pendiente = useRef<{ id: string; lista: Diapositiva[] } | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volcar = useCallback(async () => {
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = null;
    const p = pendiente.current;
    pendiente.current = null;
    if (p) await guardarPresentacionLocal(p.id, p.lista);
  }, []);
  useEffect(() => {
    const alSalir = () => void volcar();
    window.addEventListener("pagehide", alSalir);
    return () => {
      window.removeEventListener("pagehide", alSalir);
      void volcar();
    };
  }, [volcar]);

  // Si el partido todavía no tiene presentación, se crea con las diapositivas de siempre.
  useEffect(() => {
    if (filas !== undefined && filas.length === 0 && ctx) {
      void obtenerOCrearPresentacionLocal(partidoId);
    }
  }, [filas, ctx, partidoId]);

  // La primera vez que llega la presentación guardada se pasa al estado de edición.
  useEffect(() => {
    if (fila && diapos === null) {
      const guardadas = fila.diapositivas;
      queueMicrotask(() => setDiapos((actual) => actual ?? leerPresentacion(guardadas)));
    }
  }, [fila, diapos]);

  function guardar(lista: Diapositiva[]) {
    setDiapos(lista);
    if (!filaId) return;
    pendiente.current = { id: filaId, lista };
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => void volcar(), 700);
  }

  if (ctx === undefined || diapos === null) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }
  if (ctx === null) {
    return <p className="text-sm text-muted-foreground">Partido no encontrado.</p>;
  }

  const actual = diapos[Math.min(indice, Math.max(0, diapos.length - 1))];
  const i = Math.min(indice, Math.max(0, diapos.length - 1));
  const partido = ctx.partido;

  function cambiarActual(parche: Partial<Diapositiva>) {
    if (!actual || !diapos) return;
    guardar(diapos.map((d, k) => (k === i ? ({ ...d, ...parche } as Diapositiva) : d)));
  }

  function mover(delta: number) {
    if (!diapos) return;
    const destino = i + delta;
    if (destino < 0 || destino >= diapos.length) return;
    const lista = [...diapos];
    [lista[i], lista[destino]] = [lista[destino], lista[i]];
    guardar(lista);
    setIndice(destino);
  }

  function duplicar() {
    if (!diapos || !actual) return;
    const copia = { ...JSON.parse(JSON.stringify(actual)), id: crypto.randomUUID() } as Diapositiva;
    const lista = [...diapos];
    lista.splice(i + 1, 0, copia);
    guardar(lista);
    setIndice(i + 1);
  }

  function borrar() {
    if (!diapos || !actual) return;
    if (!window.confirm(`¿Quitar la diapositiva «${resumenDiapositiva(actual)}»?`)) return;
    const lista = diapos.filter((_, k) => k !== i);
    guardar(lista);
    setIndice(Math.max(0, i - 1));
  }

  function anadir(tipo: TipoDiapositiva) {
    if (!diapos) return;
    const nueva = nuevaDiapositiva(tipo);
    // Una pizarra nueva copia el título y el color de la actual si también es pizarra.
    if (nueva.tipo === "pizarra" && actual?.tipo === "pizarra") {
      nueva.titulo = actual.titulo;
      nueva.color = actual.color;
      nueva.colorPie = actual.colorPie;
    }
    const lista = [...diapos];
    lista.splice(i + 1, 0, nueva);
    guardar(lista);
    setIndice(i + 1);
    setAnadiendo(false);
  }

  const dibujoActual: Diagrama | null =
    actual?.tipo === "pizarra"
      ? actual.diagrama
      : actual?.tipo === "bloques" && dibujando?.bloque != null
        ? (actual.bloques[dibujando.bloque]?.diagrama ?? null)
        : null;

  function guardarDibujo(diagrama: Diagrama) {
    if (!actual) return;
    if (actual.tipo === "pizarra") cambiarActual({ diagrama });
    else if (actual.tipo === "bloques" && dibujando?.bloque != null) {
      const b = dibujando.bloque;
      cambiarActual({ bloques: actual.bloques.map((x, k) => (k === b ? { ...x, diagrama } : x)) });
    }
    setDibujando(null);
  }

  async function descargar() {
    if (!diapos) return;
    setGenerando(true);
    try {
      await descargarPresentacionPdf(
        diapos,
        ctx!,
        `Presentación ${partido.rival} ${fechaHoja(partido.fecha).replaceAll("/", "-")}.pdf`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se ha podido generar el PDF");
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 print:hidden">
        <Link
          href="/plan-partido/presentacion"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Presentaciones
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">Presentación vs {partido.rival}</h1>
            <p className="text-sm text-muted-foreground">
              {diapos.length} {diapos.length === 1 ? "diapositiva" : "diapositivas"} · se guarda sola
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/plan-partido/presentacion/${partidoId}/presentar`} className={buttonVariants({ size: "sm" })}>
              <Presentation className="size-4" />
              Presentar
            </Link>
            <Button type="button" size="sm" variant="outline" disabled={generando || diapos.length === 0} onClick={descargar}>
              <Download className="size-4" />
              {generando ? "Generando…" : "Descargar PDF"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => window.print()}>
              <Printer className="size-4" />
              Imprimir
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 print:hidden lg:grid-cols-[200px_minmax(0,1fr)]">
        {/* Lista de diapositivas */}
        <div className="space-y-2">
          <div className="flex gap-2 overflow-x-auto pb-1 lg:max-h-[75vh] lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden">
            {diapos.map((d, k) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setIndice(k)}
                className={cn(
                  "w-36 shrink-0 space-y-0.5 rounded-md border p-1 text-left lg:w-full",
                  k === i ? "border-primary ring-2 ring-primary/40" : "hover:bg-muted/50",
                )}
              >
                <DiapositivaEscalada d={d} ctx={ctx} className="rounded-sm border" />
                <p className="truncate px-0.5 text-[11px] text-muted-foreground">
                  {k + 1}. {resumenDiapositiva(d)}
                </p>
              </button>
            ))}
          </div>
          <div className="relative">
            <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => setAnadiendo((v) => !v)}>
              <Plus className="size-4" />
              Añadir diapositiva
            </Button>
            {anadiendo && (
              <div className="z-20 mt-1 space-y-0.5 rounded-md border bg-popover p-1 shadow-md lg:absolute lg:bottom-full lg:left-0 lg:mb-1 lg:w-72">
                {TIPOS_DIAPOSITIVA.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => anadir(t.value)}
                    className="block w-full rounded-sm px-2 py-1.5 text-left hover:bg-muted"
                  >
                    <span className="block text-sm font-medium">{t.label}</span>
                    <span className="block text-xs text-muted-foreground">{t.descripcion}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Diapositiva elegida */}
        {actual ? (
          <div className="min-w-0 space-y-3">
            <div className="mx-auto w-full max-w-[960px] overflow-hidden rounded-md border shadow-sm">
              <DiapositivaEscalada d={actual} ctx={ctx} />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button type="button" size="sm" variant="outline" disabled={i === 0} onClick={() => mover(-1)}>
                <ArrowUp className="size-4" />
                Subir
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={i === diapos.length - 1} onClick={() => mover(1)}>
                <ArrowDown className="size-4" />
                Bajar
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={duplicar}>
                <Copy className="size-4" />
                Duplicar
              </Button>
              <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={borrar}>
                <Trash2 className="size-4" />
                Quitar
              </Button>
            </div>
            <div className="rounded-md border p-3">
              <FormularioDiapositiva
                key={actual.id}
                d={actual}
                ctx={ctx}
                cambiar={cambiarActual}
                dibujar={(b) => setDibujando({ bloque: b })}
              />
            </div>
          </div>
        ) : (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No hay diapositivas. Añade la primera con el botón de la izquierda.
          </p>
        )}
      </div>

      <HojasImpresion diapositivas={diapos} ctx={ctx} />

      {dibujando && (
        <DiagramaEditor
          key={`${actual?.id}-${dibujando.bloque ?? "p"}`}
          abierto
          numeroTarea={0}
          titulo="Dibujo de la diapositiva"
          inicial={dibujoActual ?? diagramaVacio("completo")}
          onCerrar={() => setDibujando(null)}
          onGuardar={(diagrama) => guardarDibujo(diagrama)}
        />
      )}
    </div>
  );
}
