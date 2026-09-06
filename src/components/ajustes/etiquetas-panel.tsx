"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import {
  crearEtiquetaLocal,
  actualizarEtiquetaLocal,
  toggleActivoEtiquetaLocal,
} from "@/app/(app)/ajustes/local-actions";
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

interface Etiqueta {
  id: string;
  nombre: string;
  color: string;
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
          defaultValue={etiqueta?.color ?? "#8a1b24"}
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
        .then((rows) => rows.sort((a, b) => a.nombre.localeCompare(b.nombre))),
    [],
    [],
  );
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [editando, setEditando] = useState<Etiqueta | null>(null);
  const [pendiente, setPendiente] = useState<string | null>(null);

  async function handleToggle(etiqueta: Etiqueta) {
    setPendiente(etiqueta.id);
    await toggleActivoEtiquetaLocal(etiqueta.id, !etiqueta.activo);
    setPendiente(null);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Estas etiquetas son las que aparecen para marcar lo que va pasando en
        el apartado &quot;Etiquetas&quot; de cada partido. Añade las que
        quieras (presión alta, pérdida, recuperación...) y desactiva las que
        no uses sin perder el histórico ya registrado con ellas.
      </p>
      {etiquetas.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Todavía no hay etiquetas.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {etiquetas.map((etiqueta) => (
            <li key={etiqueta.id} className="flex items-center gap-3 p-3">
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
