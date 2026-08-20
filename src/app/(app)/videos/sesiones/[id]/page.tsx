"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { ChevronLeft, Trash2 } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { eliminarSesionLocal } from "@/app/(app)/videos/local-actions";
import { getYoutubeVideoId } from "@/lib/youtube";
import { SesionPlayer, type ClipDeSesion } from "@/components/videos/sesion-player";
import { SesionForm } from "@/components/videos/sesion-form";
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

export default function VerSesionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [borrando, setBorrando] = useState(false);
  const [editando, setEditando] = useState(false);

  const sesion = useLiveQuery(async () => (await localDb.videos_sesiones.get(id)) ?? null, [id]);
  const filas = useLiveQuery(
    () =>
      localDb.videos_sesion_clips
        .where("sesion_id")
        .equals(id)
        .toArray()
        .then((rows) => rows.sort((a, b) => a.orden - b.orden)),
    [id],
    [],
  );
  const todosLosClips = useLiveQuery(
    () =>
      localDb.videos
        .where("tipo")
        .equals("clip")
        .toArray()
        .then((rows) =>
          rows
            .sort((a, b) => b.fecha.localeCompare(a.fecha))
            .map((v) => ({ id: v.id, titulo: v.titulo, fecha: v.fecha })),
        ),
    [],
    [],
  );
  const videosPorId = useLiveQuery(() => localDb.videos.toArray(), [], []);
  const videosMap = useMemo(() => new Map(videosPorId.map((v) => [v.id, v])), [videosPorId]);

  const clips: ClipDeSesion[] = useMemo(
    () =>
      filas
        .map((f) => {
          const v = videosMap.get(f.video_id);
          if (!v || v.segundo_inicio == null || v.segundo_fin == null) return null;
          const youtubeId = getYoutubeVideoId(v.url);
          if (!youtubeId) return null;
          return {
            id: v.id,
            titulo: v.titulo,
            youtubeId,
            inicio: v.segundo_inicio,
            fin: v.segundo_fin,
          };
        })
        .filter((c): c is ClipDeSesion => !!c),
    [filas, videosMap],
  );

  async function handleEliminar() {
    setBorrando(true);
    const result = await eliminarSesionLocal(id);
    setBorrando(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Sesión eliminada");
    router.push("/videos/sesiones");
  }

  if (sesion === undefined) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  if (sesion === null) {
    return <p className="text-sm text-muted-foreground">Sesión no encontrada.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href="/videos/sesiones"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Sesiones
        </Link>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button variant="ghost" size="icon-sm" disabled={borrando} aria-label="Eliminar sesión" />
            }
          >
            <Trash2 className="size-4 text-destructive" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar &quot;{sesion.titulo}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleEliminar}>Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="flex items-center justify-between gap-2">
        <h1 className="min-w-0 truncate text-2xl font-semibold">{sesion.titulo}</h1>
        <Button variant="outline" size="sm" onClick={() => setEditando((v) => !v)}>
          {editando ? "Ver sesión" : "Editar"}
        </Button>
      </div>
      {sesion.notas && <p className="text-sm text-muted-foreground">{sesion.notas}</p>}

      {editando ? (
        <SesionForm
          clips={todosLosClips}
          inicial={{ id: sesion.id, titulo: sesion.titulo, notas: sesion.notas, clipIds: filas.map((f) => f.video_id) }}
        />
      ) : clips.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Esta sesión no tiene clips reproducibles.
        </p>
      ) : (
        <SesionPlayer clips={clips} />
      )}
    </div>
  );
}
