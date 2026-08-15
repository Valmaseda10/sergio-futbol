"use client";

import { useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import {
  DIAS_SEMANA,
  generarSchema,
  type GenerarFormValues,
} from "@/lib/validations/entrenamiento";
import { generarEntrenamientosLocal } from "@/app/(app)/entrenamientos/local-actions";
import { localDb } from "@/lib/db/local-db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}

export function GenerarForm() {
  const router = useRouter();
  const yaAplicado = useRef(false);

  const horarios = useLiveQuery(
    () => localDb.horario_entrenamiento.toArray(),
    [],
    [],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GenerarFormValues>({
    resolver: zodResolver(generarSchema),
    defaultValues: {
      fecha_inicio: "",
      fecha_fin: "",
      dias: [1, 3, 5],
      hora_inicio: "17:45",
      hora_fin: "19:15",
      lugar: "Área Deportiva de Puente Castro",
    },
  });

  // En cuanto se carga el horario configurado en Ajustes, precarga los días
  // y el horario reales en vez de dejar los valores de respaldo de arriba.
  useEffect(() => {
    if (yaAplicado.current || horarios.length === 0) return;
    yaAplicado.current = true;
    const primero = horarios[0];
    reset({
      fecha_inicio: "",
      fecha_fin: "",
      dias: horarios.map((h) => h.dia_semana),
      hora_inicio: primero.hora_inicio?.slice(0, 5) ?? "17:45",
      hora_fin: primero.hora_fin?.slice(0, 5) ?? "19:15",
      lugar: primero.lugar ?? "Área Deportiva de Puente Castro",
    });
  }, [horarios, reset]);

  async function onSubmit(values: GenerarFormValues) {
    const result = await generarEntrenamientosLocal(values);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success(
      result.omitidos > 0
        ? `${result.creados} entrenamientos creados (${result.omitidos} ya existían)`
        : `${result.creados} entrenamientos creados`,
    );
    router.push("/entrenamientos");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha_inicio">Desde</Label>
              <Input
                id="fecha_inicio"
                type="date"
                {...register("fecha_inicio")}
              />
              <FieldError message={errors.fecha_inicio?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha_fin">Hasta</Label>
              <Input id="fecha_fin" type="date" {...register("fecha_fin")} />
              <FieldError message={errors.fecha_fin?.message} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Días de la semana</Label>
            <Controller
              control={control}
              name="dias"
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {DIAS_SEMANA.map((dia) => (
                    <label
                      key={dia.value}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={field.value.includes(dia.value)}
                        onCheckedChange={(checked) => {
                          field.onChange(
                            checked
                              ? [...field.value, dia.value]
                              : field.value.filter((d) => d !== dia.value),
                          );
                        }}
                      />
                      {dia.label}
                    </label>
                  ))}
                </div>
              )}
            />
            <FieldError message={errors.dias?.message} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hora_inicio">Hora inicio</Label>
              <Input
                id="hora_inicio"
                type="time"
                {...register("hora_inicio")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hora_fin">Hora fin</Label>
              <Input id="hora_fin" type="time" {...register("hora_fin")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lugar">Lugar</Label>
            <Input id="lugar" {...register("lugar")} />
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Se creará un entrenamiento por cada día seleccionado dentro del rango.
        Los objetivos y ejercicios se quedan vacíos para rellenarlos sesión a
        sesión. Las fechas que ya tengan un entrenamiento creado se omiten.
      </p>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? "Generando..." : "Generar entrenamientos"}
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
