"use client";

import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import {
  JUGADOR_FORM_DEFAULTS,
  jugadorSchema,
  type JugadorFormValues,
} from "@/lib/validations/jugador";
import { crearJugador, actualizarJugador } from "@/app/(app)/plantilla/actions";
import { JugadorAvatar } from "@/components/plantilla/jugador-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

interface JugadorExistente extends JugadorFormValues {
  id: string;
  fotoSignedUrl: string | null;
}

const PIERNA_DOMINANTE_LABEL: Record<string, string> = {
  izquierda: "Izquierda",
  derecha: "Derecha",
  ambidiestro: "Ambidiestro",
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}

export function JugadorForm({
  jugador,
}: {
  jugador?: JugadorExistente;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(
    jugador?.fotoSignedUrl ?? null,
  );
  const [fotoFile, setFotoFile] = useState<File | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<JugadorFormValues>({
    resolver: zodResolver(jugadorSchema),
    defaultValues: jugador ?? {
      ...JUGADOR_FORM_DEFAULTS,
      fecha_alta: new Date().toISOString().slice(0, 10),
    },
  });

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  }

  async function onSubmit(values: JugadorFormValues) {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      formData.set(key, value);
    });
    if (fotoFile) {
      formData.set("foto", fotoFile);
    }

    const result = jugador
      ? await actualizarJugador(jugador.id, formData)
      : await crearJugador(formData);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success(jugador ? "Jugador actualizado" : "Jugador creado");
    router.push(`/plantilla/${result.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <JugadorAvatar
            src={fotoPreview}
            nombre="?"
            apellidos=""
            className="size-16"
          />
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="size-4" />
              {fotoPreview ? "Cambiar foto" : "Añadir foto"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
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
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" {...register("nombre")} />
              <FieldError message={errors.nombre?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apellidos">Apellidos</Label>
              <Input id="apellidos" {...register("apellidos")} />
              <FieldError message={errors.apellidos?.message} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dorsal">Dorsal</Label>
              <Input
                id="dorsal"
                type="number"
                min={1}
                max={99}
                inputMode="numeric"
                {...register("dorsal")}
              />
              <FieldError message={errors.dorsal?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="posicion">Posición</Label>
              <Input
                id="posicion"
                placeholder="Ej: lateral derecho"
                {...register("posicion")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pierna_dominante">Pierna dominante</Label>
              <Controller
                control={control}
                name="pierna_dominante"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="pierna_dominante" className="w-full">
                      <SelectValue placeholder="Sin especificar">
                        {(value) =>
                          PIERNA_DOMINANTE_LABEL[value as string] ?? value
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="izquierda">Izquierda</SelectItem>
                      <SelectItem value="derecha">Derecha</SelectItem>
                      <SelectItem value="ambidiestro">Ambidiestro</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha_nacimiento">Fecha de nacimiento</Label>
              <Input
                id="fecha_nacimiento"
                type="date"
                {...register("fecha_nacimiento")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fecha_alta">Fecha de alta en el equipo</Label>
            <Input id="fecha_alta" type="date" {...register("fecha_alta")} />
            <FieldError message={errors.fecha_alta?.message} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <p className="text-sm font-medium">Contacto</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contacto_nombre">Nombre</Label>
              <Input id="contacto_nombre" {...register("contacto_nombre")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contacto_telefono">Teléfono</Label>
              <Input
                id="contacto_telefono"
                type="tel"
                {...register("contacto_telefono")}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contacto_email">Email</Label>
            <Input
              id="contacto_email"
              type="email"
              {...register("contacto_email")}
            />
            <FieldError message={errors.contacto_email?.message} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 pt-6">
          <Label htmlFor="notas_medicas">Notas médicas</Label>
          <Textarea
            id="notas_medicas"
            rows={3}
            placeholder="Alergias, lesiones previas, medicación..."
            {...register("notas_medicas")}
          />
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
