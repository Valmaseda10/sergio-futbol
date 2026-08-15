"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import {
  RIVAL_SCOUTING_FORM_DEFAULTS,
  rivalScoutingSchema,
  type RivalScoutingFormValues,
} from "@/lib/validations/rivales";
import {
  crearRivalLocal,
  actualizarRivalLocal,
} from "@/app/(app)/rivales/local-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}

export function RivalForm({
  rival,
}: {
  rival?: RivalScoutingFormValues & { id: string; fotoSignedUrl?: string | null };
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(
    rival?.fotoSignedUrl ?? null,
  );
  const [foto, setFoto] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RivalScoutingFormValues>({
    resolver: zodResolver(rivalScoutingSchema),
    defaultValues: rival ?? RIVAL_SCOUTING_FORM_DEFAULTS,
  });

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFoto(file);
    setFotoPreview(URL.createObjectURL(file));
  }

  async function onSubmit(values: RivalScoutingFormValues) {
    const result = rival
      ? await actualizarRivalLocal(rival.id, values, foto)
      : await crearRivalLocal(values, foto);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success(rival ? "Rival actualizado" : "Rival creado");
    router.push(`/rivales/${result.id}`);
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
              {fotoPreview ? "Cambiar foto" : "Añadir foto"}
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
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre del rival</Label>
            <Input id="nombre" {...register("nombre")} />
            <FieldError message={errors.nombre?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sistema_juego">
              Sistema de juego (alineación y cambios)
            </Label>
            <Textarea
              id="sistema_juego"
              rows={3}
              placeholder="Ej: 1-4-3-3. Suelen cambiar a 1-4-4-2 en el descanso..."
              {...register("sistema_juego")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fase_ofensiva">Fase ofensiva</Label>
            <Textarea id="fase_ofensiva" rows={3} {...register("fase_ofensiva")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fase_defensiva">Fase defensiva</Label>
            <Textarea id="fase_defensiva" rows={3} {...register("fase_defensiva")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="abp">ABP (acciones a balón parado)</Label>
            <Textarea id="abp" rows={3} {...register("abp")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea id="notas" rows={2} {...register("notas")} />
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
