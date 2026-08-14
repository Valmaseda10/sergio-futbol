"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { Button } from "@/components/ui/button";
import { VideoCard } from "@/components/videos/video-card";

export default function VideosPartidoPage() {
  const { id } = useParams<{ id: string }>();

  const partido = useLiveQuery(
    async () => (await localDb.partidos.get(id)) ?? null,
    [id],
  );
  const videos = useLiveQuery(
    () => localDb.videos.where("partido_id").equals(id).toArray(),
    [id],
    [],
  );

  const ordenados = useMemo(
    () => videos.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [videos],
  );

  if (partido === undefined) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  if (partido === null) {
    return <p className="text-sm text-muted-foreground">Partido no encontrado.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold">Vídeos</h1>
          <p className="truncate text-sm text-muted-foreground">
            {partido.local_visitante === "local" ? "vs" : "@"} {partido.rival}
          </p>
        </div>
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href={`/videos/nuevo?partidoId=${partido.id}`} />}
        >
          <Plus className="size-4" />
          Nuevo
        </Button>
      </div>

      {ordenados.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Todavía no hay vídeos para este partido.
        </p>
      ) : (
        <div className="space-y-3">
          {ordenados.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      )}
    </div>
  );
}
