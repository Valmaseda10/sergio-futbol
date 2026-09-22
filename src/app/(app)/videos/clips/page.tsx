"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ChevronRight, Folder, Plus } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { Button } from "@/components/ui/button";

export default function VideosClipsPage() {
  const videos = useLiveQuery(
    () => localDb.videos.where("tipo").equals("clip").toArray(),
    [],
    [],
  );
  const partidos = useLiveQuery(() => localDb.partidos.toArray(), [], []);

  const partidosPorId = useMemo(
    () => new Map(partidos.map((p) => [p.id, p])),
    [partidos],
  );

  const { carpetas, sinPartido } = useMemo(() => {
    const porPartido = new Map<string, number>();
    let sinPartido = 0;
    for (const v of videos) {
      if (v.partido_id) {
        porPartido.set(v.partido_id, (porPartido.get(v.partido_id) ?? 0) + 1);
      } else {
        sinPartido++;
      }
    }
    const carpetas = Array.from(porPartido.entries())
      .map(([partidoId, count]) => {
        const p = partidosPorId.get(partidoId);
        return {
          partidoId,
          rival: p?.rival ?? "Partido eliminado",
          fecha: p?.fecha ?? "",
          count,
        };
      })
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
    return { carpetas, sinPartido };
  }, [videos, partidosPorId]);

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
        <h1 className="text-2xl font-semibold">Clips</h1>
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href="/videos/nuevo?tipo=clip" />}
        >
          <Plus className="size-4" />
          Nuevo
        </Button>
      </div>

      {videos.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Todavía no hay clips. Puedes crear uno recortando un vídeo de
          partido, o añadirlo manualmente.
        </p>
      ) : (
        <div className="divide-y rounded-md border">
          {carpetas.map((c) => (
            <Link
              key={c.partidoId}
              href={`/videos/clips/partido/${c.partidoId}`}
              className="flex items-center gap-3 p-3 hover:bg-muted/50"
            >
              <Folder className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">vs {c.rival}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {c.fecha &&
                    `${new Date(`${c.fecha}T00:00:00`).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })} · `}
                  {c.count} {c.count === 1 ? "clip" : "clips"}
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
          {sinPartido > 0 && (
            <Link
              href="/videos/clips/sin-partido"
              className="flex items-center gap-3 p-3 hover:bg-muted/50"
            >
              <Folder className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  Sin partido asociado
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {sinPartido} {sinPartido === 1 ? "clip" : "clips"}
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
