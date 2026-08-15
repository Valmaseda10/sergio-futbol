"use client";

import { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { videoSchema, type VideoFormValues } from "@/lib/validations/video";
import { crearVideoLocal } from "@/app/(app)/videos/local-actions";
import { localDb } from "@/lib/db/local-db";
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

interface PartidoOpcion {
  id: string;
  rival: string;
  fecha: string;
}

const TIPO_LABEL: Record<string, string> = {
  partido: "Partido completo",
  clip: "Clip",
};

const TIPO_EVENTO_LABEL: Record<string, string> = {
  gol: "Gol",
  autogol: "Autogol",
  asistencia: "Asistencia",
  tarjeta_amarilla: "Tarjeta amarilla",
  tarjeta_roja: "Tarjeta roja",
  cambio_entra: "Entra al campo",
  cambio_sale: "Sale del campo",
};

function hoyISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function VideoForm({
  partidos,
  partidoIdInicial,
  tipoInicial,
}: {
  partidos: PartidoOpcion[];
  partidoIdInicial?: string;
  tipoInicial?: "partido" | "clip";
}) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VideoFormValues>({
    resolver: zodResolver(videoSchema),
    defaultValues: {
      titulo: "",
      url: "",
      tipo: tipoInicial ?? (partidoIdInicial ? "partido" : "clip"),
      partido_id: partidoIdInicial ?? "",
      evento_id: "",
      segundo_inicio: "",
      segundo_fin: "",
      fecha: hoyISO(),
      notas: "",
    },
  });

  const partidosPorId = new Map(partidos.map((p) => [p.id, p]));
  const partidoIdSeleccionado = watch("partido_id");

  const eventos = useLiveQuery(
    () =>
      localDb.eventos_partido
        .where("partido_id")
        .equals(partidoIdSeleccionado || "__ninguno__")
        .toArray(),
    [partidoIdSeleccionado],
    [],
  );
  const jugadores = useLiveQuery(() => localDb.jugadores.toArray(), [], []);
  const jugadoresPorId = useMemo(
    () => new Map(jugadores.map((j) => [j.id, j])),
    [jugadores],
  );
  const eventosOrdenados = useMemo(
    () => eventos.slice().sort((a, b) => (a.minuto ?? 999) - (b.minuto ?? 999)),
    [eventos],
  );

  function etiquetaEvento(evento: (typeof eventos)[number]) {
    const jugador = evento.jugador_id ? jugadoresPorId.get(evento.jugador_id) : null;
    const nombre = jugador ? jugador.alias || `${jugador.nombre} ${jugador.apellidos}` : "Rival";
    const minuto = evento.minuto != null ? `${evento.minuto}' — ` : "";
    return `${minuto}${TIPO_EVENTO_LABEL[evento.tipo] ?? evento.tipo} (${nombre})`;
  }

  async function onSubmit(values: VideoFormValues) {
    setEnviando(true);
    const result = await crearVideoLocal(values);
    setEnviando(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Vídeo añadido");
    router.push(values.tipo === "partido" ? "/videos/partidos" : "/videos/clips");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              placeholder="Ej: 2ª parte vs Covadonga"
              {...register("titulo")}
            />
            {errors.titulo && (
              <p className="text-sm text-destructive">
                {errors.titulo.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">Enlace (YouTube, Drive...)</Label>
            <Input
              id="url"
              placeholder="https://..."
              {...register("url")}
            />
            {errors.url && (
              <p className="text-sm text-destructive">{errors.url.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Controller
                control={control}
                name="tipo"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="tipo" className="w-full">
                      <SelectValue>
                        {(value) => TIPO_LABEL[value as string] ?? value}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="partido">Partido completo</SelectItem>
                      <SelectItem value="clip">Clip</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha</Label>
              <Input id="fecha" type="date" {...register("fecha")} />
              {errors.fecha && (
                <p className="text-sm text-destructive">
                  {errors.fecha.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="partido_id">Partido asociado (opcional)</Label>
            <Controller
              control={control}
              name="partido_id"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v ?? "");
                    setValue("evento_id", "");
                  }}
                >
                  <SelectTrigger id="partido_id" className="w-full">
                    <SelectValue placeholder="Sin partido asociado">
                      {(value) => {
                        if (!value) return "Sin partido asociado";
                        const p = partidosPorId.get(value as string);
                        return p ? `vs ${p.rival} (${p.fecha})` : "Sin partido asociado";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {partidos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        vs {p.rival} ({p.fecha})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {partidoIdSeleccionado && eventosOrdenados.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="evento_id">Evento del partido (opcional)</Label>
              <Controller
                control={control}
                name="evento_id"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v ?? "")}
                  >
                    <SelectTrigger id="evento_id" className="w-full">
                      <SelectValue placeholder="Sin evento asociado">
                        {(value) => {
                          const evento = eventosOrdenados.find((e) => e.id === value);
                          return evento ? etiquetaEvento(evento) : "Sin evento asociado";
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {eventosOrdenados.map((evento) => (
                        <SelectItem key={evento.id} value={evento.id}>
                          {etiquetaEvento(evento)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-muted-foreground">
                Para enlazar directamente a ese momento del vídeo.
              </p>
            </div>
          )}

          {watch("evento_id") && (
            <div className="space-y-2">
              <Label htmlFor="segundo_inicio">
                Segundo del vídeo en el que ocurre (opcional)
              </Label>
              <Input
                id="segundo_inicio"
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="Ej: 125"
                {...register("segundo_inicio")}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notas">Notas (opcional)</Label>
            <Textarea id="notas" rows={2} {...register("notas")} />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={enviando} className="w-full">
        {enviando ? "Guardando..." : "Guardar vídeo"}
      </Button>
    </form>
  );
}
