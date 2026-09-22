"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { ClipList } from "@/components/videos/clip-list";

export default function ClipsSinPartidoPage() {
  const videos = useLiveQuery(
    () => localDb.videos.where("tipo").equals("clip").toArray(),
    [],
    [],
  );

  const clips = useMemo(
    () =>
      videos
        .filter((v) => !v.partido_id)
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

      <h1 className="text-2xl font-semibold">Sin partido asociado</h1>

      <ClipList clips={clips} emptyMessage="No hay clips sin partido asociado." />
    </div>
  );
}
