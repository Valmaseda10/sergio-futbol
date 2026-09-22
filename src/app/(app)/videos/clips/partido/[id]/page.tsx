"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { ClipList } from "@/components/videos/clip-list";

export default function ClipsDePartidoPage() {
  const { id } = useParams<{ id: string }>();

  const partido = useLiveQuery(async () => (await localDb.partidos.get(id)) ?? null, [id]);
  const videos = useLiveQuery(
    () => localDb.videos.where("partido_id").equals(id).toArray(),
    [id],
    [],
  );

  const clips = useMemo(
    () =>
      videos
        .filter((v) => v.tipo === "clip")
        .slice()
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [videos],
  );

  return (
    <div className="space-y-4">
      <Link
        href="/videos/clips"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Clips
      </Link>

      <h1 className="text-2xl font-semibold">
        {partido ? `vs ${partido.rival}` : "Clips del partido"}
      </h1>

      <ClipList clips={clips} emptyMessage="No hay clips de este partido." />
    </div>
  );
}
