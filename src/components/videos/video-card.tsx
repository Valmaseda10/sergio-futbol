"use client";

import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { ExternalLink, Trash2, Clapperboard, Scissors, Share2 } from "lucide-react";
import { eliminarVideoLocal } from "@/app/(app)/videos/local-actions";
import { getYoutubeEmbedUrl, getYoutubeVideoId, getYoutubeShareUrl } from "@/lib/youtube";
import { ClipPlayer } from "@/components/videos/clip-player";
import { localDb } from "@/lib/db/local-db";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface VideoCardData {
  id: string;
  titulo: string;
  url: string;
  tipo: string;
  fecha: string;
  notas: string | null;
  evento_id: string | null;
  segundo_inicio: number | null;
  segundo_fin: number | null;
}

const TIPO_EVENTO_LABEL: Record<string, string> = {
  gol: "Gol",
  autogol: "Autogol",
  asistencia: "Asistencia",
  tarjeta_amarilla: "Tarjeta amarilla",
  tarjeta_roja: "Tarjeta roja",
  cambio_entra: "Entra al campo",
  cambio_sale: "Sale del campo",
};

export function VideoCard({
  video,
  rivalAsociado,
}: {
  video: VideoCardData;
  rivalAsociado?: string;
}) {
  const [borrando, setBorrando] = useState(false);
  const youtubeId = getYoutubeVideoId(video.url);
  const esYoutube = youtubeId != null;
  const esClipAcotado =
    video.tipo === "clip" && video.segundo_inicio != null && video.segundo_fin != null;
  const embedUrl = esClipAcotado
    ? null
    : getYoutubeEmbedUrl(video.url, video.segundo_inicio, video.segundo_fin);

  const evento = useLiveQuery(
    async () =>
      video.evento_id ? (await localDb.eventos_partido.get(video.evento_id)) ?? null : null,
    [video.evento_id],
    null,
  );
  const jugador = useLiveQuery(
    async () =>
      evento?.jugador_id ? (await localDb.jugadores.get(evento.jugador_id)) ?? null : null,
    [evento?.jugador_id],
    null,
  );

  const etiquetaEvento = evento
    ? `${evento.minuto != null ? `${evento.minuto}' — ` : ""}${TIPO_EVENTO_LABEL[evento.tipo] ?? evento.tipo}${
        jugador ? ` (${jugador.alias || `${jugador.nombre} ${jugador.apellidos}`})` : evento.tipo === "gol" ? " (Rival)" : ""
      }`
    : null;

  async function handleCompartir() {
    const enlace = getYoutubeShareUrl(video.url, video.segundo_inicio);
    if (!enlace) return;

    if (navigator.share) {
      try {
        await navigator.share({ title: video.titulo, url: enlace });
      } catch {
        // El usuario ha cancelado el share sheet: no es un error.
      }
      return;
    }

    await navigator.clipboard.writeText(enlace);
    toast.success("Enlace copiado");
  }

  async function handleDelete() {
    setBorrando(true);
    const result = await eliminarVideoLocal(video.id);
    setBorrando(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Vídeo eliminado");
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{video.titulo}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(`${video.fecha}T00:00:00`).toLocaleDateString("es-ES", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
            {rivalAsociado ? ` · vs ${rivalAsociado}` : ""}
          </p>
          {etiquetaEvento && (
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-gold">
              <Clapperboard className="size-3" />
              {etiquetaEvento}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {esYoutube && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Compartir enlace"
              onClick={handleCompartir}
            >
              <Share2 className="size-4" />
            </Button>
          )}
          {video.tipo === "partido" && esYoutube && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Recortar clip"
              nativeButton={false}
              render={<Link href={`/videos/${video.id}/recortar`} />}
            >
              <Scissors className="size-4" />
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={borrando}
                  aria-label="Eliminar vídeo"
                />
              }
            >
              <Trash2 className="size-4 text-destructive" />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar &quot;{video.titulo}&quot;?</AlertDialogTitle>
                <AlertDialogDescription>
                  Solo se borra la referencia de la app; el vídeo original no
                  se toca. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {esClipAcotado && youtubeId ? (
        <ClipPlayer
          videoId={youtubeId}
          inicio={video.segundo_inicio as number}
          fin={video.segundo_fin as number}
        />
      ) : embedUrl ? (
        <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
          <iframe
            src={embedUrl}
            title={video.titulo}
            className="size-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-primary underline underline-offset-4"
        >
          <ExternalLink className="size-3.5" />
          Ver vídeo
        </a>
      )}

      {video.notas && (
        <p className="text-sm whitespace-pre-wrap text-muted-foreground">
          {video.notas}
        </p>
      )}
    </div>
  );
}
