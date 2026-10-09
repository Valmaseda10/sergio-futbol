"use client";

import { useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
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
  ImagePlus,
  PenTool,
  BookmarkPlus,
  Library,
  Trash2,
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
  normalizarObjetivosTabla,
  type Diagrama,
  type FichaEntrenamiento,
} from "@/lib/ficha-entrenamiento";
import { DiagramaEditor } from "@/components/entrenamientos/diagrama-editor";
import { ObjetivosTablaEditor } from "@/components/entrenamientos/objetivos-tabla";
import { RotacionEquiposEditor } from "@/components/entrenamientos/rotacion-equipos";
import { AbpJugadasPicker } from "@/components/entrenamientos/abp-jugadas-picker";
import {
  crearEntrenamientoLocal,
  actualizarEntrenamientoLocal,
  guardarTareaGuardadaLocal,
  eliminarTareaGuardadaLocal,
} from "@/app/(app)/entrenamientos/local-actions";
import { localDb, type LocalTareaGuardada } from "@/lib/db/local-db";
import { createClient } from "@/lib/supabase/client";
import {
  SUFIJOS_TAREA,
  leerDatosTarea,
  nombreSugerido,
  type DatosTareaGuardada,
} from "@/lib/tareas-guardadas";
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

// Detalle D/E/T y objetivos de cada fase, igual que en la plantilla — solo
// para la ficha imprimible, no intervienen en el recuento de "trabajadas".
const CAMPO_DIMENSION = {
  tarea_1: "tarea_1_dimension",
  tarea_2: "tarea_2_dimension",
  tarea_3: "tarea_3_dimension",
  tarea_4: "tarea_4_dimension",
} as const satisfies Record<CampoTarea, keyof EntrenamientoFormValues>;

const CAMPO_SERIES = {
  tarea_1: "tarea_1_series",
  tarea_2: "tarea_2_series",
  tarea_3: "tarea_3_series",
  tarea_4: "tarea_4_series",
} as const satisfies Record<CampoTarea, keyof EntrenamientoFormValues>;

const CAMPO_TIEMPO = {
  tarea_1: "tarea_1_tiempo",
  tarea_2: "tarea_2_tiempo",
  tarea_3: "tarea_3_tiempo",
  tarea_4: "tarea_4_tiempo",
} as const satisfies Record<CampoTarea, keyof EntrenamientoFormValues>;

const CAMPO_OBJETIVOS_DEF = {
  tarea_1: "tarea_1_objetivos_def",
  tarea_2: "tarea_2_objetivos_def",
  tarea_3: "tarea_3_objetivos_def",
  tarea_4: "tarea_4_objetivos_def",
} as const satisfies Record<CampoTarea, keyof EntrenamientoFormValues>;

const CAMPO_OBJETIVOS_OFE = {
  tarea_1: "tarea_1_objetivos_ofe",
  tarea_2: "tarea_2_objetivos_ofe",
  tarea_3: "tarea_3_objetivos_ofe",
  tarea_4: "tarea_4_objetivos_ofe",
} as const satisfies Record<CampoTarea, keyof EntrenamientoFormValues>;

// Resto de la plantilla por tarea: rotación de jugadores, reglas de
// provocación y observaciones. La imagen del ejercicio no es un campo del
// formulario (es un File, como el documento de sesión) — se gestiona aparte.
const CAMPO_ROTACION = {
  tarea_1: "tarea_1_rotacion",
  tarea_2: "tarea_2_rotacion",
  tarea_3: "tarea_3_rotacion",
  tarea_4: "tarea_4_rotacion",
} as const satisfies Record<CampoTarea, keyof EntrenamientoFormValues>;

const CAMPO_REGLAS_PROVOCACION = {
  tarea_1: "tarea_1_reglas_provocacion",
  tarea_2: "tarea_2_reglas_provocacion",
  tarea_3: "tarea_3_reglas_provocacion",
  tarea_4: "tarea_4_reglas_provocacion",
} as const satisfies Record<CampoTarea, keyof EntrenamientoFormValues>;

const CAMPO_OBSERVACIONES = {
  tarea_1: "tarea_1_observaciones",
  tarea_2: "tarea_2_observaciones",
  tarea_3: "tarea_3_observaciones",
  tarea_4: "tarea_4_observaciones",
} as const satisfies Record<CampoTarea, keyof EntrenamientoFormValues>;

// Quién de los dos entrenadores lleva cada tarea, para el apartado "Roles
// entrenador" (igual que la fila "Campos: / Paco:" de la plantilla).
const CAMPO_ROL_CAMPOS = {
  tarea_1: "tarea_1_rol_campos",
  tarea_2: "tarea_2_rol_campos",
  tarea_3: "tarea_3_rol_campos",
  tarea_4: "tarea_4_rol_campos",
} as const satisfies Record<CampoTarea, keyof EntrenamientoFormValues>;

const CAMPO_ROL_PACO = {
  tarea_1: "tarea_1_rol_paco",
  tarea_2: "tarea_2_rol_paco",
  tarea_3: "tarea_3_rol_paco",
  tarea_4: "tarea_4_rol_paco",
} as const satisfies Record<CampoTarea, keyof EntrenamientoFormValues>;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}

// Imagen del diagrama táctico de una tarea: recorte cuadrado con botón para
// elegir/cambiar, al estilo de una casilla de la plantilla.
function ImagenTarea({
  urlActual,
  vistaPrevia,
  onChange,
  onQuitar,
}: {
  urlActual?: string | null;
  vistaPrevia?: string | null;
  onChange: (archivo: File) => void;
  /** Quita la imagen (y el dibujo) de la tarea para dejarla en blanco. */
  onQuitar?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewLocal, setPreviewLocal] = useState<string | null>(null);

  function aplicarArchivo(file: File) {
    setPreviewLocal(URL.createObjectURL(file));
    onChange(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    aplicarArchivo(file);
  }

  // Permite pegar una captura de pantalla directamente (Ctrl+V) sin tener
  // que guardarla como archivo antes — el botón es focusable para que el
  // navegador le entregue el evento paste aunque no sea un campo de texto.
  function handlePaste(e: React.ClipboardEvent<HTMLButtonElement>) {
    const item = Array.from(e.clipboardData.items).find((i) =>
      i.type.startsWith("image/"),
    );
    const file = item?.getAsFile();
    if (!file) return;
    e.preventDefault();
    aplicarArchivo(file);
  }

  const preview = vistaPrevia ?? previewLocal ?? urlActual ?? null;

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">
        Imagen del ejercicio
      </Label>
      <button
        type="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onPaste={handlePaste}
        title="Haz clic para elegir un archivo, o pega una captura con Ctrl+V"
        className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed bg-muted/30 text-muted-foreground hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Diagrama de la tarea"
            className="h-full w-full object-cover"
          />
        ) : (
          <ImagePlus className="size-5" />
        )}
      </button>
      {preview && onQuitar ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-24 px-1 text-xs text-destructive"
          onClick={() => {
            setPreviewLocal(null);
            onQuitar();
          }}
        >
          <Trash2 className="size-3.5" />
          Quitar
        </Button>
      ) : (
        <p className="w-24 text-[10px] text-muted-foreground">
          O pega una captura (Ctrl+V)
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

export function EntrenamientoForm({
  entrenamiento,
}: {
  entrenamiento?: EntrenamientoFormValues & {
    id: string;
    documentoSignedUrl?: string | null;
    tareaImagenSignedUrls?: (string | null)[];
    ficha?: FichaEntrenamiento;
  };
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documento, setDocumento] = useState<File | null>(null);
  const [imagenesTareas, setImagenesTareas] = useState<
    (File | null)[]
  >([null, null, null, null]);
  // Tareas a las que se les ha quitado la imagen/dibujo (se aplica al guardar).
  const [imagenesQuitadas, setImagenesQuitadas] = useState<boolean[]>([false, false, false, false]);
  const [pickerPara, setPickerPara] = useState<CampoTarea | null>(null);
  const [ficha, setFicha] = useState<FichaEntrenamiento>(
    entrenamiento?.ficha ?? {},
  );
  const jugadoresActivos = useLiveQuery(
    () =>
      localDb.jugadores
        .filter((j) => j.activo)
        .toArray()
        .then((rows) => rows.sort((a, b) => a.nombre.localeCompare(b.nombre))),
    [],
    [],
  );
  const [tablaImagen, setTablaImagen] = useState<File | null>(null);
  const [tablaImagenPreview, setTablaImagenPreview] = useState<string | null>(null);
  const tablaInputRef = useRef<HTMLInputElement>(null);

  function aplicarTablaImagen(archivo: File) {
    setTablaImagen(archivo);
    setTablaImagenPreview(URL.createObjectURL(archivo));
  }

  // Botón alternativo a Ctrl+V (útil en iPad): lee la última imagen copiada.
  async function pegarTablaDesdePortapapeles() {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const tipo = item.types.find((t) => t.startsWith("image/"));
        if (!tipo) continue;
        const blob = await item.getType(tipo);
        aplicarTablaImagen(
          new File([blob], `tabla.${tipo.split("/")[1] ?? "png"}`, { type: tipo }),
        );
        return;
      }
      toast.error("No hay ninguna imagen en el portapapeles");
    } catch {
      toast.error("No se ha podido leer el portapapeles; prueba con Ctrl+V");
    }
  }
  const [diagramaEditando, setDiagramaEditando] = useState<number | null>(null);
  // Vista previa del PNG generado al dibujar un diagrama (el archivo aún no
  // está subido hasta guardar la sesión).
  const [previewsDiagrama, setPreviewsDiagrama] = useState<(string | null)[]>([
    null,
    null,
    null,
    null,
  ]);
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

  const [guardadasPara, setGuardadasPara] = useState<number | null>(null);
  const tareasGuardadas = useLiveQuery(
    () =>
      localDb.tareas_guardadas
        .toArray()
        .then((rows) => rows.sort((a, b) => a.nombre.localeCompare(b.nombre))),
    [],
    [],
  );

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
    getValues,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EntrenamientoFormValues>({
    resolver: zodResolver(entrenamientoSchema),
    defaultValues: entrenamiento ?? ENTRENAMIENTO_FORM_DEFAULTS,
  });

  // Con la tarea 4 en "ABP" se pueden elegir las jugadas que se trabajan.
  const categoriaTarea4 = useWatch({ control, name: "tarea_4_categoria" });

  // Nombre de campo del formulario para una tarea (índice 0-3) y sufijo.
  function campoDe(i: number, sufijo: string) {
    return `tarea_${i + 1}${sufijo}` as keyof EntrenamientoFormValues;
  }

  // Guarda la tarea tal como está ahora (texto, diagrama, rotación e imagen)
  // para poder reutilizarla en otra sesión sin volver a escribirla ni dibujarla.
  async function guardarTarea(i: number) {
    const valores = getValues();
    const campos: DatosTareaGuardada["campos"] = {};
    for (const sufijo of SUFIJOS_TAREA) {
      const valor = String(valores[campoDe(i, sufijo)] ?? "");
      if (valor) campos[sufijo] = valor;
    }
    if (!campos[""]) {
      toast.error("La tarea está vacía: escribe algo antes de guardarla");
      return;
    }
    const nombre = window.prompt(
      "Nombre con el que guardar la tarea",
      nombreSugerido(campos[""]),
    );
    if (nombre === null) return;

    // La imagen: la recién dibujada o subida, o la que ya tiene la sesión.
    let imagen: Blob | null = imagenesTareas[i];
    const urlActual = entrenamiento?.tareaImagenSignedUrls?.[i];
    if (!imagen && urlActual) {
      try {
        imagen = await (await fetch(urlActual)).blob();
      } catch {
        toast.warning("No se ha podido leer la imagen: se guarda solo el texto");
      }
    }

    const resultado = await guardarTareaGuardadaLocal(
      nombre,
      {
        campos,
        diagrama: ficha.diagramas?.[i] ?? null,
        equipos: ficha.rotaciones?.[i] ?? null,
      },
      imagen,
    );
    if ("error" in resultado) {
      toast.error(resultado.error);
      return;
    }
    toast.success("Tarea guardada: la tienes en Tareas guardadas");
  }

  // Rellena la tarea i con una tarea guardada (sustituye lo que hubiera).
  async function usarTareaGuardada(i: number, guardada: LocalTareaGuardada) {
    const datos = leerDatosTarea(guardada.datos);
    for (const sufijo of SUFIJOS_TAREA) {
      setValue(campoDe(i, sufijo), datos.campos[sufijo] ?? "", {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    setValue(campoDe(i, "_ejercicio_id"), "", { shouldDirty: true });
    if (datos.campos._categoria) {
      categoriaManualRef.current[CAMPOS_TAREA[i]] = true;
    }
    setFicha((f) => {
      const diagramas = [...(f.diagramas ?? [null, null, null, null])];
      diagramas[i] = datos.diagrama ? structuredClone(datos.diagrama) : null;
      const rotaciones = [...(f.rotaciones ?? [null, null, null, null])];
      rotaciones[i] = datos.equipos ? structuredClone(datos.equipos) : null;
      return { ...f, diagramas, rotaciones };
    });

    if (guardada.imagen_url) {
      try {
        const { data, error } = await createClient()
          .storage.from("adjuntos")
          .download(guardada.imagen_url);
        if (error || !data) throw error ?? new Error("sin datos");
        const archivo = new File([data], `tarea-${i + 1}.png`, {
          type: data.type || "image/png",
        });
        setImagenesTareas((prev) => {
          const siguiente = [...prev];
          siguiente[i] = archivo;
          return siguiente;
        });
        setPreviewsDiagrama((prev) => {
          const siguiente = [...prev];
          siguiente[i] = URL.createObjectURL(archivo);
          return siguiente;
        });
      } catch {
        toast.warning(
          "Se ha copiado el texto, pero no se ha podido descargar el dibujo (¿sin conexión?)",
        );
      }
    }
    setGuardadasPara(null);
    toast.success(`Tarea ${i + 1} rellenada con "${guardada.nombre}"`);
  }

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
      // minutos puede venir sin detectar (p. ej. "3 x 5 series", sin unidad
      // de tiempo reconocible): mejor dejar el campo como estaba que
      // rellenarlo con un "null" literal.
      if (tarea.minutos != null) {
        setValue(CAMPO_MINUTOS[campo], String(tarea.minutos), {
          shouldDirty: true,
        });
      }
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
      ? await actualizarEntrenamientoLocal(
          entrenamiento.id,
          values,
          documento,
          imagenesTareas,
          ficha,
          tablaImagen,
          imagenesQuitadas,
        )
      : await crearEntrenamientoLocal(
          values,
          documento,
          imagenesTareas,
          ficha,
          tablaImagen,
        );

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
          <p className="text-xs font-medium text-muted-foreground">
            Cabecera de la sesión (igual que en la plantilla)
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero_sesion">Nº sesión</Label>
              <Input
                id="numero_sesion"
                placeholder="Ej: 21-LUNES"
                value={ficha.numero_sesion ?? ""}
                onChange={(e) =>
                  setFicha((f) => ({ ...f, numero_sesion: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rival_torneo">Rival / Torneo</Label>
              <Input id="rival_torneo" {...register("rival_torneo")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="microciclo">Microciclo</Label>
              <Input
                id="microciclo"
                placeholder="Ej: M04 - PdP"
                {...register("microciclo")}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bajas">Bajas</Label>
            <Input id="bajas" placeholder="Ej: IA - Leo" {...register("bajas")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="objetivos">Obj. semanal</Label>
            <Textarea
              id="objetivos"
              rows={2}
              placeholder="Qué se quiere trabajar en la sesión"
              {...register("objetivos")}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="charla">Charla</Label>
              <Textarea
                id="charla"
                rows={4}
                placeholder="Lo que se comenta al equipo antes de empezar"
                {...register("charla")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="material">Material</Label>
              <Textarea
                id="material"
                rows={4}
                placeholder="Ej: Balones, conos, picas, 4 miniporterías"
                {...register("material")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <p className="text-xs font-medium text-muted-foreground">
            Tabla de objetivos (Psicológico / Táctico / Técnico / Físico)
          </p>
          <p className="text-[11px] text-muted-foreground">
            Es la misma toda la semana: ponla en la primera sesión y las
            siguientes de esa semana (lunes a domingo) la usan solas mientras
            no pongas otra distinta.
          </p>
          <div className="space-y-4">
              <div className="space-y-2 rounded-md border p-3">
                <p className="text-xs font-semibold">Adjuntar la tabla como imagen</p>
                <p className="text-xs text-muted-foreground">
                  Si subes o pegas una captura de tu tabla, sale tal cual en la
                  ficha en lugar de la de abajo.
                </p>
                {(tablaImagenPreview || ficha.tabla_imagen_url) && (
                  <div className="space-y-2">
                    {tablaImagenPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={tablaImagenPreview}
                        alt="Tabla de objetivos adjunta"
                        className="max-h-48 rounded border"
                      />
                    ) : (
                      <p className="text-xs">Ya hay una imagen adjunta.</p>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTablaImagen(null);
                        setTablaImagenPreview(null);
                        setFicha((f) => ({ ...f, tabla_imagen_url: undefined }));
                      }}
                    >
                      Quitar imagen
                    </Button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => tablaInputRef.current?.click()}
                  onPaste={(e) => {
                    const item = Array.from(e.clipboardData.items).find((i) =>
                      i.type.startsWith("image/"),
                    );
                    const archivo = item?.getAsFile();
                    if (!archivo) return;
                    e.preventDefault();
                    aplicarTablaImagen(archivo);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-4 text-xs text-muted-foreground hover:bg-muted/50 focus:ring-2 focus:ring-ring focus:outline-none"
                >
                  <ImagePlus className="size-4" />
                  Elige un archivo o pega una captura aquí (Ctrl+V)
                </button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={pegarTablaDesdePortapapeles}
                >
                  Pegar captura del portapapeles
                </Button>
                <input
                  ref={tablaInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const archivo = e.target.files?.[0];
                    if (archivo) aplicarTablaImagen(archivo);
                    e.target.value = "";
                  }}
                />
              </div>
              <details>
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                  O rellenarla escribiendo
                </summary>
                <div className="pt-3">
                  <ObjetivosTablaEditor
                    valor={normalizarObjetivosTabla(ficha.tabla_objetivos)}
                    onChange={(t) => setFicha((f) => ({ ...f, tabla_objetivos: t }))}
                  />
                </div>
              </details>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <p className="text-xs font-medium text-muted-foreground">
            Roles entrenador — quién lleva cada tarea
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CAMPOS_TAREA.map((campo, i) => (
              <div key={campo} className="grid grid-cols-2 gap-2 rounded-md border p-2">
                <p className="col-span-2 text-xs font-medium text-muted-foreground">
                  Tarea {i + 1}
                </p>
                <div className="space-y-1">
                  <Label
                    htmlFor={CAMPO_ROL_CAMPOS[campo]}
                    className="text-xs text-muted-foreground"
                  >
                    Campos
                  </Label>
                  <Input id={CAMPO_ROL_CAMPOS[campo]} {...register(CAMPO_ROL_CAMPOS[campo])} />
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor={CAMPO_ROL_PACO[campo]}
                    className="text-xs text-muted-foreground"
                  >
                    Paco
                  </Label>
                  <Input id={CAMPO_ROL_PACO[campo]} {...register(CAMPO_ROL_PACO[campo])} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          {CAMPOS_TAREA.map((campo, i) => {
            const registroTarea = register(campo);
            return (
            <div key={campo} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <Label htmlFor={campo}>Tarea {i + 1}</Label>
                <div className="flex flex-wrap justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => guardarTarea(i)}
                  >
                    <BookmarkPlus className="size-3.5" />
                    Guardar tarea
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setGuardadasPara(i)}
                  >
                    <Library className="size-3.5" />
                    Tareas guardadas
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPickerPara(campo)}
                  >
                    <BookOpen className="size-3.5" />
                    Biblioteca
                  </Button>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex flex-col gap-1">
                  <ImagenTarea
                    urlActual={
                      imagenesQuitadas[i] ? null : entrenamiento?.tareaImagenSignedUrls?.[i]
                    }
                    vistaPrevia={previewsDiagrama[i]}
                    onQuitar={() => {
                      setPreviewsDiagrama((prev) => prev.map((x, k) => (k === i ? null : x)));
                      setImagenesTareas((prev) => prev.map((x, k) => (k === i ? null : x)));
                      setImagenesQuitadas((prev) => prev.map((x, k) => (k === i ? true : x)));
                      setFicha((f) => {
                        const diagramas = [...(f.diagramas ?? [null, null, null, null])];
                        diagramas[i] = null;
                        return { ...f, diagramas };
                      });
                      toast.success(`Dibujo de la tarea ${i + 1} quitado — guarda la sesión para conservarlo`);
                    }}
                    onChange={(archivo) => {
                      setImagenesQuitadas((prev) => prev.map((x, k) => (k === i ? false : x)));
                      setPreviewsDiagrama((prev) => {
                        const siguiente = [...prev];
                        siguiente[i] = null;
                        return siguiente;
                      });
                      setImagenesTareas((prev) => {
                        const siguiente = [...prev];
                        siguiente[i] = archivo;
                        return siguiente;
                      });
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-24 px-1 text-xs"
                    onClick={() => setDiagramaEditando(i)}
                  >
                    <PenTool className="size-3.5" />
                    Dibujar
                  </Button>
                </div>
                <Textarea
                  id={campo}
                  rows={4}
                  className="flex-1"
                  {...registroTarea}
                  onChange={(e) => {
                    registroTarea.onChange(e);
                    handleCambioTarea(campo, e.target.value);
                  }}
                />
              </div>
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

              <p className="pt-1 text-xs font-medium text-muted-foreground">
                Detalle para el PDF (opcional)
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label
                    htmlFor={CAMPO_DIMENSION[campo]}
                    className="text-xs text-muted-foreground"
                  >
                    D (dimensiones)
                  </Label>
                  <Input
                    id={CAMPO_DIMENSION[campo]}
                    placeholder="Ej: 40x20"
                    {...register(CAMPO_DIMENSION[campo])}
                  />
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor={CAMPO_SERIES[campo]}
                    className="text-xs text-muted-foreground"
                  >
                    E (espacios)
                  </Label>
                  <Input
                    id={CAMPO_SERIES[campo]}
                    placeholder="Ej: 2"
                    {...register(CAMPO_SERIES[campo])}
                  />
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor={CAMPO_TIEMPO[campo]}
                    className="text-xs text-muted-foreground"
                  >
                    T (tiempo)
                  </Label>
                  <Input
                    id={CAMPO_TIEMPO[campo]}
                    placeholder="Ej: 2x10'"
                    {...register(CAMPO_TIEMPO[campo])}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label
                    htmlFor={CAMPO_OBJETIVOS_DEF[campo]}
                    className="text-xs text-muted-foreground"
                  >
                    Ítems fase defensiva
                  </Label>
                  <Textarea
                    id={CAMPO_OBJETIVOS_DEF[campo]}
                    rows={2}
                    {...register(CAMPO_OBJETIVOS_DEF[campo])}
                  />
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor={CAMPO_OBJETIVOS_OFE[campo]}
                    className="text-xs text-muted-foreground"
                  >
                    Ítems fase ofensiva
                  </Label>
                  <Textarea
                    id={CAMPO_OBJETIVOS_OFE[campo]}
                    rows={2}
                    {...register(CAMPO_OBJETIVOS_OFE[campo])}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor={CAMPO_ROTACION[campo]}
                  className="text-xs text-muted-foreground"
                >
                  Rotación
                </Label>
                <Textarea
                  id={CAMPO_ROTACION[campo]}
                  rows={6}
                  placeholder="Grupos de jugadores y cómo rotan"
                  {...register(CAMPO_ROTACION[campo])}
                />
                <details open={(ficha.rotaciones?.[i]?.equipos.length ?? 0) > 0}>
                  <summary className="cursor-pointer pt-1 text-xs font-medium text-muted-foreground">
                    Rotación por equipos con color
                  </summary>
                  <div className="space-y-2 pt-2">
                    <p className="text-[11px] text-muted-foreground">
                      Si añades equipos, salen en la ficha (cada uno en su color y por
                      posiciones) en lugar del texto de arriba.
                    </p>
                    <RotacionEquiposEditor
                      valor={ficha.rotaciones?.[i]}
                      jugadores={jugadoresActivos}
                      onChange={(r) =>
                        setFicha((f) => {
                          const rotaciones = [
                            ...(f.rotaciones ?? [null, null, null, null]),
                          ];
                          rotaciones[i] = r;
                          return { ...f, rotaciones };
                        })
                      }
                    />
                  </div>
                </details>
                {i === 3 && categoriaTarea4 === "abp" && (
                  <details open>
                    <summary className="cursor-pointer pt-1 text-xs font-medium text-muted-foreground">
                      ABP: jugadas a trabajar
                    </summary>
                    <AbpJugadasPicker
                      seleccion={ficha.abp_jugadas?.[3] ?? []}
                      onSeleccion={(ids) =>
                        setFicha((f) => {
                          const abp = [...(f.abp_jugadas ?? [[], [], [], []])];
                          abp[3] = ids;
                          return { ...f, abp_jugadas: abp };
                        })
                      }
                    />
                  </details>
                )}
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor={CAMPO_REGLAS_PROVOCACION[campo]}
                  className="text-xs text-muted-foreground"
                >
                  Reglas de provocación
                </Label>
                <Textarea
                  id={CAMPO_REGLAS_PROVOCACION[campo]}
                  rows={2}
                  {...register(CAMPO_REGLAS_PROVOCACION[campo])}
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor={CAMPO_OBSERVACIONES[campo]}
                  className="text-xs text-muted-foreground"
                >
                  Observaciones
                </Label>
                <Textarea
                  id={CAMPO_OBSERVACIONES[campo]}
                  rows={2}
                  {...register(CAMPO_OBSERVACIONES[campo])}
                />
              </div>
            </div>
            );
          })}
          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea id="notas" rows={2} {...register("notas")} />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Trabajo extra (no forma parte de las 4 tareas, p.ej. un repaso
              descrito en Notas) — solo para que cuente en Estadísticas
            </p>
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                <Label
                  htmlFor="extra_categoria"
                  className="text-xs text-muted-foreground"
                >
                  Categoría
                </Label>
                <Controller
                  control={control}
                  name="extra_categoria"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="extra_categoria" className="w-full">
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
                  htmlFor="extra_minutos"
                  className="text-xs text-muted-foreground"
                >
                  Minutos
                </Label>
                <Input
                  id="extra_minutos"
                  type="number"
                  min={0}
                  max={180}
                  placeholder="Ej: 15"
                  {...register("extra_minutos")}
                />
              </div>
            </div>
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
        open={guardadasPara !== null}
        onOpenChange={(open) => !open && setGuardadasPara(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tareas guardadas</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Al elegir una, sustituye lo que haya ahora en la Tarea{" "}
            {(guardadasPara ?? 0) + 1} (texto, objetivos, rotación y dibujo).
          </p>
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {tareasGuardadas.length === 0 ? (
              <p className="p-2 text-sm text-muted-foreground">
                Todavía no has guardado ninguna. Rellena una tarea y pulsa
                &quot;Guardar tarea&quot;.
              </p>
            ) : (
              tareasGuardadas.map((t) => {
                const d = leerDatosTarea(t.datos);
                const resumen = [d.campos._dimension, d.campos._tiempo]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <div key={t.id} className="flex items-center gap-1 rounded-md hover:bg-muted">
                    <button
                      type="button"
                      onClick={() =>
                        guardadasPara !== null && usarTareaGuardada(guardadasPara, t)
                      }
                      className="min-w-0 flex-1 p-2 text-left text-sm"
                    >
                      <p className="truncate font-medium">{t.nombre}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[resumen, t.imagen_url || d.diagrama ? "con dibujo" : ""]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8 shrink-0 text-destructive"
                      aria-label={`Eliminar ${t.nombre}`}
                      onClick={() => {
                        if (window.confirm(`¿Eliminar la tarea guardada "${t.nombre}"?`)) {
                          void eliminarTareaGuardadaLocal(t.id);
                        }
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

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
                  {tarea.minutos != null ? `${tarea.minutos} min` : "¿Cuántos min?"} ·{" "}
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

      {diagramaEditando !== null && (
        <DiagramaEditor
          key={diagramaEditando}
          abierto
          numeroTarea={diagramaEditando + 1}
          inicial={ficha.diagramas?.[diagramaEditando] ?? null}
          onCerrar={() => setDiagramaEditando(null)}
          onGuardar={(diagrama: Diagrama, png: File) => {
            const i = diagramaEditando;
            setFicha((f) => {
              const diagramas = [...(f.diagramas ?? [null, null, null, null])];
              diagramas[i] = diagrama;
              return { ...f, diagramas };
            });
            setImagenesTareas((prev) => {
              const siguiente = [...prev];
              siguiente[i] = png;
              return siguiente;
            });
            setPreviewsDiagrama((prev) => {
              const siguiente = [...prev];
              siguiente[i] = URL.createObjectURL(png);
              return siguiente;
            });
            setDiagramaEditando(null);
            toast.success(`Diagrama de la tarea ${i + 1} listo — guarda la sesión para conservarlo`);
          }}
        />
      )}
    </form>
  );
}
