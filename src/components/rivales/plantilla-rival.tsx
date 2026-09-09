"use client";

// Plantilla completa del rival: los jugadores que tiene dados de alta esta
// temporada (se consultan a mano en la ficha del club de la app de la
// federación, no hay forma de sacarlo automáticamente), con su historial de
// la temporada anterior para tener contexto de scouting antes de
// enfrentarse a ellos. Distinto de <JugadoresDestacados> (que es solo un
// resumen de quién es top/flojo): esto es el listado íntegro.

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import {
  PLANTILLA_JUGADOR_FORM_DEFAULTS,
  plantillaJugadorSchema,
  type PlantillaJugadorFormValues,
} from "@/lib/validations/rivales";
import {
  crearJugadorPlantillaLocal,
  eliminarJugadorPlantillaLocal,
} from "@/app/(app)/rivales/local-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PlantillaRival({ rivalId }: { rivalId: string }) {
  const [mostrarForm, setMostrarForm] = useState(false);

  const plantilla = useLiveQuery(
    () =>
      localDb.rivales_plantilla
        .where("rival_id")
        .equals(rivalId)
        .toArray()
        .then((rows) =>
          rows.sort((a, b) => (a.dorsal ?? 99) - (b.dorsal ?? 99)),
        ),
    [rivalId],
    [],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<PlantillaJugadorFormValues>({
    resolver: zodResolver(plantillaJugadorSchema),
    defaultValues: PLANTILLA_JUGADOR_FORM_DEFAULTS,
  });

  async function onSubmit(values: PlantillaJugadorFormValues) {
    const result = await crearJugadorPlantillaLocal(rivalId, values);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Jugador añadido a la plantilla");
    reset(PLANTILLA_JUGADOR_FORM_DEFAULTS);
    setMostrarForm(false);
  }

  async function handleDelete(id: string) {
    const result = await eliminarJugadorPlantillaLocal(id);
    if ("error" in result) toast.error(result.error);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Jugadores dados de alta esta temporada, con su historial del año
          pasado si lo conoces.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0 print:hidden"
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="plantilla-nombre" className="text-xs">
                Nombre
              </Label>
              <Input id="plantilla-nombre" {...register("nombre")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="plantilla-dorsal" className="text-xs">
                Dorsal
              </Label>
              <Input
                id="plantilla-dorsal"
                type="number"
                min={1}
                max={99}
                inputMode="numeric"
                {...register("dorsal")}
              />
            </div>
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            Temporada anterior (opcional)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="plantilla-categoria" className="text-xs">
                Categoría
              </Label>
              <Input
                id="plantilla-categoria"
                placeholder="Ej: 1ª Provincial"
                {...register("categoria_temporada_anterior")}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="plantilla-equipo" className="text-xs">
                Equipo
              </Label>
              <Input
                id="plantilla-equipo"
                placeholder="Ej: Puente Castro"
                {...register("equipo_temporada_anterior")}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="plantilla-clasificacion" className="text-xs">
              Cómo quedaron
            </Label>
            <Input
              id="plantilla-clasificacion"
              placeholder="Ej: 3º"
              {...register("clasificacion_temporada_anterior")}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="plantilla-notas" className="text-xs">
              Notas
            </Label>
            <Input id="plantilla-notas" {...register("notas")} />
          </div>
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar jugador"}
          </Button>
        </form>
      )}

      {plantilla.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay jugadores en la plantilla.
        </p>
      ) : (
        <div className="space-y-2">
          {plantilla.map((j) => (
            <PlantillaJugadorRow
              key={j.id}
              nombre={j.nombre}
              dorsal={j.dorsal}
              equipoAnterior={j.equipo_temporada_anterior}
              categoriaAnterior={j.categoria_temporada_anterior}
              clasificacionAnterior={j.clasificacion_temporada_anterior}
              notas={j.notas}
              onDelete={() => handleDelete(j.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PlantillaJugadorRow({
  nombre,
  dorsal,
  equipoAnterior,
  categoriaAnterior,
  clasificacionAnterior,
  notas,
  onDelete,
}: {
  nombre: string;
  dorsal: number | null;
  equipoAnterior: string | null;
  categoriaAnterior: string | null;
  clasificacionAnterior: string | null;
  notas: string | null;
  onDelete: () => void;
}) {
  const historial = [
    categoriaAnterior,
    equipoAnterior,
    clasificacionAnterior ? `quedaron ${clasificacionAnterior}` : null,
  ].filter(Boolean);

  return (
    <div className="flex items-start gap-3 rounded-md border p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {dorsal != null ? `${dorsal} · ` : ""}
          {nombre}
        </p>
        {historial.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Temp. anterior: {historial.join(" · ")}
          </p>
        )}
        {notas && <p className="text-xs text-muted-foreground">{notas}</p>}
      </div>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Eliminar jugador"
        className="shrink-0 print:hidden"
      >
        <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  );
}
