"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { VideoCard } from "@/components/videos/video-card";

export default function VideoClipPage() {
  const { id } = useParams<{ id: string }>();

  const video = useLiveQuery(async () => (await localDb.videos.get(id)) ?? null, [id]);
  const partido = useLiveQuery(
    async () => (video?.partido_id ? (await localDb.partidos.get(video.partido_id)) ?? null : null),
    [video?.partido_id],
  );

  if (video === undefined) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  if (video === null) {
    return <p className="text-sm text-muted-foreground">Clip no encontrado.</p>;
  }

  return (
    <div className="space-y-4">
      <Link
        href="/videos/clips"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Clips
      </Link>

      <VideoCard video={video} rivalAsociado={partido?.rival} />
    </div>
  );
}
