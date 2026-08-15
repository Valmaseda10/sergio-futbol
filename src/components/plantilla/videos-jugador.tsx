"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/local-db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VideoCard } from "@/components/videos/video-card";

export function VideosJugador({ jugadorId }: { jugadorId: string }) {
  const eventos = useLiveQuery(
    () =>
      localDb.eventos_partido.where("jugador_id").equals(jugadorId).toArray(),
    [jugadorId],
    [],
  );
  const eventoIds = useMemo(() => new Set(eventos.map((e) => e.id)), [eventos]);

  const videos = useLiveQuery(
    () =>
      localDb.videos
        .filter((v) => v.evento_id != null && eventoIds.has(v.evento_id))
        .toArray(),
    [eventoIds],
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

  if (ordenados.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Vídeos destacados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {ordenados.map((v) => (
          <VideoCard
            key={v.id}
            video={v}
            rivalAsociado={
              v.partido_id ? rivalPorPartido.get(v.partido_id) : undefined
            }
          />
        ))}
      </CardContent>
    </Card>
  );
}
