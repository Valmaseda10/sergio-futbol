"use client";

import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import Link from "next/link";
import {
  Paperclip,
  FileText,
  ExternalLink,
  BookOpen,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  ENTRENAMIENTO_FORM_DEFAULTS,
  entrenamientoSchema,
  type EntrenamientoFormValues,
} from "@/lib/validations/entrenamiento";
import {
  CATEGORIAS_TAREA,
  CATEGORIA_TAREA_LABEL,
  detectarCategoriaPorTexto,
} from "@/lib/validations/categoria-tarea";
import { extraerTareasDePdf, type TareaDetectada } from "@/lib/pdf-tareas";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CAMPOS_TAREA = ["tarea_1", "tarea_2", "tarea_3", "tarea_4"] as const;
type CampoTarea = (typeof CAMPOS_TAREA)[number];

// Campos derivados de cada tarea (enlace a la biblioteca, categoría fija y
// minutos), tipados a mano en vez de con plantillas de tipo para que
// setValue/register/Controller los acepten sin líos de inferencia.
const CAMPO_EJERCICIO_ID = {
  tarea_1: "tarea_1_ejercicio_id",
  tarea_2: "tarea_2_ejercicio_id",
  tarea_3: "tarea_3_ejercicio_id",
  tarea_4: "tarea_4_ejercicio_id",
} as const satisfies Record<CampoTarea, keyof EntrenamientoFormValues>;

const CAMPO_CATEGORIA = {
  tarea_1: "tarea_1_categoria",
  tarea_2: "tarea_2_categoria",
  tarea_3: "tarea_3_categoria",
  tarea_4: "tarea_4_categoria",
} as const satisfies Record<CampoTarea, keyof EntrenamientoFormValues>;

const CAMPO_MINUTOS = {
  tarea_1: "tarea_1_minutos",
  tarea_2: "tarea_2_minutos",
  tarea_3: "tarea_3_minutos",
  tarea_4: "tarea_4_minutos",
} as const satisfies Record<CampoTarea, keyof EntrenamientoFormValues>;

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
  const [extrayendo, setExtrayendo] = useState(false);
  const [tareasDetectadas, setTareasDetectadas] = useState<
    TareaDetectada[] | null
  >(null);

  // No se pisa con detección automática una categoría que el entrenador ya
  // haya elegido a mano (ni la que ya viniera guardada al editar).
  const categoriaManualRef = useRef<Record<CampoTarea, boolean>>({
    tarea_1: !!entrenamiento?.tarea_1_categoria,
    tarea_2: !!entrenamiento?.tarea_2_categoria,
    tarea_3: !!entrenamiento?.tarea_3_categoria,
    tarea_4: !!entrenamiento?.tarea_4_categoria,
  });

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
    control,
    formState: { errors, isSubmitting },
  } = useForm<EntrenamientoFormValues>({
    resolver: zodResolver(entrenamientoSchema),
    defaultValues: entrenamiento ?? ENTRENAMIENTO_FORM_DEFAULTS,
  });

  function handleElegirEjercicio(ejercicio: {
    id: string;
    nombre: string;
    descripcion: string | null;
  }) {
    if (!pickerPara) return;
    setValue(pickerPara, ejercicio.descripcion || ejercicio.nombre, {
      shouldDirty: true,
      shouldValidate: true,
    });
    // Este enlace (no el texto de arriba, que se puede retocar a mano) es lo
    // que luego permite contar cuántas veces se trabaja cada ejercicio.
    setValue(CAMPO_EJERCICIO_ID[pickerPara], ejercicio.id, {
      shouldDirty: true,
    });
    setPickerPara(null);
  }

  // Si el texto de la tarea coincide con alguna palabra clave de las
  // categorías fijas, se marca sola en el desplegable — el entrenador sigue
  // pudiendo cambiarla a mano en cualquier momento.
  function handleCambioTarea(campo: CampoTarea, texto: string) {
    if (categoriaManualRef.current[campo]) return;
    const detectada = detectarCategoriaPorTexto(texto);
    if (detectada) {
      setValue(CAMPO_CATEGORIA[campo], detectada, { shouldDirty: true });
    }
  }

  function handleCambioCategoria(campo: CampoTarea, valor: string | null) {
    categoriaManualRef.current[campo] = true;
    setValue(CAMPO_CATEGORIA[campo], valor ?? "", { shouldDirty: true });
  }

  async function handleDocumentoChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocumento(file);
    setTareasDetectadas(null);

    if (file.type !== "application/pdf") return;

    setExtrayendo(true);
    try {
      const detectadas = await extraerTareasDePdf(file);
      if (detectadas.length === 0) {
        toast.info(
          "No se han podido reconocer tareas en el PDF automáticamente; rellénalas a mano.",
        );
      } else {
        setTareasDetectadas(detectadas);
      }
    } catch {
      toast.info(
        "No se ha podido leer el texto del PDF (puede ser una foto o escaneo); rellena las tareas a mano.",
      );
    } finally {
      setExtrayendo(false);
    }
  }

  function handleAplicarDetectadas() {
    if (!tareasDetectadas) return;
    tareasDetectadas.forEach((tarea, i) => {
      const campo = CAMPOS_TAREA[i];
      if (!campo) return;
      setValue(campo, tarea.texto, { shouldDirty: true, shouldValidate: true });
      setValue(CAMPO_MINUTOS[campo], String(tarea.minutos), {
        shouldDirty: true,
      });
      if (tarea.categoria) {
        categoriaManualRef.current[campo] = true;
        setValue(CAMPO_CATEGORIA[campo], tarea.categoria, {
          shouldDirty: true,
        });
      }
    });
    toast.success("Tareas rellenadas desde el PDF — revísalas antes de guardar");
    setTareasDetectadas(null);
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
                disabled={extrayendo}
                onClick={() => fileInputRef.current?.click()}
              >
                {extrayendo ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Paperclip className="size-4" />
                )}
                {extrayendo
                  ? "Leyendo el PDF..."
                  : documento
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
          {CAMPOS_TAREA.map((campo, i) => {
            const registroTarea = register(campo);
            return (
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
              <Textarea
                id={campo}
                rows={2}
                {...registroTarea}
                onChange={(e) => {
                  registroTarea.onChange(e);
                  handleCambioTarea(campo, e.target.value);
                }}
              />
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <Label
                    htmlFor={CAMPO_CATEGORIA[campo]}
                    className="text-xs text-muted-foreground"
                  >
                    Categoría
                  </Label>
                  <Controller
                    control={control}
                    name={CAMPO_CATEGORIA[campo]}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(valor) => handleCambioCategoria(campo, valor)}
                      >
                        <SelectTrigger id={CAMPO_CATEGORIA[campo]} className="w-full">
                          <SelectValue placeholder="Sin categoría">
                            {(value) =>
                              CATEGORIAS_TAREA.find((c) => c.value === value)
                                ?.label ?? (value as string)
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIAS_TAREA.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="w-24 shrink-0 space-y-1">
                  <Label
                    htmlFor={CAMPO_MINUTOS[campo]}
                    className="text-xs text-muted-foreground"
                  >
                    Minutos
                  </Label>
                  <Input
                    id={CAMPO_MINUTOS[campo]}
                    type="number"
                    min={0}
                    max={180}
                    placeholder="Ej: 15"
                    {...register(CAMPO_MINUTOS[campo])}
                  />
                </div>
              </div>
            </div>
            );
          })}
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
                  onClick={() => handleElegirEjercicio(ejercicio)}
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

      <Dialog
        open={tareasDetectadas !== null}
        onOpenChange={(open) => !open && setTareasDetectadas(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <Sparkles className="size-4" />
              Tareas detectadas en el PDF
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Revisa que estén bien antes de aplicarlas — sustituirán lo que
            haya ahora en las Tareas 1-{tareasDetectadas?.length ?? 0}.
          </p>
          <ul className="space-y-2">
            {tareasDetectadas?.map((tarea, i) => (
              <li key={i} className="rounded-md border p-2 text-sm">
                <p className="font-medium">
                  Tarea {i + 1}: {tarea.texto}
                </p>
                <p className="text-xs text-muted-foreground">
                  {tarea.minutos} min ·{" "}
                  {tarea.categoria
                    ? CATEGORIA_TAREA_LABEL[tarea.categoria]
                    : "Sin categoría reconocida"}
                </p>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button
              type="button"
              className="flex-1"
              onClick={handleAplicarDetectadas}
            >
              Aplicar a las tareas
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTareasDetectadas(null)}
            >
              Descartar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}
