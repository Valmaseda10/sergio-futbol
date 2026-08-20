"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ClipPlayer } from "@/components/videos/clip-player";
import { Button } from "@/components/ui/button";

export interface ClipDeSesion {
  id: string;
  titulo: string;
  youtubeId: string;
  inicio: number;
  fin: number;
}

export function SesionPlayer({ clips }: { clips: ClipDeSesion[] }) {
  const [indice, setIndice] = useState(0);
  const clip = clips[indice];

  function siguiente() {
    setIndice((i) => Math.min(i + 1, clips.length - 1));
  }

  function anterior() {
    setIndice((i) => Math.max(i - 1, 0));
  }

  if (!clip) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="min-w-0 truncate text-sm font-medium">{clip.titulo}</p>
        <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {indice + 1} / {clips.length}
        </p>
      </div>

      <ClipPlayer
        key={clip.id}
        videoId={clip.youtubeId}
        inicio={clip.inicio}
        fin={clip.fin}
        autoplay={indice > 0}
        onFin={indice < clips.length - 1 ? siguiente : undefined}
      />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={indice === 0}
          onClick={anterior}
        >
          <ChevronLeft className="size-4" />
          Anterior
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={indice === clips.length - 1}
          onClick={siguiente}
        >
          Siguiente
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
