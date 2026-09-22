"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, Pencil } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { VideoCard } from "@/components/videos/video-card";
import { ClipEditForm } from "@/components/videos/clip-edit-form";
import { Button } from "@/components/ui/button";

export default function VideoClipPage() {
  const { id } = useParams<{ id: string }>();
  const [editando, setEditando] = useState(false);

  const video = useLiveQuery(async () => (await localDb.videos.get(id)) ?? null, [id]);
  const partido = useLiveQuery(
    async () => (video?.partido_id ? (await localDb.partidos.get(video.partido_id)) ?? null : null),
    [video?.partido_id],
  );
  const partidos = useLiveQuery(
    () =>
      localDb.partidos
        .toArray()
        .then((rows) =>
          rows
            .sort((a, b) => b.fecha.localeCompare(a.fecha))
            .map((p) => ({ id: p.id, rival: p.rival, fecha: p.fecha })),
        ),
    [],
    [],
  );

  if (video === undefined) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  if (video === null) {
    return <p className="text-sm text-muted-foreground">Clip no encontrado.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href="/videos/clips"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Clips
        </Link>
        {!editando && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Editar clip"
            onClick={() => setEditando(true)}
          >
            <Pencil className="size-4" />
          </Button>
        )}
      </div>

      {editando ? (
        <ClipEditForm
          video={video}
          partidos={partidos}
          onGuardado={() => setEditando(false)}
          onCancelar={() => setEditando(false)}
        />
      ) : (
        <VideoCard video={video} rivalAsociado={partido?.rival} />
      )}
    </div>
  );
}
