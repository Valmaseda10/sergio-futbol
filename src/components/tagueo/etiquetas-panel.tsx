"use client";

// Panel de control de las categorías de tagueo: se pueden arrastrar
// libremente para ponerlas en el orden que se quiera (no solo subir/bajar
// un puesto), igual que se reordena cualquier lista de tarjetas — se coge
// por el asa de la izquierda, se suelta donde toque y las demás se
// desplazan solas para hacerle sitio.

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { Check, GripVertical, MapPinOff, Pencil, Trash2, UserX } from "lucide-react";
import {
  crearEtiquetaLocal,
  actualizarEtiquetaLocal,
  toggleActivoEtiquetaLocal,
  reordenarEtiquetasLocal,
  eliminarEtiquetaLocal,
} from "@/app/(app)/tagueo/local-actions";
import { localDb } from "@/lib/db/local-db";
import { etiquetaFormDataToValues } from "@/lib/validations/etiqueta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface Etiqueta {
  id: string;
  nombre: string;
  color: string;
  orden: number;
  activo: boolean;
  requiere_jugador: boolean;
  requiere_zona: boolean;
}

// Alto fijo de cada fila: hace falta un número conocido para calcular
// cuántos puestos se ha movido el dedo/ratón durante el arrastre.
const ALTO_FILA = 64;

function EtiquetaForm({
  etiqueta,
  onDone,
}: {
  etiqueta?: Etiqueta;
  onDone: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [requiereJugador, setRequiereJugador] = useState(
    etiqueta?.requiere_jugador ?? true,
  );
  const [requiereZona, setRequiereZona] = useState(
    etiqueta?.requiere_zona ?? true,
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGuardando(true);
    const formData = new FormData(e.currentTarget);
    // requiere_jugador y requiere_zona vienen del estado controlado (los
    // Switch), no del FormData: es más fiable que depender de que esos
    // componentes participen en el envío nativo del formulario.
    const values = {
      ...etiquetaFormDataToValues(formData),
      requiere_jugador: requiereJugador,
      requiere_zona: requiereZona,
    };
    const result = etiqueta
      ? await actualizarEtiquetaLocal(etiqueta.id, values)
      : await crearEtiquetaLocal(values);
    setGuardando(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success(etiqueta ? "Etiqueta actualizada" : "Etiqueta creada");
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="nombre">Nombre</Label>
        <Input
          id="nombre"
          name="nombre"
          placeholder="Ej: Presión alta"
          defaultValue={etiqueta?.nombre}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="color">Color</Label>
        <Input
          id="color"
          name="color"
          type="color"
          defaultValue={etiqueta?.color ?? "#e0141d"}
          className="h-9 w-full p-1"
        />
      </div>
      <div className="flex items-center justify-between gap-3 rounded-md border p-3">
        <div>
          <Label htmlFor="requiere_jugador">Preguntar qué jugador ha sido</Label>
          <p className="text-xs text-muted-foreground">
            Desactívalo para categorías del rival (llegada rival, córner en
            contra...): se cuentan solo para el equipo, sin pedir jugador.
          </p>
        </div>
        <Switch
          id="requiere_jugador"
          checked={requiereJugador}
          onCheckedChange={setRequiereJugador}
        />
      </div>
      <div className="flex items-center justify-between gap-3 rounded-md border p-3">
        <div>
          <Label htmlFor="requiere_zona">Preguntar la zona del campo</Label>
          <p className="text-xs text-muted-foreground">
            Desactívalo para categorías que solo interesa contar (duelo
            perdido, córners...): se registran de un solo toque, sin
            pantallas intermedias.
          </p>
        </div>
        <Switch
          id="requiere_zona"
          checked={requiereZona}
          onCheckedChange={setRequiereZona}
        />
      </div>
      <Button type="submit" disabled={guardando} className="w-full">
        {guardando ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}

export function EtiquetasPanel() {
  const etiquetas = useLiveQuery(
    () =>
      localDb.etiquetas
        .toArray()
        .then((rows) =>
          rows.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre)),
        ),
    [],
    [],
  );
  // Cuántos tagueos ya registrados se perderían al borrar cada categoría,
  // para avisar antes de confirmar.
  const conteoPorEtiqueta = useLiveQuery(
    () =>
      localDb.etiquetas_partido.toArray().then((registros) => {
        const mapa = new Map<string, number>();
        for (const r of registros) {
          mapa.set(r.etiqueta_id, (mapa.get(r.etiqueta_id) ?? 0) + 1);
        }
        return mapa;
      }),
    [],
    new Map<string, number>(),
  );
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [editando, setEditando] = useState<Etiqueta | null>(null);
  const [pendiente, setPendiente] = useState<string | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);
  // startY se guarda en el propio estado (no en un ref) para no leerlo
  // durante el render: se fija una vez al coger el asa y solo se lee dentro
  // de los propios manejadores de eventos.
  const [arrastre, setArrastre] = useState<{
    id: string;
    index: number;
    startY: number;
    deltaY: number;
  } | null>(null);

  const ordenLocal = etiquetas;

  async function handleToggle(etiqueta: Etiqueta) {
    setPendiente(etiqueta.id);
    await toggleActivoEtiquetaLocal(etiqueta.id, !etiqueta.activo);
    setPendiente(null);
  }

  async function handleBorrar(id: string) {
    setBorrando(id);
    const result = await eliminarEtiquetaLocal(id);
    setBorrando(null);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Etiqueta eliminada");
  }

  function indiceDestino() {
    if (!arrastre) return 0;
    const salto = Math.round(arrastre.deltaY / ALTO_FILA);
    return Math.min(Math.max(arrastre.index + salto, 0), ordenLocal.length - 1);
  }

  function handlePointerDownAsa(e: React.PointerEvent, index: number) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setArrastre({ id: ordenLocal[index].id, index, startY: e.clientY, deltaY: 0 });
  }

  function handlePointerMoveAsa(e: React.PointerEvent) {
    const y = e.clientY;
    setArrastre((prev) => (prev ? { ...prev, deltaY: y - prev.startY } : prev));
  }

  async function handlePointerUpAsa() {
    if (!arrastre) return;
    const destino = indiceDestino();
    setArrastre(null);

    if (destino === arrastre.index) return;

    const nuevo = ordenLocal.slice();
    const [movida] = nuevo.splice(arrastre.index, 1);
    nuevo.splice(destino, 0, movida);
    await reordenarEtiquetasLocal(nuevo.map((e) => e.id));
  }

  function desplazamientoFila(index: number): number {
    if (!arrastre) return 0;
    if (index === arrastre.index) return arrastre.deltaY;
    const destino = indiceDestino();
    if (arrastre.index < destino && index > arrastre.index && index <= destino) {
      return -ALTO_FILA;
    }
    if (arrastre.index > destino && index >= destino && index < arrastre.index) {
      return ALTO_FILA;
    }
    return 0;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Estas son las categorías que aparecen para tocar mientras vas
        tagueando un partido (tiro a puerta, pérdida, recuperación...).
        Arrástralas por el asa para ponerlas en el orden que prefieras, y
        desactiva las que no uses sin perder el histórico ya registrado con
        ellas.
      </p>
      {ordenLocal.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Todavía no hay etiquetas.
        </p>
      ) : (
        <ul className="relative overflow-hidden rounded-md border">
          {ordenLocal.map((etiqueta, index) => {
            const arrastrandoEsta = arrastre?.id === etiqueta.id;
            return (
              <li
                key={etiqueta.id}
                className={cn(
                  "relative flex items-center gap-2 border-b bg-card p-3 last:border-b-0",
                  arrastrandoEsta && "shadow-lg",
                )}
                style={{
                  height: ALTO_FILA,
                  zIndex: arrastrandoEsta ? 10 : 0,
                  transform: `translateY(${desplazamientoFila(index)}px)`,
                  transition: arrastrandoEsta ? "none" : "transform 150ms ease",
                }}
              >
                <button
                  type="button"
                  aria-label={`Mover ${etiqueta.nombre}`}
                  onPointerDown={(e) => handlePointerDownAsa(e, index)}
                  onPointerMove={handlePointerMoveAsa}
                  onPointerUp={handlePointerUpAsa}
                  onPointerCancel={handlePointerUpAsa}
                  className="flex shrink-0 cursor-grab touch-none items-center justify-center rounded p-1 text-muted-foreground active:cursor-grabbing"
                >
                  <GripVertical className="size-4" />
                </button>
                <div
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-1.5 rounded-full py-1.5 px-3 text-sm font-semibold text-neutral-900",
                    !etiqueta.activo && "opacity-40",
                  )}
                  style={{ backgroundColor: etiqueta.color }}
                >
                  <Check className="size-3.5 shrink-0" strokeWidth={3} />
                  <span className="min-w-0 flex-1 truncate">{etiqueta.nombre}</span>
                  {!etiqueta.requiere_jugador && (
                    <span title="No pregunta el jugador">
                      <UserX className="size-3.5 shrink-0 opacity-60" />
                    </span>
                  )}
                  {!etiqueta.requiere_zona && (
                    <span title="No pregunta la zona">
                      <MapPinOff className="size-3.5 shrink-0 opacity-60" />
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setEditando(etiqueta)}
                  aria-label="Editar etiqueta"
                >
                  <Pencil className="size-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={borrando === etiqueta.id}
                        aria-label="Eliminar etiqueta"
                      />
                    }
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        ¿Eliminar &ldquo;{etiqueta.nombre}&rdquo;?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {(conteoPorEtiqueta.get(etiqueta.id) ?? 0) > 0
                          ? `Esta categoría tiene ${conteoPorEtiqueta.get(etiqueta.id)} tagueo(s) registrados en partidos. Se eliminarán también, junto con la categoría. Esta acción no se puede deshacer.`
                          : "Esta acción no se puede deshacer. Si solo quieres dejar de usarla sin perder el histórico, desactívala en vez de borrarla."}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleBorrar(etiqueta.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Switch
                  checked={etiqueta.activo}
                  disabled={pendiente === etiqueta.id}
                  onCheckedChange={() => handleToggle(etiqueta)}
                />
              </li>
            );
          })}
        </ul>
      )}

      {mostrarNuevo ? (
        <div className="rounded-md border p-3">
          <EtiquetaForm onDone={() => setMostrarNuevo(false)} />
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setMostrarNuevo(true)}
        >
          Añadir etiqueta
        </Button>
      )}

      <Dialog
        open={editando !== null}
        onOpenChange={(open) => !open && setEditando(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar etiqueta</DialogTitle>
          </DialogHeader>
          {editando && (
            <EtiquetaForm etiqueta={editando} onDone={() => setEditando(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
