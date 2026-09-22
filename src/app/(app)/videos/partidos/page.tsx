"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { Button } from "@/components/ui/button";

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
        <div className="divide-y rounded-md border">
          {ordenados.map((v) => {
            const rival = v.partido_id ? rivalPorPartido.get(v.partido_id) : undefined;
            return (
              <Link
                key={v.id}
                href={v.partido_id ? `/partidos/${v.partido_id}/videos` : "/videos/partidos"}
                className="flex items-center gap-3 p-3 hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{v.titulo}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {new Date(`${v.fecha}T00:00:00`).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                    {rival ? ` · vs ${rival}` : ""}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
