"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import {
  LESION_SESION_FORM_DEFAULTS,
  lesionSesionSchema,
  type LesionSesionFormValues,
} from "@/lib/validations/lesion";
import {
  crearSesionReadaptacionLocal,
  eliminarSesionReadaptacionLocal,
} from "@/app/(app)/plantilla/lesiones/local-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function formatearFecha(fecha: string) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function SesionesReadaptacion({ lesionId }: { lesionId: string }) {
  const [mostrarForm, setMostrarForm] = useState(false);

  const sesiones = useLiveQuery(
    () =>
      localDb.lesion_sesiones_readaptacion
        .where("lesion_id")
        .equals(lesionId)
        .toArray()
        .then((rows) => rows.sort((a, b) => b.fecha.localeCompare(a.fecha))),
    [lesionId],
    [],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<LesionSesionFormValues>({
    resolver: zodResolver(lesionSesionSchema),
    defaultValues: {
      ...LESION_SESION_FORM_DEFAULTS,
      fecha: new Date().toISOString().slice(0, 10),
    },
  });

  async function onSubmit(values: LesionSesionFormValues) {
    const result = await crearSesionReadaptacionLocal(lesionId, values);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Sesión registrada");
    reset({ ...LESION_SESION_FORM_DEFAULTS, fecha: values.fecha });
    setMostrarForm(false);
  }

  async function handleDelete(id: string) {
    const result = await eliminarSesionReadaptacionLocal(id);
    if ("error" in result) toast.error(result.error);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Sesiones de readaptación</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setMostrarForm((v) => !v)}
        >
          <Plus className="size-4" />
          Añadir
        </Button>
      </div>

      {mostrarForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-3 rounded-md border p-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="fecha" className="text-xs">
                Fecha
              </Label>
              <Input id="fecha" type="date" {...register("fecha")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="horario" className="text-xs">
                Horario
              </Label>
              <Input
                id="horario"
                placeholder="Ej: Lunes y miércoles 17:00"
                {...register("horario")}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="notas" className="text-xs">
              Notas
            </Label>
            <Input id="notas" {...register("notas")} />
          </div>
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar sesión"}
          </Button>
        </form>
      )}

      {sesiones.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay sesiones registradas.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {sesiones.map((s) => (
            <li key={s.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {formatearFecha(s.fecha)}
                  {s.horario ? ` · ${s.horario}` : ""}
                </p>
                {s.notas && (
                  <p className="text-xs text-muted-foreground">{s.notas}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(s.id)}
                aria-label="Eliminar sesión"
              >
                <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
