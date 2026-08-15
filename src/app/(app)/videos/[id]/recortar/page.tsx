"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { ChevronLeft, Flag, Scissors } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { getYoutubeVideoId } from "@/lib/youtube";
import { crearClipDesdeVideoLocal } from "@/app/(app)/videos/local-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface YTPlayerInstance {
  getCurrentTime(): number;
  destroy(): void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: { onReady?: () => void };
        },
      ) => YTPlayerInstance;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function formatearSegundos(segundos: number) {
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function RecortarClipPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const video = useLiveQuery(
    async () => (await localDb.videos.get(id)) ?? null,
    [id],
  );

  const contenedorRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const [playerListo, setPlayerListo] = useState(false);

  const [inicio, setInicio] = useState<number | null>(null);
  const [fin, setFin] = useState<number | null>(null);
  const [nombreClip, setNombreClip] = useState("");
  const [guardando, setGuardando] = useState(false);

  const youtubeId = video ? getYoutubeVideoId(video.url) : null;

  useEffect(() => {
    if (!youtubeId || !contenedorRef.current) return;

    function crearPlayer() {
      if (!contenedorRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player(contenedorRef.current, {
        videoId: youtubeId!,
        playerVars: { playsinline: 1 },
        events: { onReady: () => setPlayerListo(true) },
      });
    }

    if (window.YT?.Player) {
      crearPlayer();
    } else {
      const previo = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previo?.();
        crearPlayer();
      };
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(script);
      }
    }

    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [youtubeId]);

  function marcarInicio() {
    if (!playerRef.current) return;
    setInicio(Math.floor(playerRef.current.getCurrentTime()));
  }

  function marcarFin() {
    if (!playerRef.current) return;
    setFin(Math.floor(playerRef.current.getCurrentTime()));
  }

  async function guardarClip() {
    if (!video) return;
    if (inicio == null || fin == null) {
      toast.error("Marca el inicio y el fin del clip");
      return;
    }
    if (fin <= inicio) {
      toast.error("El fin debe ser posterior al inicio");
      return;
    }
    if (!nombreClip.trim()) {
      toast.error("Ponle un nombre al clip");
      return;
    }

    setGuardando(true);
    const result = await crearClipDesdeVideoLocal({
      videoOrigenId: video.id,
      titulo: nombreClip.trim(),
      segundoInicio: inicio,
      segundoFin: fin,
    });
    setGuardando(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Clip guardado");
    router.push("/videos/clips");
  }

  if (video === undefined) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  if (video === null) {
    return <p className="text-sm text-muted-foreground">Vídeo no encontrado.</p>;
  }

  if (!youtubeId) {
    return (
      <div className="space-y-4">
        <Link
          href="/videos/partidos"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Volver
        </Link>
        <p className="text-sm text-muted-foreground">
          Esta herramienta de recorte solo funciona con vídeos de YouTube.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href="/videos/partidos"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">Recortar clip</h1>
        <p className="truncate text-sm text-muted-foreground">{video.titulo}</p>
      </div>

      <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
        <div ref={contenedorRef} className="size-full" />
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Inicio</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!playerListo}
                  onClick={marcarInicio}
                >
                  <Flag className="size-4" />
                  Marcar
                </Button>
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  className="w-20"
                  value={inicio ?? ""}
                  onChange={(e) =>
                    setInicio(e.target.value === "" ? null : Number(e.target.value))
                  }
                />
              </div>
              {inicio != null && (
                <p className="text-xs text-muted-foreground">
                  {formatearSegundos(inicio)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Fin</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!playerListo}
                  onClick={marcarFin}
                >
                  <Flag className="size-4" />
                  Marcar
                </Button>
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  className="w-20"
                  value={fin ?? ""}
                  onChange={(e) =>
                    setFin(e.target.value === "" ? null : Number(e.target.value))
                  }
                />
              </div>
              {fin != null && (
                <p className="text-xs text-muted-foreground">
                  {formatearSegundos(fin)}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nombreClip">Nombre del clip</Label>
            <Input
              id="nombreClip"
              placeholder="Ej: Gol de Sergio en el 34'"
              value={nombreClip}
              onChange={(e) => setNombreClip(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Button
        className="w-full"
        disabled={guardando}
        onClick={guardarClip}
      >
        <Scissors className="size-4" />
        {guardando ? "Guardando..." : "Guardar clip"}
      </Button>
    </div>
  );
}
