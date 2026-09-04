"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import {
  PARTIDO_FORM_DEFAULTS,
  partidoSchema,
  type PartidoFormValues,
} from "@/lib/validations/partido";
import {
  crearPartidoLocal,
  actualizarPartidoLocal,
} from "@/app/(app)/partidos/local-actions";
import { localDb } from "@/lib/db/local-db";
import { diaSemanaDeFecha } from "@/lib/date";
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

// Base UI Select no admite un valor "" real como opción, así que "sin
// vincular" se representa con este centinela y se traduce a "" al guardar.
const SIN_VINCULAR = "__ninguno__";

const COMPETICION_LABEL: Record<string, string> = {
  liga: "Liga",
  amistoso: "Amistoso",
  copa: "Copa",
};

const LOCAL_VISITANTE_LABEL: Record<string, string> = {
  local: "Local",
  visitante: "Visitante",
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}

export function PartidoForm({
  partido,
}: {
  partido?: PartidoFormValues & {
    id: string;
    fotoRivalSignedUrl?: string | null;
  };
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(
    partido?.fotoRivalSignedUrl ?? null,
  );
  const [fotoRival, setFotoRival] = useState<File | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PartidoFormValues>({
    resolver: zodResolver(partidoSchema),
    defaultValues: partido ?? PARTIDO_FORM_DEFAULTS,
  });

  const fechaValue = watch("fecha");
  const rivalValue = watch("rival");
  const diaSemanaLabel = fechaValue ? diaSemanaDeFecha(fechaValue) : null;

  const rivalesScouting = useLiveQuery(
    () =>
      localDb.rivales_scouting
        .toArray()
        .then((rows) => rows.sort((a, b) => a.nombre.localeCompare(b.nombre))),
    [],
    [],
  );

  // Si el nombre del rival escrito coincide con una ficha de scouting ya
  // existente, se sugiere sola la primera vez (solo en partidos nuevos, y
  // solo si el entrenador no ha elegido ya otra cosa a mano).
  useEffect(() => {
    if (partido || !rivalValue) return;
    if (getValues().rival_scouting_id) return;
    const coincide = rivalesScouting.find(
      (r) => r.nombre.trim().toLowerCase() === rivalValue.trim().toLowerCase(),
    );
    if (coincide) setValue("rival_scouting_id", coincide.id);
  }, [rivalValue, rivalesScouting, partido, getValues, setValue]);

  // Si sábado o domingo tienen un horario de partido configurado en Ajustes,
  // se usa para rellenar hora y lugar en cuanto se elige una fecha que caiga
  // en ese día — solo en partidos nuevos y solo si el campo sigue vacío, para
  // no pisar lo que el usuario ya haya escrito.
  const horariosFinDeSemana = useLiveQuery(
    () =>
      localDb.horario_entrenamiento
        .where("dia_semana")
        .anyOf([0, 6])
        .toArray(),
    [],
    [],
  );

  useEffect(() => {
    if (partido || !fechaValue) return;
    const dow = new Date(`${fechaValue}T00:00:00`).getDay();
    const horario = horariosFinDeSemana.find((h) => h.dia_semana === dow);
    if (!horario) return;
    const actuales = getValues();
    if (!actuales.hora && horario.hora_inicio) {
      setValue("hora", horario.hora_inicio.slice(0, 5));
    }
    if (!actuales.lugar && horario.lugar) {
      setValue("lugar", horario.lugar);
    }
  }, [fechaValue, horariosFinDeSemana, partido, getValues, setValue]);

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoRival(file);
    setFotoPreview(URL.createObjectURL(file));
  }

  async function onSubmit(values: PartidoFormValues) {
    const result = partido
      ? await actualizarPartidoLocal(partido.id, values, fotoRival)
      : await crearPartidoLocal(values, fotoRival);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success(partido ? "Partido actualizado" : "Partido creado");
    router.push(`/partidos/${result.id}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          {fotoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fotoPreview}
              alt="Escudo del rival"
              className="size-16 rounded-full border object-cover"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full border bg-muted text-xs text-muted-foreground">
              Rival
            </div>
          )}
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="size-4" />
              {fotoPreview ? "Cambiar foto del rival" : "Añadir foto del rival"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFotoChange}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha</Label>
              <Input id="fecha" type="date" {...register("fecha")} />
              {diaSemanaLabel && (
                <p className="text-xs text-muted-foreground">{diaSemanaLabel}</p>
              )}
              <FieldError message={errors.fecha?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hora">Hora</Label>
              <Input id="hora" type="time" {...register("hora")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="competicion">Competición</Label>
              <Controller
                control={control}
                name="competicion"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="competicion" className="w-full">
                      <SelectValue>
                        {(value) =>
                          COMPETICION_LABEL[value as string] ?? value
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="liga">Liga</SelectItem>
                      <SelectItem value="amistoso">Amistoso</SelectItem>
                      <SelectItem value="copa">Copa</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="local_visitante">Local/Visitante</Label>
              <Controller
                control={control}
                name="local_visitante"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="local_visitante" className="w-full">
                      <SelectValue>
                        {(value) =>
                          LOCAL_VISITANTE_LABEL[value as string] ?? value
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local</SelectItem>
                      <SelectItem value="visitante">Visitante</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rival">Rival</Label>
            <Input id="rival" {...register("rival")} />
            <FieldError message={errors.rival?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rival_scouting_id">Vincular con scouting (opcional)</Label>
            <Controller
              control={control}
              name="rival_scouting_id"
              render={({ field }) => (
                <Select
                  value={field.value || SIN_VINCULAR}
                  onValueChange={(v) =>
                    field.onChange(v === SIN_VINCULAR ? "" : v)
                  }
                >
                  <SelectTrigger id="rival_scouting_id" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SIN_VINCULAR}>Ninguno</SelectItem>
                    {rivalesScouting.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              Si tienes una ficha de scouting de este rival, vincúlala para
              verla directamente desde el partido.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lugar">Lugar</Label>
            <Input id="lugar" {...register("lugar")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <p className="text-sm font-medium">Resultado</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="resultado_favor">Goles a favor</Label>
              <Input
                id="resultado_favor"
                type="number"
                min={0}
                {...register("resultado_favor")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resultado_contra">Goles en contra</Label>
              <Input
                id="resultado_contra"
                type="number"
                min={0}
                {...register("resultado_contra")}
              />
            </div>
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
