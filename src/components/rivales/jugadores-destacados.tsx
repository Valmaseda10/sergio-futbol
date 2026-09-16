"use client";

import { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import {
  JUGADOR_DESTACADO_FORM_DEFAULTS,
  jugadorDestacadoSchema,
  type JugadorDestacadoFormValues,
} from "@/lib/validations/rivales";
import {
  crearJugadorDestacadoLocal,
  eliminarJugadorDestacadoLocal,
} from "@/app/(app)/rivales/local-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const CATEGORIA_LABEL: Record<string, string> = {
  top: "Destacado",
  flojo: "Débil",
};

// Valor especial del selector para "no está en la plantilla, escribo el
// nombre a mano" — distinto de "" (que es el estado inicial sin elegir).
const MANUAL = "__manual__";

export function JugadoresDestacados({ rivalId }: { rivalId: string }) {
  const [mostrarForm, setMostrarForm] = useState(false);

  const destacados = useLiveQuery(
    () =>
      localDb.rivales_jugadores_destacados
        .where("rival_id")
        .equals(rivalId)
        .toArray(),
    [rivalId],
    [],
  );

  const plantilla = useLiveQuery(
    () =>
      localDb.rivales_plantilla
        .where("rival_id")
        .equals(rivalId)
        .filter((p) => p.rol === "jugador")
        .toArray(),
    [rivalId],
    [],
  );
  const plantillaPorId = useMemo(
    () => new Map(plantilla.map((p) => [p.id, p])),
    [plantilla],
  );

  const { top, flojos } = useMemo(
    () => ({
      top: destacados.filter((d) => d.categoria === "top"),
      flojos: destacados.filter((d) => d.categoria === "flojo"),
    }),
    [destacados],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<JugadorDestacadoFormValues>({
    resolver: zodResolver(jugadorDestacadoSchema),
    defaultValues: JUGADOR_DESTACADO_FORM_DEFAULTS,
  });

  const plantillaIdElegido = watch("plantilla_id");
  const esManual = plantillaIdElegido === MANUAL || plantilla.length === 0;

  function handleElegirPlantilla(valor: string | null) {
    if (!valor) return;
    setValue("plantilla_id", valor);
    if (valor === MANUAL) {
      setValue("nombre", "");
      setValue("dorsal", "");
      return;
    }
    const jugador = plantillaPorId.get(valor);
    if (!jugador) return;
    setValue("nombre", jugador.nombre);
    setValue("dorsal", jugador.dorsal != null ? String(jugador.dorsal) : "");
  }

  async function onSubmit(values: JugadorDestacadoFormValues) {
    const result = await crearJugadorDestacadoLocal(rivalId, {
      ...values,
      plantilla_id: values.plantilla_id === MANUAL ? "" : values.plantilla_id,
    });
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Jugador añadido");
    reset(JUGADOR_DESTACADO_FORM_DEFAULTS);
    setMostrarForm(false);
  }

  async function handleDelete(id: string) {
    const result = await eliminarJugadorDestacadoLocal(id);
    if ("error" in result) toast.error(result.error);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Verde = Destacado · Rojo = Débil
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="print:hidden"
          onClick={() => setMostrarForm((v) => !v)}
        >
          <Plus className="size-4" />
          Añadir
        </Button>
      </div>

      {mostrarForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-3 rounded-md border p-3 print:hidden"
        >
          {plantilla.length > 0 && (
            <div className="space-y-1">
              <Label htmlFor="plantilla_id" className="text-xs">
                Jugador de la plantilla
              </Label>
              <Controller
                control={control}
                name="plantilla_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={handleElegirPlantilla}>
                    <SelectTrigger id="plantilla_id" className="w-full">
                      <SelectValue placeholder="Elige de la plantilla..." />
                    </SelectTrigger>
                    <SelectContent>
                      {plantilla.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.dorsal != null ? `${p.dorsal} · ` : ""}
                          {p.nombre}
                        </SelectItem>
                      ))}
                      <SelectItem value={MANUAL}>
                        No está en la plantilla (escribir a mano)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {esManual && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="nombre" className="text-xs">
                  Nombre
                </Label>
                <Input id="nombre" {...register("nombre")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dorsal" className="text-xs">
                  Dorsal
                </Label>
                <Input
                  id="dorsal"
                  type="number"
                  min={1}
                  max={99}
                  inputMode="numeric"
                  {...register("dorsal")}
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="categoria" className="text-xs">
              Categoría
            </Label>
            <Controller
              control={control}
              name="categoria"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="categoria" className="w-full">
                    <SelectValue>
                      {(value) => CATEGORIA_LABEL[value as string] ?? value}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top">Destacado</SelectItem>
                    <SelectItem value="flojo">Débil</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="notas" className="text-xs">
              Notas
            </Label>
            <Input id="notas" {...register("notas")} />
          </div>
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar jugador"}
          </Button>
        </form>
      )}

      {top.length === 0 && flojos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay jugadores destacados.
        </p>
      ) : (
        <div className="space-y-2">
          {top.map((d) => (
            <JugadorDestacadoRow
              key={d.id}
              nombre={plantillaPorId.get(d.plantilla_id ?? "")?.nombre ?? d.nombre}
              dorsal={plantillaPorId.get(d.plantilla_id ?? "")?.dorsal ?? d.dorsal}
              notas={d.notas}
              tono="top"
              onDelete={() => handleDelete(d.id)}
            />
          ))}
          {flojos.map((d) => (
            <JugadorDestacadoRow
              key={d.id}
              nombre={plantillaPorId.get(d.plantilla_id ?? "")?.nombre ?? d.nombre}
              dorsal={plantillaPorId.get(d.plantilla_id ?? "")?.dorsal ?? d.dorsal}
              notas={d.notas}
              tono="flojo"
              onDelete={() => handleDelete(d.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function JugadorDestacadoRow({
  nombre,
  dorsal,
  notas,
  tono,
  onDelete,
}: {
  nombre: string;
  dorsal: number | null;
  notas: string | null;
  tono: "top" | "flojo";
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border-l-4 p-3",
        tono === "top"
          ? "border-l-green-600 bg-green-50 dark:bg-green-950"
          : "border-l-red-600 bg-red-50 dark:bg-red-950",
      )}
    >
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-medium",
            tono === "top"
              ? "text-green-800 dark:text-green-200"
              : "text-red-800 dark:text-red-200",
          )}
        >
          {dorsal != null ? `${dorsal} · ` : ""}
          {nombre}
        </p>
        {notas && <p className="text-xs text-muted-foreground">{notas}</p>}
      </div>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Eliminar jugador"
        className="print:hidden"
      >
        <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  );
}
