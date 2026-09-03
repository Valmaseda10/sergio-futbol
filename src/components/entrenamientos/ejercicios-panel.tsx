"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import {
  crearEjercicioLocal,
  actualizarEjercicioLocal,
  eliminarEjercicioLocal,
} from "@/app/(app)/entrenamientos/local-actions";
import { localDb } from "@/lib/db/local-db";
import { ejercicioFormDataToValues } from "@/lib/validations/ejercicio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Ejercicio {
  id: string;
  nombre: string;
  descripcion: string | null;
}

function EjercicioForm({
  ejercicio,
  onDone,
}: {
  ejercicio?: Ejercicio;
  onDone: () => void;
}) {
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGuardando(true);
    const formData = new FormData(e.currentTarget);
    const values = ejercicioFormDataToValues(formData);
    const result = ejercicio
      ? await actualizarEjercicioLocal(ejercicio.id, values)
      : await crearEjercicioLocal(values);
    setGuardando(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success(ejercicio ? "Ejercicio actualizado" : "Ejercicio guardado");
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="nombre">Nombre</Label>
        <Input
          id="nombre"
          name="nombre"
          defaultValue={ejercicio?.nombre}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="descripcion">Descripción</Label>
        <Textarea
          id="descripcion"
          name="descripcion"
          rows={4}
          defaultValue={ejercicio?.descripcion ?? ""}
        />
      </div>
      <Button type="submit" disabled={guardando} className="w-full">
        {guardando ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}

export function EjerciciosPanel() {
  const ejercicios = useLiveQuery(
    () =>
      localDb.ejercicios
        .toArray()
        .then((rows) => rows.sort((a, b) => a.nombre.localeCompare(b.nombre))),
    [],
    [],
  );
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [editando, setEditando] = useState<Ejercicio | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);

  async function handleBorrar(id: string) {
    setBorrando(id);
    await eliminarEjercicioLocal(id);
    setBorrando(null);
  }

  return (
    <div className="space-y-3">
      {ejercicios.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Todavía no hay ejercicios guardados.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {ejercicios.map((ejercicio) => (
            <li key={ejercicio.id} className="flex items-start gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {ejercicio.nombre}
                </p>
                {ejercicio.descripcion && (
                  <p className="line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">
                    {ejercicio.descripcion}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setEditando(ejercicio)}
                aria-label="Editar ejercicio"
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={borrando === ejercicio.id}
                onClick={() => handleBorrar(ejercicio.id)}
                aria-label="Eliminar ejercicio"
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {mostrarNuevo ? (
        <div className="rounded-md border p-3">
          <EjercicioForm onDone={() => setMostrarNuevo(false)} />
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setMostrarNuevo(true)}
        >
          Añadir ejercicio
        </Button>
      )}

      <Dialog
        open={editando !== null}
        onOpenChange={(open) => !open && setEditando(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar ejercicio</DialogTitle>
          </DialogHeader>
          {editando && (
            <EjercicioForm
              ejercicio={editando}
              onDone={() => setEditando(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
