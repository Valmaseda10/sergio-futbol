"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { cargarYoutubeIframeApi } from "@/lib/youtube-player";
import { formatearDuracion } from "@/lib/youtube";
import type { YTPlayerInstance } from "@/lib/types/youtube-iframe";

const VIGILANCIA_MS = 200;
const MARGEN_INICIO_SEG = 0.4;

export function ClipPlayer({
  videoId,
  inicio,
  fin,
  autoplay,
  onFin,
}: {
  videoId: string;
  inicio: number;
  fin: number;
  autoplay?: boolean;
  onFin?: () => void;
}) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const vigilanciaRef = useRef<number | null>(null);
  const barraRef = useRef<HTMLDivElement>(null);

  const [listo, setListo] = useState(false);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [progreso, setProgreso] = useState(0);

  const duracion = Math.max(0.1, fin - inicio);

  useEffect(() => {
    let cancelado = false;

    cargarYoutubeIframeApi().then(() => {
      if (cancelado || !contenedorRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player(contenedorRef.current, {
        videoId,
        playerVars: {
          start: Math.floor(inicio),
          end: Math.ceil(fin),
          autoplay: autoplay ? 1 : 0,
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady: () => setListo(true),
          onStateChange: (e) => {
            const enReproduccion = e.data === 1;
            setReproduciendo(enReproduccion);
            if (enReproduccion) iniciarVigilancia();
            else detenerVigilancia();
          },
        },
      });
    });

    function iniciarVigilancia() {
      detenerVigilancia();
      vigilanciaRef.current = window.setInterval(() => {
        const player = playerRef.current;
        if (!player) return;
        const t = player.getCurrentTime();
        if (t < inicio - MARGEN_INICIO_SEG) {
          player.seekTo(inicio, true);
        } else if (t >= fin) {
          player.pauseVideo();
          player.seekTo(inicio, true);
          setProgreso(0);
          onFin?.();
        } else {
          setProgreso(Math.min(1, (t - inicio) / duracion));
        }
      }, VIGILANCIA_MS);
    }

    function detenerVigilancia() {
      if (vigilanciaRef.current != null) {
        window.clearInterval(vigilanciaRef.current);
        vigilanciaRef.current = null;
      }
    }

    return () => {
      cancelado = true;
      detenerVigilancia();
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  function alternarReproduccion() {
    const player = playerRef.current;
    if (!player) return;
    if (reproduciendo) {
      player.pauseVideo();
    } else {
      if (progreso >= 1) player.seekTo(inicio, true);
      player.playVideo();
    }
  }

  function buscarEnBarra(e: React.MouseEvent<HTMLDivElement>) {
    const barra = barraRef.current;
    const player = playerRef.current;
    if (!barra || !player) return;
    const rect = barra.getBoundingClientRect();
    const fraccion = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    player.seekTo(inicio + fraccion * duracion, true);
    setProgreso(fraccion);
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-md bg-black">
      <div ref={contenedorRef} className="pointer-events-none size-full" />

      <button
        type="button"
        aria-label={reproduciendo ? "Pausar" : "Reproducir"}
        onClick={alternarReproduccion}
        className="absolute inset-0 flex items-center justify-center"
      >
        {!reproduciendo && (
          <span className="flex size-14 items-center justify-center rounded-full bg-black/60 text-white">
            <Play className="size-6 translate-x-0.5" fill="currentColor" />
          </span>
        )}
      </button>

      {listo && (
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
          <button
            type="button"
            aria-label={reproduciendo ? "Pausar" : "Reproducir"}
            onClick={alternarReproduccion}
            className="shrink-0 text-white"
          >
            {reproduciendo ? (
              <Pause className="size-4" fill="currentColor" />
            ) : (
              <Play className="size-4 translate-x-0.5" fill="currentColor" />
            )}
          </button>
          <div
            ref={barraRef}
            onClick={buscarEnBarra}
            className="h-1.5 flex-1 cursor-pointer rounded-full bg-white/30"
          >
            <div
              className="h-full rounded-full bg-white"
              style={{ width: `${progreso * 100}%` }}
            />
          </div>
          <span className="shrink-0 text-[11px] tabular-nums text-white">
            {formatearDuracion(progreso * duracion)} / {formatearDuracion(duracion)}
          </span>
        </div>
      )}
    </div>
  );
}
