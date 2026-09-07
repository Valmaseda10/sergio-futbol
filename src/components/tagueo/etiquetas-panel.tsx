"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import {
  crearEtiquetaLocal,
  actualizarEtiquetaLocal,
  toggleActivoEtiquetaLocal,
  moverEtiquetaLocal,
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

interface Etiqueta {
  id: string;
  nombre: string;
  color: string;
  orden: number;
  activo: boolean;
}

function EtiquetaForm({
  etiqueta,
  onDone,
}: {
  etiqueta?: Etiqueta;
  onDone: () => void;
}) {
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGuardando(true);
    const formData = new FormData(e.currentTarget);
    const values = etiquetaFormDataToValues(formData);
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
  const [moviendo, setMoviendo] = useState<string | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);

  async function handleToggle(etiqueta: Etiqueta) {
    setPendiente(etiqueta.id);
    await toggleActivoEtiquetaLocal(etiqueta.id, !etiqueta.activo);
    setPendiente(null);
  }

  async function handleMover(id: string, direccion: "arriba" | "abajo") {
    setMoviendo(id);
    await moverEtiquetaLocal(id, direccion);
    setMoviendo(null);
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

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Estas son las categorías que aparecen para tocar mientras vas
        tagueando un partido (tiro a puerta, pérdida, recuperación...).
        Añade las que quieras, muévelas con las flechas para ponerlas en el
        orden que prefieras, y desactiva las que no uses sin perder el
        histórico ya registrado con ellas.
      </p>
      {etiquetas.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Todavía no hay etiquetas.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {etiquetas.map((etiqueta, index) => (
            <li key={etiqueta.id} className="flex items-center gap-2 p-3">
              <div className="flex shrink-0 flex-col">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-5"
                  disabled={index === 0 || moviendo !== null}
                  onClick={() => handleMover(etiqueta.id, "arriba")}
                  aria-label="Mover arriba"
                >
                  <ChevronUp className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-5"
                  disabled={index === etiquetas.length - 1 || moviendo !== null}
                  onClick={() => handleMover(etiqueta.id, "abajo")}
                  aria-label="Mover abajo"
                >
                  <ChevronDown className="size-3.5" />
                </Button>
              </div>
              <span
                className="size-4 shrink-0 rounded-full"
                style={{ backgroundColor: etiqueta.color }}
              />
              <p className="min-w-0 flex-1 truncate text-sm font-medium">
                {etiqueta.nombre}
              </p>
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
          ))}
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
