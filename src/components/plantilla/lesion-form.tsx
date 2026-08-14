"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  LESION_FORM_DEFAULTS,
  lesionSchema,
  type LesionFormValues,
} from "@/lib/validations/lesion";
import {
  crearLesionLocal,
  actualizarLesionLocal,
} from "@/app/(app)/plantilla/lesiones/local-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface JugadorOpcion {
  id: string;
  nombre: string;
  apellidos: string;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}

export function LesionForm({
  jugadores,
  jugadorIdInicial,
  lesion,
}: {
  jugadores: JugadorOpcion[];
  jugadorIdInicial?: string;
  lesion?: LesionFormValues & { id: string };
}) {
  const router = useRouter();
  const jugadoresPorId = new Map(jugadores.map((j) => [j.id, j]));

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LesionFormValues>({
    resolver: zodResolver(lesionSchema),
    defaultValues: lesion ?? {
      ...LESION_FORM_DEFAULTS,
      jugador_id: jugadorIdInicial ?? "",
      fecha_inicio: new Date().toISOString().slice(0, 10),
    },
  });

  async function onSubmit(values: LesionFormValues) {
    const result = lesion
      ? await actualizarLesionLocal(lesion.id, values)
      : await crearLesionLocal(values);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success(lesion ? "Lesión actualizada" : "Lesión registrada");
    router.push(`/plantilla/lesiones/${result.id}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="jugador_id">Jugador</Label>
            <Controller
              control={control}
              name="jugador_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="jugador_id" className="w-full">
                    <SelectValue placeholder="Selecciona un jugador">
                      {(value) => {
                        const j = jugadoresPorId.get(value as string);
                        return j ? `${j.nombre} ${j.apellidos}` : "Selecciona un jugador";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {jugadores.map((j) => (
                      <SelectItem key={j.id} value={j.id}>
                        {j.nombre} {j.apellidos}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.jugador_id?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">Qué se ha lesionado</Label>
            <Input
              id="tipo"
              placeholder="Ej: esguince de tobillo"
              {...register("tipo")}
            />
            <FieldError message={errors.tipo?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mecanismo">Cómo se ha lesionado</Label>
            <Textarea
              id="mecanismo"
              rows={2}
              placeholder="Ej: mal apoyo al saltar en un entrenamiento"
              {...register("mecanismo")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha_inicio">Fecha de inicio</Label>
              <Input id="fecha_inicio" type="date" {...register("fecha_inicio")} />
              <FieldError message={errors.fecha_inicio?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha_prevista_alta">Alta prevista</Label>
              <Input
                id="fecha_prevista_alta"
                type="date"
                {...register("fecha_prevista_alta")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fecha_alta_real">
              Alta real (vuelve a jugar al 100%)
            </Label>
            <Input id="fecha_alta_real" type="date" {...register("fecha_alta_real")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea id="notas" rows={3} {...register("notas")} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? "Guardando..." : "Guardar"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
