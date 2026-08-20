"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Film, Scissors, ListVideo, ChevronRight } from "lucide-react";
import { localDb } from "@/lib/db/local-db";

export default function VideosPage() {
  const videos = useLiveQuery(() => localDb.videos.toArray(), [], []);
  const totalPartidos = videos.filter((v) => v.tipo === "partido").length;
  const totalClips = videos.filter((v) => v.tipo === "clip").length;
  const totalSesiones = useLiveQuery(() => localDb.videos_sesiones.count(), [], 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Vídeos</h1>
      <p className="text-sm text-muted-foreground">
        Elige una categoría para ver sus vídeos.
      </p>

      <div className="space-y-3">
        <Link
          href="/videos/partidos"
          className="flex items-center gap-3 rounded-md border p-4 hover:bg-muted"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Film className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Partidos</p>
            <p className="text-sm text-muted-foreground">
              {totalPartidos === 0
                ? "Sin vídeos todavía"
                : `${totalPartidos} vídeo${totalPartidos === 1 ? "" : "s"}`}
            </p>
          </div>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
        </Link>

        <Link
          href="/videos/clips"
          className="flex items-center gap-3 rounded-md border p-4 hover:bg-muted"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Scissors className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Clips</p>
            <p className="text-sm text-muted-foreground">
              {totalClips === 0
                ? "Sin clips todavía"
                : `${totalClips} clip${totalClips === 1 ? "" : "s"}`}
            </p>
          </div>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
        </Link>

        <Link
          href="/videos/sesiones"
          className="flex items-center gap-3 rounded-md border p-4 hover:bg-muted"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ListVideo className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Sesiones</p>
            <p className="text-sm text-muted-foreground">
              {totalSesiones === 0
                ? "Sin sesiones todavía"
                : `${totalSesiones} sesión${totalSesiones === 1 ? "" : "es"}`}
            </p>
          </div>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
        </Link>
      </div>
    </div>
  );
}
