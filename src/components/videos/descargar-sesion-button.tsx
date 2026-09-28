"use client";

// Une los clips subidos como archivo (no los de YouTube, que no se pueden
// descargar) en un único .mp4 usando ffmpeg.wasm en el propio navegador —
// así se puede guardar en el iPad antes de ir a la charla y reproducirlo
// sin depender de la conexión del hotspot al presentarlo.

import { useState } from "react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { ClipDeSesion } from "@/components/videos/sesion-player";

function slugArchivo(titulo: string) {
  return (
    titulo
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "sesion"
  );
}

function extensionDePath(path: string) {
  const ext = path.split(".").pop();
  return ext && ext.length <= 5 ? ext.toLowerCase() : "mp4";
}

export function DescargarSesionButton({
  clips,
  tituloSesion,
}: {
  clips: ClipDeSesion[];
  tituloSesion: string;
}) {
  const [procesando, setProcesando] = useState(false);
  const [estado, setEstado] = useState("");

  const clipsArchivo = clips.filter(
    (c): c is Extract<ClipDeSesion, { origen: "archivo" }> => c.origen === "archivo",
  );
  const clipsYoutube = clips.filter((c) => c.origen === "youtube");

  async function handleDescargar() {
    if (clipsArchivo.length === 0) {
      toast.error("Esta sesión no tiene clips subidos como archivo para unir.");
      return;
    }

    if (clipsYoutube.length > 0) {
      toast.info(
        `Se unirán ${clipsArchivo.length} de ${clips.length} clips. Los ${clipsYoutube.length} de YouTube no se pueden descargar y se quedan fuera.`,
      );
    }

    setProcesando(true);
    setEstado("Preparando...");

    try {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { fetchFile, toBlobURL } = await import("@ffmpeg/util");

      const ffmpeg = new FFmpeg();
      ffmpeg.on("progress", ({ progress }) => {
        if (progress >= 0 && progress <= 1) {
          setEstado(`Uniendo clips... ${Math.round(progress * 100)}%`);
        }
      });

      setEstado("Cargando motor de vídeo...");
      const base = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
      });

      const supabase = createClient();
      const nombresEntrada: string[] = [];

      for (let i = 0; i < clipsArchivo.length; i++) {
        const clip = clipsArchivo[i];
        setEstado(`Descargando clip ${i + 1} de ${clipsArchivo.length}...`);

        const { data, error } = await supabase.storage
          .from("adjuntos")
          .createSignedUrl(clip.storagePath, 3600);
        if (error || !data) {
          throw new Error(`No se ha podido acceder a "${clip.titulo}"`);
        }

        const nombre = `clip${i}.${extensionDePath(clip.storagePath)}`;
        await ffmpeg.writeFile(nombre, await fetchFile(data.signedUrl));
        nombresEntrada.push(nombre);
      }

      setEstado("Uniendo clips...");
      const n = nombresEntrada.length;
      const args: string[] = [];
      nombresEntrada.forEach((nombre) => {
        args.push("-i", nombre);
      });
      const filtro = nombresEntrada.map((_, i) => `[${i}:v:0][${i}:a:0]`).join("");
      args.push(
        "-filter_complex",
        `${filtro}concat=n=${n}:v=1:a=1[outv][outa]`,
        "-map",
        "[outv]",
        "-map",
        "[outa]",
        "output.mp4",
      );
      await ffmpeg.exec(args);

      setEstado("Preparando descarga...");
      const salida = await ffmpeg.readFile("output.mp4");
      const datos =
        typeof salida === "string" ? new TextEncoder().encode(salida) : salida;
      const blob = new Blob([Uint8Array.from(datos)], { type: "video/mp4" });
      const nombreArchivo = `${slugArchivo(tituloSesion)}.mp4`;
      const url = URL.createObjectURL(blob);

      const archivo = new File([blob], nombreArchivo, { type: "video/mp4" });
      if (navigator.canShare?.({ files: [archivo] })) {
        await navigator.share({ files: [archivo], title: tituloSesion });
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = nombreArchivo;
        a.click();
      }
      URL.revokeObjectURL(url);

      toast.success("Vídeo listo");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "No se ha podido unir el vídeo",
      );
    } finally {
      setProcesando(false);
      setEstado("");
    }
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={procesando || clipsArchivo.length === 0}
        onClick={handleDescargar}
      >
        {procesando ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        {procesando ? estado || "Uniendo..." : "Descargar todo en un vídeo"}
      </Button>
      {clipsYoutube.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          {clipsYoutube.length} clip{clipsYoutube.length > 1 ? "s" : ""} de YouTube
          no se incluir{clipsYoutube.length > 1 ? "án" : "á"} (no se pueden descargar).
        </p>
      )}
    </div>
  );
}
