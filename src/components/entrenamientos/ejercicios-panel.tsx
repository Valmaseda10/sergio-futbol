"use client";

import { useMemo, useState } from "react";
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

// Cada uno de los 4 huecos de tarea de un entrenamiento puede enlazar con un
// ejercicio de la biblioteca (ver EntrenamientoForm): son la "nomenclatura"
// que permite contar cuántas veces se ha trabajado cada uno y sumar sus
// minutos, sin depender de comparar texto libre.
const SLOTS_TAREA = [
  ["tarea_1_ejercicio_id", "tarea_1_minutos"],
  ["tarea_2_ejercicio_id", "tarea_2_minutos"],
  ["tarea_3_ejercicio_id", "tarea_3_minutos"],
  ["tarea_4_ejercicio_id", "tarea_4_minutos"],
] as const;

function formatoUso(veces: number, minutos: number) {
  const vecesTexto = veces === 1 ? "1 vez" : `${veces} veces`;
  return minutos > 0 ? `${vecesTexto} · ${minutos} min en total` : vecesTexto;
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
  const entrenamientos = useLiveQuery(
    () => localDb.entrenamientos.toArray(),
    [],
    [],
  );
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [editando, setEditando] = useState<Ejercicio | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);

  const usoPorEjercicio = useMemo(() => {
    const mapa = new Map<string, { veces: number; minutos: number }>();
    for (const entrenamiento of entrenamientos) {
      for (const [campoId, campoMinutos] of SLOTS_TAREA) {
        const ejercicioId = entrenamiento[campoId];
        if (!ejercicioId) continue;
        const actual = mapa.get(ejercicioId) ?? { veces: 0, minutos: 0 };
        actual.veces += 1;
        actual.minutos += entrenamiento[campoMinutos] ?? 0;
        mapa.set(ejercicioId, actual);
      }
    }
    return mapa;
  }, [entrenamientos]);

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
          {ejercicios.map((ejercicio) => {
            const uso = usoPorEjercicio.get(ejercicio.id);
            return (
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
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {uso
                    ? formatoUso(uso.veces, uso.minutos)
                    : "Todavía no se ha trabajado"}
                </p>
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
            );
          })}
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
