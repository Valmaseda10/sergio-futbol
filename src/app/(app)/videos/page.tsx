"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { Button } from "@/components/ui/button";
import { VideoCard } from "@/components/videos/video-card";

export default function VideosPage() {
  const videos = useLiveQuery(() => localDb.videos.toArray(), [], []);
  const partidos = useLiveQuery(() => localDb.partidos.toArray(), [], []);

  const rivalPorPartido = useMemo(
    () => new Map(partidos.map((p) => [p.id, p.rival])),
    [partidos],
  );

  const ordenados = useMemo(
    () => videos.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [videos],
  );
  const dePartidos = ordenados.filter((v) => v.tipo === "partido");
  const clips = ordenados.filter((v) => v.tipo === "clip");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Vídeos</h1>
        <Button size="sm" nativeButton={false} render={<Link href="/videos/nuevo" />}>
          <Plus className="size-4" />
          Nuevo
        </Button>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Partidos
        </h2>
        {dePartidos.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Todavía no hay vídeos de partidos.
          </p>
        ) : (
          <div className="space-y-3">
            {dePartidos.map((v) => (
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
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Clips</h2>
        {clips.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Todavía no hay clips.
          </p>
        ) : (
          <div className="space-y-3">
            {clips.map((v) => (
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
      </section>
    </div>
  );
}
