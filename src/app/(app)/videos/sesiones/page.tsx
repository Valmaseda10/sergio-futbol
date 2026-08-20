"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { Button } from "@/components/ui/button";

export default function VideosSesionesPage() {
  const sesiones = useLiveQuery(
    () =>
      localDb.videos_sesiones
        .toArray()
        .then((rows) => rows.sort((a, b) => b.created_at.localeCompare(a.created_at))),
    [],
    [],
  );
  const clipsPorSesion = useLiveQuery(
    () => localDb.videos_sesion_clips.toArray(),
    [],
    [],
  );

  function totalClips(sesionId: string) {
    return clipsPorSesion.filter((c) => c.sesion_id === sesionId).length;
  }

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
        <h1 className="text-2xl font-semibold">Sesiones</h1>
        <Button size="sm" nativeButton={false} render={<Link href="/videos/sesiones/nueva" />}>
          <Plus className="size-4" />
          Nueva
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Varios clips guardados, reproducidos seguidos, para enseñárselos a
        los jugadores de un tirón.
      </p>

      {sesiones.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Todavía no hay ninguna sesión.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {sesiones.map((s) => (
            <li key={s.id}>
              <Link
                href={`/videos/sesiones/${s.id}`}
                className="flex items-center gap-3 p-3 hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {totalClips(s.id)} clip{totalClips(s.id) === 1 ? "" : "s"}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
