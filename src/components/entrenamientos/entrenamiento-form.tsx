"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import Link from "next/link";
import { Paperclip, FileText, ExternalLink, BookOpen } from "lucide-react";
import {
  ENTRENAMIENTO_FORM_DEFAULTS,
  entrenamientoSchema,
  type EntrenamientoFormValues,
} from "@/lib/validations/entrenamiento";
import {
  crearEntrenamientoLocal,
  actualizarEntrenamientoLocal,
} from "@/app/(app)/entrenamientos/local-actions";
import { localDb } from "@/lib/db/local-db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CAMPOS_TAREA = ["tarea_1", "tarea_2", "tarea_3", "tarea_4"] as const;
type CampoTarea = (typeof CAMPOS_TAREA)[number];

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}

export function EntrenamientoForm({
  entrenamiento,
}: {
  entrenamiento?: EntrenamientoFormValues & {
    id: string;
    documentoSignedUrl?: string | null;
  };
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documento, setDocumento] = useState<File | null>(null);
  const [pickerPara, setPickerPara] = useState<CampoTarea | null>(null);

  const ejercicios = useLiveQuery(
    () =>
      localDb.ejercicios
        .toArray()
        .then((rows) => rows.sort((a, b) => a.nombre.localeCompare(b.nombre))),
    [],
    [],
  );

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EntrenamientoFormValues>({
    resolver: zodResolver(entrenamientoSchema),
    defaultValues: entrenamiento ?? ENTRENAMIENTO_FORM_DEFAULTS,
  });

  function handleElegirEjercicio(descripcion: string, nombre: string) {
    if (!pickerPara) return;
    setValue(pickerPara, descripcion || nombre, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setPickerPara(null);
  }

  function handleDocumentoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocumento(file);
  }

  async function onSubmit(values: EntrenamientoFormValues) {
    const result = entrenamiento
      ? await actualizarEntrenamientoLocal(entrenamiento.id, values, documento)
      : await crearEntrenamientoLocal(values, documento);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success(entrenamiento ? "Entrenamiento actualizado" : "Entrenamiento creado");
    router.push(`/entrenamientos/${result.id}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label>Foto o documento de la sesión</Label>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="size-4" />
                {documento
                  ? documento.name
                  : entrenamiento?.documentoSignedUrl
                    ? "Cambiar archivo"
                    : "Añadir foto o PDF"}
              </Button>
              {!documento && entrenamiento?.documentoSignedUrl && (
                <a
                  href={entrenamiento.documentoSignedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary underline underline-offset-4"
                >
                  <FileText className="size-3.5" />
                  Ver actual
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleDocumentoChange}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="fecha">Fecha</Label>
            <Input id="fecha" type="date" {...register("fecha")} />
            <FieldError message={errors.fecha?.message} />
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

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="objetivos">Objetivos</Label>
            <Textarea
              id="objetivos"
              rows={2}
              placeholder="Qué se quiere trabajar en la sesión"
              {...register("objetivos")}
            />
          </div>
          {CAMPOS_TAREA.map((campo, i) => (
            <div key={campo} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={campo}>Tarea {i + 1}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPickerPara(campo)}
                >
                  <BookOpen className="size-3.5" />
                  Elegir de la biblioteca
                </Button>
              </div>
              <Textarea id={campo} rows={2} {...register(campo)} />
            </div>
          ))}
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

      <Dialog
        open={pickerPara !== null}
        onOpenChange={(open) => !open && setPickerPara(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elegir ejercicio</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {ejercicios.length === 0 ? (
              <p className="p-2 text-sm text-muted-foreground">
                Todavía no hay ejercicios guardados.{" "}
                <Link
                  href="/entrenamientos/ejercicios"
                  className="font-medium underline"
                >
                  Añade alguno a la biblioteca
                </Link>
                .
              </p>
            ) : (
              ejercicios.map((ejercicio) => (
                <button
                  key={ejercicio.id}
                  type="button"
                  onClick={() =>
                    handleElegirEjercicio(
                      ejercicio.descripcion ?? "",
                      ejercicio.nombre,
                    )
                  }
                  className="block w-full rounded-md p-2 text-left text-sm hover:bg-muted"
                >
                  <p className="font-medium">{ejercicio.nombre}</p>
                  {ejercicio.descripcion && (
                    <p className="line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">
                      {ejercicio.descripcion}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}
