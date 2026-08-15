"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, Plus } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { Button } from "@/components/ui/button";
import { VideoCard } from "@/components/videos/video-card";

export default function VideosPartidosPage() {
  const videos = useLiveQuery(
    () => localDb.videos.where("tipo").equals("partido").toArray(),
    [],
    [],
  );
  const partidos = useLiveQuery(() => localDb.partidos.toArray(), [], []);

  const rivalPorPartido = useMemo(
    () => new Map(partidos.map((p) => [p.id, p.rival])),
    [partidos],
  );

  const ordenados = useMemo(
    () => videos.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [videos],
  );

  return (
    <div className="space-y-4">
      <Link
        href="/videos"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Vídeos
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Partidos</h1>
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href="/videos/nuevo?tipo=partido" />}
        >
          <Plus className="size-4" />
          Nuevo
        </Button>
      </div>

      {ordenados.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Todavía no hay vídeos de partidos.
        </p>
      ) : (
        <div className="space-y-3">
          {ordenados.map((v) => (
            <VideoCard
              key={v.id}
              video={v}
              rivalAsociado={
                v.partido_id ? rivalPorPartido.get(v.partido_id) : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
