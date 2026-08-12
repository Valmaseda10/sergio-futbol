"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  PARTIDO_FORM_DEFAULTS,
  partidoSchema,
  type PartidoFormValues,
} from "@/lib/validations/partido";
import { crearPartido, actualizarPartido } from "@/app/(app)/partidos/actions";
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
  partido?: PartidoFormValues & { id: string };
}) {
  const router = useRouter();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PartidoFormValues>({
    resolver: zodResolver(partidoSchema),
    defaultValues: partido ?? PARTIDO_FORM_DEFAULTS,
  });

  async function onSubmit(values: PartidoFormValues) {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      formData.set(key, value);
    });

    const result = partido
      ? await actualizarPartido(partido.id, formData)
      : await crearPartido(formData);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success(partido ? "Partido actualizado" : "Partido creado");
    router.push(`/partidos/${result.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha</Label>
              <Input id="fecha" type="date" {...register("fecha")} />
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
