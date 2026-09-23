"use client";

// Panel de control para ir marcando sobre la marcha lo que pasa en el
// partido: tocas qué ha pasado (el minuto se toma del cronómetro en ese
// instante) y, según cómo esté configurada esa categoría, se pide después
// quién ha sido y/o en qué zona del campo — o se guarda directamente de un
// solo toque si es puramente de conteo. Las categorías se definen
// libremente desde aquí mismo (engranaje) o desde Tagueo → Categorías.

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  BarChart3,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Download,
  Flag,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Tag,
  Trash2,
} from "lucide-react";
import {
  crearEtiquetaPartidoLocal,
  eliminarEtiquetaPartidoLocal,
  vaciarTagueoPartidoLocal,
} from "@/app/(app)/partidos/local-actions";
import { reordenarEtiquetasLocal } from "@/app/(app)/tagueo/local-actions";
import type { LocalAlineacion, LocalEtiquetaPartido, LocalEventoPartido } from "@/lib/db/local-db";
import { useCronometro } from "@/components/tagueo/use-cronometro";
import {
  CampoCompletoMini,
  CampoCompletoSelector,
} from "@/components/partidos/campo-mini-selector";
import { CampoJugadorSelector } from "@/components/tagueo/campo-jugador-selector";
import { TagueoResumenChart } from "@/components/tagueo/tagueo-resumen-chart";
import { EtiquetasPanel } from "@/components/tagueo/etiquetas-panel";
import { exportarEtiquetasExcel } from "@/lib/etiquetas-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Jugador {
  id: string;
  nombre: string;
  apellidos: string;
  alias: string | null;
  dorsal: number | null;
}

interface Etiqueta {
  id: string;
  nombre: string;
  color: string;
  requiere_jugador: boolean;
  requiere_zona: boolean;
}

type Paso = "categoria" | "jugador" | "zona" | "cambio";

function nombreMostrado(j: Jugador) {
  return j.alias || `${j.nombre} ${j.apellidos}`;
}

function dosDigitos(n: number) {
  return String(n).padStart(2, "0");
}

export function EtiquetasList({
  partidoId,
  rival,
  fecha,
  convocados,
  etiquetas,
  registros,
  titularesIniciales,
  eventos,
}: {
  partidoId: string;
  rival: string;
  fecha: string;
  convocados: Jugador[];
  etiquetas: Etiqueta[];
  registros: LocalEtiquetaPartido[];
  titularesIniciales: Pick<
    LocalAlineacion,
    "id" | "jugador_id" | "nombre_libre" | "posicion_jugada" | "pos_x" | "pos_y"
  >[];
  eventos: LocalEventoPartido[];
}) {
  const cronometro = useCronometro(partidoId);

  const [paso, setPaso] = useState<Paso>("categoria");
  const [etiquetaActual, setEtiquetaActual] = useState<Etiqueta | null>(null);
  const [tiempoCapturado, setTiempoCapturado] = useState<{
    minuto: number;
    segundo: number;
    parte: 1 | 2;
  }>({ minuto: 0, segundo: 0, parte: 1 });
  const [jugadorElegido, setJugadorElegido] = useState<string | null>(null); // null = equipo
  const [zona, setZona] = useState<{ top: number; left: number } | null>(null);
  const [notas, setNotas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [borrando, setBorrando] = useState<string | null>(null);
  const [categoriaAbierta, setCategoriaAbierta] = useState<string | null>(null);
  // Resumen contado + exportar: accesible en todo momento desde su propio
  // botón (no solo al finalizar), así se puede consultar o descargar a
  // mitad de partido sin tener que parar el cronómetro para verlo.
  const [resumenAbierto, setResumenAbierto] = useState(false);
  const [confirmarVaciarAbierto, setConfirmarVaciarAbierto] = useState(false);
  const [vaciando, setVaciando] = useState(false);
  const [gestionarAbierto, setGestionarAbierto] = useState(false);

  // Reordenar categorías manteniendo pulsado, directamente aquí (sin ir a
  // "Categorías"): ordenEditable solo existe mientras se está reordenando —
  // arranca como copia de `etiquetas` y ahí se va reflejando el arrastre en
  // vivo — y arrastrandoId marca cuál se está moviendo. Al soltar se guarda
  // el nuevo orden y se sale del modo.
  const [ordenEditable, setOrdenEditable] = useState<Etiqueta[] | null>(null);
  const [arrastrandoId, setArrastrandoId] = useState<string | null>(null);
  const pulsacionLargaRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origenPulsacionRef = useRef<{ x: number; y: number } | null>(null);
  const fueArrastreRef = useRef(false);

  const jugadoresPorId = new Map(convocados.map((j) => [j.id, j]));

  // Borra todo lo tagueado en este partido y reinicia el cronómetro, para
  // empezar de cero (partido metido por error, o una prueba antes de
  // empezar de verdad). Destructivo de verdad — a diferencia de pausar, que
  // ya no tiene efectos secundarios — así que pide confirmación.
  async function handleConfirmarVaciar() {
    setVaciando(true);
    await vaciarTagueoPartidoLocal(partidoId);
    cronometro.reiniciar();
    setVaciando(false);
    setConfirmarVaciarAbierto(false);
    resetear();
    toast.success("Tagueo borrado, listo para empezar de cero");
  }

  async function handleFinalizarPartido() {
    if (cronometro.corriendo) cronometro.toggle();
    setResumenAbierto(true);
  }

  // Agrupa los registros por categoría para el contador en cada botón de
  // "¿Qué ha pasado?" y para el resumen desplegable de más abajo.
  const registrosPorEtiqueta = new Map<string, LocalEtiquetaPartido[]>();
  for (const registro of registros) {
    const grupo = registrosPorEtiqueta.get(registro.etiqueta_id) ?? [];
    grupo.push(registro);
    registrosPorEtiqueta.set(registro.etiqueta_id, grupo);
  }

  // Resumen ordenado de más a menos tocada (no por el orden de creación de
  // la categoría) — así el gráfico y la lista muestran primero lo que más
  // ha pasado en el partido, que es lo que interesa de un vistazo.
  const gruposOrdenados = etiquetas
    .map((etiqueta) => ({
      etiqueta,
      items: registrosPorEtiqueta.get(etiqueta.id) ?? [],
    }))
    .filter((grupo) => grupo.items.length > 0)
    .sort((a, b) => b.items.length - a.items.length);

  async function handleDescargarExcel() {
    if (registros.length === 0) {
      toast.error("No hay nada que exportar en este partido");
      return;
    }
    const etiquetasPorId = new Map(etiquetas.map((e) => [e.id, e]));
    await exportarEtiquetasExcel(
      registros.map((r) => ({
        fecha,
        rival,
        etiqueta: etiquetasPorId.get(r.etiqueta_id)?.nombre ?? "?",
        jugador: r.jugador_id
          ? (jugadoresPorId.get(r.jugador_id) ? nombreMostrado(jugadoresPorId.get(r.jugador_id)!) : "?")
          : "Equipo",
        minuto: r.minuto,
        nota: r.notas,
      })),
      `tagueo-vs-${rival}.xlsx`,
    );
    toast.success("Excel descargado");
  }

  function ordenarPorTiempo(items: LocalEtiquetaPartido[]) {
    return items.slice().sort((a, b) => {
      const parteA = a.parte ?? 1;
      const parteB = b.parte ?? 1;
      if (parteA !== parteB) return parteA - parteB;
      const segA = (a.minuto ?? 999) * 60 + (a.segundo ?? 0);
      const segB = (b.minuto ?? 999) * 60 + (b.segundo ?? 0);
      return segA - segB;
    });
  }

  function resetear() {
    setPaso("categoria");
    setEtiquetaActual(null);
    setJugadorElegido(null);
    setZona(null);
    setNotas("");
  }

  // Guarda un registro directamente, sin depender del estado de los pasos
  // (etiquetaActual/zona/notas): lo usan tanto el botón "Guardar" del paso
  // final como el toque único de una categoría "solo contar" (sin jugador
  // ni zona), que no llega a pasar por ningún paso intermedio.
  async function guardarRegistro(datos: {
    etiquetaId: string;
    jugadorId: string | null;
    tiempo: { minuto: number; segundo: number; parte: 1 | 2 };
    posicion: { top: number; left: number } | null;
    notas: string;
  }) {
    setEnviando(true);
    const result = await crearEtiquetaPartidoLocal({
      partidoId,
      etiquetaId: datos.etiquetaId,
      jugadorId: datos.jugadorId,
      minuto: datos.tiempo.minuto,
      segundo: datos.tiempo.segundo,
      parte: datos.tiempo.parte,
      notas: datos.notas,
      posicion: datos.posicion,
    });
    setEnviando(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Registrado");
    resetear();
  }

  // Umbral de tiempo pulsado antes de entrar en "modo reordenar" (como
  // reordenar iconos en el móvil): lo bastante corto para no sentirse lento,
  // lo bastante largo para no confundirse con un toque normal.
  const MS_PULSACION_LARGA = 450;
  // Si el dedo se mueve más de esto antes de que salte el temporizador, se
  // entiende que es un scroll o un toque impreciso, no una intención de
  // reordenar — se cancela sin más.
  const PX_TOLERANCIA_MOVIMIENTO = 10;

  function cancelarPulsacionLarga() {
    if (pulsacionLargaRef.current) {
      clearTimeout(pulsacionLargaRef.current);
      pulsacionLargaRef.current = null;
    }
    origenPulsacionRef.current = null;
  }

  function handlePointerDownCategoria(e: React.PointerEvent, etiqueta: Etiqueta) {
    origenPulsacionRef.current = { x: e.clientX, y: e.clientY };
    pulsacionLargaRef.current = setTimeout(() => {
      pulsacionLargaRef.current = null;
      // La captura de puntero solo re-dirige los eventos "pointer*" (mover,
      // soltar...) al chip de origen — el "click" que el navegador dispara
      // justo después de soltar sigue yendo al chip que haya debajo del
      // dedo en ese momento, no al de origen. Sin esta marca, soltar tras
      // arrastrar registraría de paso un toque en el chip donde se suelta.
      fueArrastreRef.current = true;
      navigator.vibrate?.(30);
      setOrdenEditable(etiquetas.slice());
      setArrastrandoId(etiqueta.id);
      e.currentTarget.setPointerCapture(e.pointerId);
    }, MS_PULSACION_LARGA);
  }

  function handlePointerMoveCategoria(e: React.PointerEvent, etiqueta: Etiqueta) {
    if (pulsacionLargaRef.current && origenPulsacionRef.current) {
      const dx = e.clientX - origenPulsacionRef.current.x;
      const dy = e.clientY - origenPulsacionRef.current.y;
      if (Math.hypot(dx, dy) > PX_TOLERANCIA_MOVIMIENTO) cancelarPulsacionLarga();
      return;
    }
    if (arrastrandoId !== etiqueta.id || !ordenEditable) return;
    // En vez de calcular filas/columnas a mano (el grid tiene 2-3 columnas
    // y salta de línea), se mira directamente qué chip hay debajo del dedo
    // y se intercambia con ese — más simple y funciona igual de bien.
    const elementoDebajo = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest<HTMLElement>("[data-etiqueta-id]");
    const idDestino = elementoDebajo?.dataset.etiquetaId;
    if (!idDestino || idDestino === arrastrandoId) return;
    setOrdenEditable((prev) => {
      if (!prev) return prev;
      const indiceOrigen = prev.findIndex((et) => et.id === arrastrandoId);
      const indiceDestino = prev.findIndex((et) => et.id === idDestino);
      if (indiceOrigen === -1 || indiceDestino === -1) return prev;
      const siguiente = prev.slice();
      const [movida] = siguiente.splice(indiceOrigen, 1);
      siguiente.splice(indiceDestino, 0, movida);
      return siguiente;
    });
  }

  // El "click" que sigue a soltar (ver más arriba en fueArrastreRef) llega
  // en la misma tarea del navegador que el "pointerup", así que basta con
  // esperar a la siguiente vuelta del bucle de eventos para desactivar la
  // marca — tiempo de sobra para que ese click, si llega, la encuentre
  // activa y se ignore, sin bloquear toques genuinos posteriores.
  function limpiarMarcaArrastreTrasClick() {
    setTimeout(() => {
      fueArrastreRef.current = false;
    }, 100);
  }

  async function handlePointerUpCategoria() {
    cancelarPulsacionLarga();
    if (!arrastrandoId || !ordenEditable) return;
    const nuevoOrden = ordenEditable;
    setArrastrandoId(null);
    setOrdenEditable(null);
    limpiarMarcaArrastreTrasClick();
    await reordenarEtiquetasLocal(nuevoOrden.map((et) => et.id));
  }

  // A diferencia de soltar, cancelar (el sistema le quita la captura del
  // puntero, p. ej. porque ha entrado un scroll) no guarda nada: se
  // descarta el arrastre en curso tal cual estuviera antes de tocar.
  function handlePointerCancelCategoria() {
    cancelarPulsacionLarga();
    if (arrastrandoId) limpiarMarcaArrastreTrasClick();
    setArrastrandoId(null);
    setOrdenEditable(null);
  }

  function handleClickCategoria(etiqueta: Etiqueta) {
    if (fueArrastreRef.current) return;
    handleElegirCategoria(etiqueta);
  }

  function handleElegirCategoria(etiqueta: Etiqueta) {
    const tiempo = {
      minuto: cronometro.minuto,
      segundo: cronometro.segundos,
      parte: cronometro.parte,
    };
    // Categorías puramente de conteo (ni jugador ni zona, p. ej. "Córner
    // defensivo"): un solo toque basta, sin pasar por ningún paso
    // intermedio.
    if (!etiqueta.requiere_jugador && !etiqueta.requiere_zona) {
      guardarRegistro({
        etiquetaId: etiqueta.id,
        jugadorId: null,
        tiempo,
        posicion: null,
        notas: "",
      });
      return;
    }
    setEtiquetaActual(etiqueta);
    setTiempoCapturado(tiempo);
    // Categorías del rival o recibidas (p. ej. "Llegada rival"): no tiene
    // sentido preguntar qué jugador nuestro ha sido, se cuentan solo para
    // el equipo y se va directo a la zona.
    if (!etiqueta.requiere_jugador) {
      setJugadorElegido(null);
      setPaso("zona");
      return;
    }
    setPaso("jugador");
  }

  function handleElegirJugador(jugadorId: string | null) {
    setJugadorElegido(jugadorId);
    // Categoría de jugador sin zona (p. ej. "Duelo perdido": interesa saber
    // quién lo pierde, no dónde): se guarda en cuanto se elige el jugador.
    if (etiquetaActual && !etiquetaActual.requiere_zona) {
      guardarRegistro({
        etiquetaId: etiquetaActual.id,
        jugadorId,
        tiempo: tiempoCapturado,
        posicion: null,
        notas: "",
      });
      return;
    }
    setPaso("zona");
  }

  function handleVolver() {
    if (paso === "zona") {
      // Si esta categoría se saltó el paso de jugador, "volver" desde la
      // zona vuelve directo a elegir categoría — no tiene sentido pasar
      // por una pantalla de "quién ha sido" que nunca se llegó a mostrar.
      if (etiquetaActual && !etiquetaActual.requiere_jugador) {
        resetear();
        return;
      }
      setPaso("jugador");
      return;
    }
    if (paso === "jugador") {
      resetear();
    }
  }

  async function handleGuardar() {
    if (!etiquetaActual) return;
    await guardarRegistro({
      etiquetaId: etiquetaActual.id,
      jugadorId: jugadorElegido,
      tiempo: tiempoCapturado,
      posicion: zona,
      notas,
    });
  }

  async function handleBorrar(id: string) {
    setBorrando(id);
    await eliminarEtiquetaPartidoLocal(id);
    setBorrando(null);
  }

  const jugadorElegidoNombre = jugadorElegido
    ? (jugadoresPorId.get(jugadorElegido) ? nombreMostrado(jugadoresPorId.get(jugadorElegido)!) : "?")
    : "Equipo";

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-md border p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-heading text-2xl tabular-nums">
              {dosDigitos(cronometro.minuto)}:{dosDigitos(cronometro.segundos)}
            </p>
            <p className="text-xs text-muted-foreground">
              {cronometro.corriendo
                ? `En juego · ${cronometro.parte}ª parte`
                : "Parado"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={registros.length === 0}
              onClick={() => setResumenAbierto(true)}
              aria-label="Ver resumen"
            >
              <BarChart3 className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={cronometro.reiniciar}
              aria-label="Reiniciar cronómetro"
            >
              <RotateCcw className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              onClick={cronometro.toggle}
              aria-label={cronometro.corriendo ? "Pausar" : "Reanudar"}
            >
              {cronometro.corriendo ? (
                <Pause className="size-4" />
              ) : (
                <Play className="size-4" />
              )}
            </Button>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={handleFinalizarPartido}
        >
          <Flag className="size-4" />
          Finalizar partido
        </Button>
        {titularesIniciales.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => setPaso("cambio")}
          >
            <ArrowLeftRight className="size-4" />
            Hacer un cambio
          </Button>
        )}
        {registros.length > 0 && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={handleDescargarExcel}
            >
              <Download className="size-4" />
              Descargar Excel
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => setConfirmarVaciarAbierto(true)}
            >
              <Trash2 className="size-4" />
              Borrar todo y empezar de cero
            </Button>
          </>
        )}
      </div>

      {paso === "categoria" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-muted-foreground">
              ¿Qué ha pasado?
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setGestionarAbierto(true)}
              aria-label="Añadir o editar categorías"
            >
              <Settings2 className="size-4" />
            </Button>
          </div>
          {etiquetas.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Todavía no hay categorías definidas.{" "}
              <button
                type="button"
                onClick={() => setGestionarAbierto(true)}
                className="font-medium underline"
              >
                Créalas aquí
              </button>
              .
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Mantén pulsado un tag para reordenarlos.
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {(ordenEditable ?? etiquetas).map((etiqueta) => {
                  const cuenta = registrosPorEtiqueta.get(etiqueta.id)?.length ?? 0;
                  const arrastrandoEsta = arrastrandoId === etiqueta.id;
                  return (
                    <button
                      key={etiqueta.id}
                      type="button"
                      data-etiqueta-id={etiqueta.id}
                      onPointerDown={(e) => handlePointerDownCategoria(e, etiqueta)}
                      onPointerMove={(e) => handlePointerMoveCategoria(e, etiqueta)}
                      onPointerUp={handlePointerUpCategoria}
                      onPointerCancel={handlePointerCancelCategoria}
                      onClick={() => handleClickCategoria(etiqueta)}
                      className={cn(
                        "relative flex touch-none items-center gap-1 rounded-full py-1.5 pr-1.5 pl-2.5 text-xs font-semibold text-neutral-900 shadow select-none",
                        arrastrandoEsta && "z-10 scale-110 shadow-lg",
                      )}
                      style={{ backgroundColor: etiqueta.color }}
                    >
                      <Check className="size-3 shrink-0" strokeWidth={3} />
                      <span className="min-w-0 flex-1 truncate text-left">
                        {etiqueta.nombre}
                      </span>
                      {cuenta > 0 && (
                        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-black/15 text-[10px] font-bold tabular-nums">
                          {cuenta}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      <Dialog open={gestionarAbierto} onOpenChange={setGestionarAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Categorías de tagueo</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            <EtiquetasPanel />
          </div>
        </DialogContent>
      </Dialog>

      {paso === "jugador" && etiquetaActual && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleVolver}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: etiquetaActual.color }}
            />
            {etiquetaActual.nombre} ·{" "}
            {dosDigitos(tiempoCapturado.minuto)}:{dosDigitos(tiempoCapturado.segundo)} ·{" "}
            {tiempoCapturado.parte}ª parte
          </button>
          {titularesIniciales.length === 0 ? (
            <>
              <p className="text-sm font-medium text-muted-foreground">
                ¿Quién ha sido?
              </p>
              <p className="text-xs text-muted-foreground">
                Todavía no hay alineación para ver a los jugadores en el
                campo — de momento, elige de esta lista.
              </p>
              <ul className="flex flex-wrap gap-2">
                <li>
                  <button
                    type="button"
                    onClick={() => handleElegirJugador(null)}
                    className="rounded-full border py-1 px-3 text-sm hover:bg-muted"
                  >
                    Equipo (sin jugador)
                  </button>
                </li>
                {convocados.map((j) => (
                  <li key={j.id}>
                    <button
                      type="button"
                      onClick={() => handleElegirJugador(j.id)}
                      className="flex items-center gap-2 rounded-full border py-1 pr-3 pl-2 text-sm hover:bg-muted"
                    >
                      <span className="flex size-6 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                        {j.dorsal ?? nombreMostrado(j)[0]}
                      </span>
                      {nombreMostrado(j)}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <CampoJugadorSelector
              partidoId={partidoId}
              convocados={convocados}
              titularesIniciales={titularesIniciales}
              eventos={eventos}
              minutoSugerido={tiempoCapturado.minuto}
              onSeleccionarJugador={handleElegirJugador}
            />
          )}
        </div>
      )}

      {paso === "zona" && etiquetaActual && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleVolver}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: etiquetaActual.color }}
            />
            {etiquetaActual.nombre} ·{" "}
            {dosDigitos(tiempoCapturado.minuto)}:{dosDigitos(tiempoCapturado.segundo)} ·{" "}
            {jugadorElegidoNombre}
          </button>
          <p className="text-sm font-medium text-muted-foreground">
            ¿En qué zona? (opcional)
          </p>
          <CampoCompletoSelector
            value={zona}
            onChange={setZona}
            flip={tiempoCapturado.parte === 2}
          />
          <Input
            placeholder="Nota (opcional)"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
          <Button
            className="w-full"
            disabled={enviando}
            onClick={handleGuardar}
          >
            {enviando ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      )}

      {paso === "cambio" && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setPaso("categoria")}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            Volver
          </button>
          <CampoJugadorSelector
            partidoId={partidoId}
            convocados={convocados}
            titularesIniciales={titularesIniciales}
            eventos={eventos}
            minutoSugerido={cronometro.minuto}
            soloCambio
          />
        </div>
      )}

      {registros.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            Resumen del partido
          </p>
          <TagueoResumenChart
            datos={gruposOrdenados.map(({ etiqueta, items }) => ({
              nombre: etiqueta.nombre,
              color: etiqueta.color,
              cuenta: items.length,
            }))}
          />
          <ul className="divide-y rounded-md border">
            {gruposOrdenados.map(({ etiqueta, items }) => {
              const abierta = categoriaAbierta === etiqueta.id;
              return (
                <li key={etiqueta.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setCategoriaAbierta((prev) =>
                        prev === etiqueta.id ? null : etiqueta.id,
                      )
                    }
                    className="flex w-full items-center gap-3 p-3 text-sm"
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: etiqueta.color }}
                    />
                    <span className="min-w-0 flex-1 truncate text-left font-medium">
                      {etiqueta.nombre}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums">
                      {items.length}
                    </span>
                    {abierta ? (
                      <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                  {abierta && (
                    <ul className="divide-y border-t bg-muted/30">
                      {ordenarPorTiempo(items).map((registro) => {
                        const jugador = registro.jugador_id
                          ? jugadoresPorId.get(registro.jugador_id)
                          : null;
                        return (
                          <li
                            key={registro.id}
                            className={cn(
                              "flex items-center gap-3 p-3 text-sm",
                              borrando === registro.id && "opacity-50",
                            )}
                          >
                            <CampoCompletoMini
                              value={
                                registro.pos_x != null && registro.pos_y != null
                                  ? { left: registro.pos_x, top: registro.pos_y }
                                  : null
                              }
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-heading text-xs tabular-nums text-muted-foreground">
                                {registro.minuto != null
                                  ? `${dosDigitos(registro.minuto)}:${dosDigitos(registro.segundo ?? 0)}`
                                  : "—"}{" "}
                                · {registro.parte ?? 1}ª parte
                              </p>
                              <p className="truncate">
                                {jugador ? nombreMostrado(jugador) : "Equipo"}
                                {registro.notas && (
                                  <span className="text-muted-foreground italic">
                                    {" "}
                                    · {registro.notas}
                                  </span>
                                )}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={borrando === registro.id}
                              onClick={() => handleBorrar(registro.id)}
                              aria-label="Eliminar registro"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {registros.length === 0 && paso === "categoria" && etiquetas.length > 0 && (
        <p className="flex items-center justify-center gap-1.5 py-4 text-center text-sm text-muted-foreground">
          <Tag className="size-4" />
          Todavía no has registrado nada en este partido.
        </p>
      )}

      <AlertDialog
        open={confirmarVaciarAbierto}
        onOpenChange={setConfirmarVaciarAbierto}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar todo lo tagueado en este partido?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borran los {registros.length} registro{registros.length === 1 ? "" : "s"} de
              este partido y se reinicia el cronómetro. No se puede deshacer.
              Las categorías en sí no se tocan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={vaciando}
              onClick={handleConfirmarVaciar}
            >
              {vaciando ? "Borrando..." : "Sí, borrar todo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={resumenAbierto} onOpenChange={setResumenAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resumen del partido</DialogTitle>
            <DialogDescription>
              Esto es lo que llevas contado hasta ahora, vs {rival}.
            </DialogDescription>
          </DialogHeader>
          {gruposOrdenados.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Todavía no has registrado nada en este partido.
            </p>
          ) : (
            // Con muchas categorías el gráfico puede medir más que la
            // pantalla — se acota su altura y se deja scroll aquí dentro,
            // para que el diálogo entero (con el botón de cerrar) siempre
            // quepa.
            <div className="max-h-[50vh] overflow-y-auto">
              <TagueoResumenChart
                datos={gruposOrdenados.map(({ etiqueta, items }) => ({
                  nombre: etiqueta.nombre,
                  color: etiqueta.color,
                  cuenta: items.length,
                }))}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResumenAbierto(false)}>
              Cerrar
            </Button>
            <Button
              disabled={registros.length === 0}
              onClick={handleDescargarExcel}
            >
              <Download className="size-4" />
              Descargar Excel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
