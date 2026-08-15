"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { ChevronLeft, Flag, RotateCcw, Scissors, SlidersHorizontal } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { getYoutubeVideoId, formatearDuracion } from "@/lib/youtube";
import { cargarYoutubeIframeApi } from "@/lib/youtube-player";
import { crearClipDesdeVideoLocal } from "@/app/(app)/videos/local-actions";
import { ClipPlayer } from "@/components/videos/clip-player";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import type { YTPlayerInstance } from "@/lib/types/youtube-iframe";

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
  const [ajusteManual, setAjusteManual] = useState(false);
  const [nombreClip, setNombreClip] = useState("");
  const [guardando, setGuardando] = useState(false);

  const youtubeId = video ? getYoutubeVideoId(video.url) : null;

  useEffect(() => {
    if (!youtubeId || !contenedorRef.current) return;

    let cancelado = false;
    cargarYoutubeIframeApi().then(() => {
      if (cancelado || !contenedorRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player(contenedorRef.current, {
        videoId: youtubeId,
        playerVars: { playsinline: 1 },
        events: { onReady: () => setPlayerListo(true) },
      });
    });

    return () => {
      cancelado = true;
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
    const t = Math.floor(playerRef.current.getCurrentTime());
    if (inicio != null && t <= inicio) {
      toast.error("El fin tiene que ser posterior al inicio");
      return;
    }
    setFin(t);
  }

  function volverAMarcar() {
    setInicio(null);
    setFin(null);
    setAjusteManual(false);
  }

  async function guardarClip() {
    if (!video || inicio == null || fin == null) return;
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

  const ambosMarcados = inicio != null && fin != null;

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

      {!ambosMarcados ? (
        <Card>
          <CardContent className="space-y-3 pt-6 text-center">
            {inicio == null ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Dale a reproducir arriba y pulsa el botón justo cuando
                  empiece la jugada que quieres guardar.
                </p>
                <Button
                  type="button"
                  size="lg"
                  className="w-full"
                  disabled={!playerListo}
                  onClick={marcarInicio}
                >
                  <Flag className="size-4" />
                  Marcar inicio aquí
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Inicio marcado en{" "}
                  <span className="font-medium text-foreground">
                    {formatearDuracion(inicio)}
                  </span>
                  . Sigue viendo el vídeo y pulsa cuando acabe la jugada.
                </p>
                <Button
                  type="button"
                  size="lg"
                  className="w-full"
                  disabled={!playerListo}
                  onClick={marcarFin}
                >
                  <Flag className="size-4" />
                  Marcar fin aquí
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={volverAMarcar}>
                  <RotateCcw className="size-3.5" />
                  Empezar de nuevo
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="space-y-3 pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm">
                  Clip de{" "}
                  <span className="font-medium">{formatearDuracion(inicio)}</span> a{" "}
                  <span className="font-medium">{formatearDuracion(fin)}</span>{" "}
                  <span className="text-muted-foreground">
                    ({formatearDuracion(fin - inicio)})
                  </span>
                </p>
                <Button type="button" variant="ghost" size="sm" onClick={volverAMarcar}>
                  <RotateCcw className="size-3.5" />
                  Rehacer
                </Button>
              </div>
              <ClipPlayer videoId={youtubeId} inicio={inicio} fin={fin} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="nombreClip">Nombre del clip</Label>
                <Input
                  id="nombreClip"
                  placeholder="Ej: Gol de Sergio en el 34'"
                  value={nombreClip}
                  onChange={(e) => setNombreClip(e.target.value)}
                  autoFocus
                />
              </div>

              {ajusteManual ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Inicio (segundos)</Label>
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={inicio}
                      onChange={(e) => setInicio(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fin (segundos)</Label>
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={fin}
                      onChange={(e) => setFin(Number(e.target.value))}
                    />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAjusteManual(true)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <SlidersHorizontal className="size-3.5" />
                  Ajustar segundos manualmente
                </button>
              )}
            </CardContent>
          </Card>

          <Button className="w-full" disabled={guardando} onClick={guardarClip}>
            <Scissors className="size-4" />
            {guardando ? "Guardando..." : "Guardar clip"}
          </Button>
        </>
      )}
    </div>
  );
}
