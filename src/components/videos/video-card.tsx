"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Trash2 } from "lucide-react";
import { eliminarVideoLocal } from "@/app/(app)/videos/local-actions";
import { getYoutubeEmbedUrl } from "@/lib/youtube";
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
  fecha: string;
  notas: string | null;
}

export function VideoCard({
  video,
  rivalAsociado,
}: {
  video: VideoCardData;
  rivalAsociado?: string;
}) {
  const [borrando, setBorrando] = useState(false);
  const embedUrl = getYoutubeEmbedUrl(video.url);

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
        </div>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
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
                Solo se borra la referencia de la app; el vídeo original no se
                toca. Esta acción no se puede deshacer.
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

      {embedUrl ? (
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
