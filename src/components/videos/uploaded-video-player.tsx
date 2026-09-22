"use client";

// Reproductor para un clip subido como archivo propio (no YouTube): pide una
// URL firmada del bucket privado "adjuntos" y usa el <video> nativo.

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function UploadedVideoPlayer({
  storagePath,
  autoplay,
  onFin,
}: {
  storagePath: string;
  autoplay?: boolean;
  onFin?: () => void;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.onLine) return;
    const supabase = createClient();
    let cancelado = false;
    supabase.storage
      .from("adjuntos")
      .createSignedUrl(storagePath, 3600)
      .then(({ data }) => {
        if (!cancelado) setSignedUrl(data?.signedUrl ?? null);
      });
    return () => {
      cancelado = true;
    };
  }, [storagePath]);

  if (!signedUrl) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-md bg-black text-sm text-white/60">
        Cargando vídeo...
      </div>
    );
  }

  return (
    <video
      key={signedUrl}
      src={signedUrl}
      controls
      autoPlay={autoplay}
      onEnded={onFin}
      className="aspect-video w-full rounded-md bg-black"
    />
  );
}
