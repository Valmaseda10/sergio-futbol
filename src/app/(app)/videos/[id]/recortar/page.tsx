"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { ChevronLeft, Film, Flag, Pause, Play, Scissors, SlidersHorizontal } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { getYoutubeVideoId, formatearDuracion } from "@/lib/youtube";
import { cargarYoutubeIframeApi } from "@/lib/youtube-player";
import { crearClipDesdeVideoLocal, guardarSesionLocal } from "@/app/(app)/videos/local-actions";
import { RecorteTimeline } from "@/components/videos/recorte-timeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { YTPlayerInstance } from "@/lib/types/youtube-iframe";

const SESION_NUEVA = "__nueva__";

const DURACION_INICIAL = 10;
const SONDEO_MS = 200;

export default function RecortarClipPage() {
  const { id } = useParams<{ id: string }>();

  const video = useLiveQuery(
    async () => (await localDb.videos.get(id)) ?? null,
    [id],
  );

  const contenedorRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const previsualizacionRef = useRef<number | null>(null);
  const nombreInputRef = useRef<HTMLInputElement>(null);
  const [playerListo, setPlayerListo] = useState(false);
  const [duracion, setDuracion] = useState(0);
  const [actual, setActual] = useState(0);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [previsualizando, setPrevisualizando] = useState(false);

  const [inicio, setInicio] = useState(0);
  const [fin, setFin] = useState(DURACION_INICIAL);
  const [ajusteManual, setAjusteManual] = useState(false);
  const [nombreClip, setNombreClip] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [clipsSesion, setClipsSesion] = useState<
    { id: string; titulo: string; inicio: number; fin: number }[]
  >([]);
  const [sesionElegidaId, setSesionElegidaId] = useState("");
  const [tituloNuevaSesion, setTituloNuevaSesion] = useState("");
  const [añadiendoASesion, setAñadiendoASesion] = useState(false);
  const [sesionDestinoId, setSesionDestinoId] = useState<string | null>(null);

  const sesiones = useLiveQuery(
    () =>
      localDb.videos_sesiones
        .toArray()
        .then((rows) => rows.sort((a, b) => b.created_at.localeCompare(a.created_at))),
    [],
    [],
  );

  const youtubeId = video ? getYoutubeVideoId(video.url) : null;

  useEffect(() => {
    if (!youtubeId || !contenedorRef.current) return;

    let cancelado = false;
    cargarYoutubeIframeApi().then(() => {
      if (cancelado || !contenedorRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player(contenedorRef.current, {
        videoId: youtubeId,
        playerVars: { playsinline: 1 },
        events: {
          onReady: () => {
            const d = playerRef.current?.getDuration() ?? 0;
            setDuracion(d);
            setFin(Math.min(DURACION_INICIAL, d || DURACION_INICIAL));
            setPlayerListo(true);
          },
          onStateChange: (e) => setReproduciendo(e.data === 1),
        },
      });
    });

    return () => {
      cancelado = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [youtubeId]);

  // Sondeo continuo del tiempo actual para mover la marca de reproducción
  // en la línea de tiempo, y para cortar la previsualización al llegar a fin.
  useEffect(() => {
    if (!playerListo) return;
    const intervalo = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const t = player.getCurrentTime();
      setActual(t);
      if (previsualizacionRef.current != null && t >= previsualizacionRef.current) {
        player.pauseVideo();
        previsualizacionRef.current = null;
        setPrevisualizando(false);
      }
    }, SONDEO_MS);
    return () => window.clearInterval(intervalo);
  }, [playerListo]);

  function buscar(segundos: number) {
    playerRef.current?.seekTo(segundos, true);
    setActual(segundos);
  }

  function alternarReproduccion() {
    const player = playerRef.current;
    if (!player) return;
    if (reproduciendo) {
      player.pauseVideo();
      previsualizacionRef.current = null;
      setPrevisualizando(false);
    } else {
      player.playVideo();
    }
  }

  function previsualizarClip() {
    const player = playerRef.current;
    if (!player) return;
    previsualizacionRef.current = fin;
    setPrevisualizando(true);
    player.seekTo(inicio, true);
    player.playVideo();
  }

  function cambiarInicio(segundos: number) {
    setInicio(Math.max(0, Math.round(segundos)));
  }
  function cambiarFin(segundos: number) {
    setFin(Math.min(duracion || segundos, Math.round(segundos)));
  }

  function marcarInicioAqui() {
    cambiarInicio(actual);
  }

  function marcarFinAqui() {
    cambiarFin(actual);
    nombreInputRef.current?.focus();
  }

  async function guardarClip() {
    if (!video) return;
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
    setClipsSesion((prev) => [
      ...prev,
      { id: result.id, titulo: nombreClip.trim(), inicio, fin },
    ]);

    // Deja preparada la siguiente ventana a partir de donde vas, para
    // encadenar varios clips del mismo vídeo sin salir de la página.
    const siguienteInicio = fin;
    const siguienteFin = Math.min(duracion || siguienteInicio + DURACION_INICIAL, siguienteInicio + DURACION_INICIAL);
    setInicio(siguienteInicio);
    setFin(siguienteFin);
    setNombreClip("");
  }

  async function añadirASesion() {
    if (clipsSesion.length === 0) return;
    const nuevosIds = clipsSesion.map((c) => c.id);

    setAñadiendoASesion(true);

    let result;
    if (sesionElegidaId === SESION_NUEVA) {
      if (!tituloNuevaSesion.trim()) {
        toast.error("Ponle un título a la sesión");
        setAñadiendoASesion(false);
        return;
      }
      result = await guardarSesionLocal({
        titulo: tituloNuevaSesion.trim(),
        notas: null,
        clipIds: nuevosIds,
      });
    } else {
      const sesion = await localDb.videos_sesiones.get(sesionElegidaId);
      const existentes = await localDb.videos_sesion_clips
        .where("sesion_id")
        .equals(sesionElegidaId)
        .sortBy("orden");
      if (!sesion) {
        toast.error("No se encuentra la sesión");
        setAñadiendoASesion(false);
        return;
      }
      result = await guardarSesionLocal({
        id: sesionElegidaId,
        titulo: sesion.titulo,
        notas: sesion.notas,
        clipIds: [...existentes.map((c) => c.video_id), ...nuevosIds],
      });
    }

    setAñadiendoASesion(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Clips añadidos a la sesión");
    setSesionDestinoId(result.id);
    setClipsSesion([]);
    setSesionElegidaId("");
    setTituloNuevaSesion("");
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

      <div className="mx-auto aspect-video w-full max-w-4xl overflow-hidden rounded-md bg-black">
        <div ref={contenedorRef} className="size-full" />
      </div>

      <div className="mx-auto w-full max-w-4xl space-y-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={!playerListo}
            onClick={alternarReproduccion}
            aria-label={reproduciendo ? "Pausar" : "Reproducir"}
          >
            {reproduciendo ? (
              <Pause className="size-4" fill="currentColor" />
            ) : (
              <Play className="size-4 translate-x-0.5" fill="currentColor" />
            )}
          </Button>
          <span className="font-heading text-sm tabular-nums text-muted-foreground">
            {formatearDuracion(actual)} / {formatearDuracion(duracion)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={!playerListo}
            onClick={marcarInicioAqui}
          >
            <Flag className="size-4" />
            Iniciar clip aquí
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!playerListo}
            onClick={marcarFinAqui}
          >
            <Flag className="size-4" />
            Finalizar clip aquí
          </Button>
        </div>

        {playerListo && duracion > 0 && (
          <RecorteTimeline
            duracion={duracion}
            inicio={inicio}
            fin={fin}
            actual={actual}
            onCambiarInicio={cambiarInicio}
            onCambiarFin={cambiarFin}
            onBuscar={buscar}
          />
        )}

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm">
                Clip de{" "}
                <span className="font-medium">{formatearDuracion(inicio)}</span> a{" "}
                <span className="font-medium">{formatearDuracion(fin)}</span>{" "}
                <span className="text-muted-foreground">
                  ({formatearDuracion(fin - inicio)})
                </span>
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!playerListo}
                onClick={previsualizarClip}
              >
                <Play className="size-3.5" />
                {previsualizando ? "Previsualizando..." : "Previsualizar clip"}
              </Button>
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
                    onChange={(e) => cambiarInicio(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fin (segundos)</Label>
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={fin}
                    onChange={(e) => cambiarFin(Number(e.target.value))}
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

            <div className="space-y-2">
              <Label htmlFor="nombreClip">Nombre del clip</Label>
              <Input
                id="nombreClip"
                ref={nombreInputRef}
                placeholder="Ej: Gol de Sergio en el 34'"
                value={nombreClip}
                onChange={(e) => setNombreClip(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Button className="w-full" disabled={guardando} onClick={guardarClip}>
          <Scissors className="size-4" />
          {guardando ? "Guardando..." : "Guardar clip"}
        </Button>

        {clipsSesion.length > 0 && (
          <Card>
            <CardContent className="space-y-3 pt-6">
              <p className="text-sm font-medium">
                Clips guardados ahora ({clipsSesion.length})
              </p>
              <ul className="space-y-1">
                {clipsSesion.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between text-sm text-muted-foreground"
                  >
                    <span className="truncate">{c.titulo}</span>
                    <span className="shrink-0 tabular-nums">
                      {formatearDuracion(c.inicio)}-{formatearDuracion(c.fin)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="space-y-2 border-t pt-3">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Film className="size-4" />
                  Unir en una sesión
                </p>
                <p className="text-xs text-muted-foreground">
                  Una sesión reproduce estos clips seguidos, uno detrás de
                  otro, como si fuera un único vídeo.
                </p>
                <Select value={sesionElegidaId} onValueChange={(v) => setSesionElegidaId(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Elige una sesión">
                      {(value) => {
                        if (value === SESION_NUEVA) return "+ Nueva sesión";
                        const s = sesiones.find((s) => s.id === value);
                        return s ? s.titulo : "Elige una sesión";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SESION_NUEVA}>+ Nueva sesión</SelectItem>
                    {sesiones.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {sesionElegidaId === SESION_NUEVA && (
                  <Input
                    placeholder="Título de la sesión"
                    value={tituloNuevaSesion}
                    onChange={(e) => setTituloNuevaSesion(e.target.value)}
                  />
                )}
                <Button
                  type="button"
                  className="w-full"
                  disabled={!sesionElegidaId || añadiendoASesion}
                  onClick={añadirASesion}
                >
                  {añadiendoASesion ? "Añadiendo..." : "Añadir a la sesión"}
                </Button>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                nativeButton={false}
                render={<Link href="/videos/clips" />}
              >
                Ir a mis clips
              </Button>
            </CardContent>
          </Card>
        )}

        {sesionDestinoId && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            nativeButton={false}
            render={<Link href={`/videos/sesiones/${sesionDestinoId}`} />}
          >
            <Film className="size-4" />
            Ver sesión
          </Button>
        )}
      </div>
    </div>
  );
}
