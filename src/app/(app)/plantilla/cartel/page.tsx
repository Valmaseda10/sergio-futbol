"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, Printer } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { createClient } from "@/lib/supabase/client";
import { posicionLabel } from "@/lib/posiciones";
import { temporadaCorta } from "@/lib/temporada";
import { useTemporadaSeleccionada } from "@/lib/hooks/use-temporada-seleccionada";
import { Button } from "@/components/ui/button";
import { JugadorAvatar } from "@/components/plantilla/jugador-avatar";
import { PdfWatermark } from "@/components/branding/pdf-watermark";

export default function CartelPlantillaPage() {
  const jugadores = useLiveQuery(
    () =>
      localDb.jugadores
        .filter((j) => j.activo)
        .toArray()
        .then((rows) =>
          rows.sort((a, b) => {
            if (a.dorsal == null && b.dorsal != null) return 1;
            if (a.dorsal != null && b.dorsal == null) return -1;
            if (a.dorsal != null && b.dorsal != null && a.dorsal !== b.dorsal) {
              return a.dorsal - b.dorsal;
            }
            return a.apellidos.localeCompare(b.apellidos);
          }),
        ),
    [],
    [],
  );

  const { temporada } = useTemporadaSeleccionada();
  const nombreApp = `Infantil B ${temporadaCorta(temporada)}`;

  const [fotoUrls, setFotoUrls] = useState<Record<string, string>>({});

  const rutasFoto = useMemo(
    () => jugadores.map((j) => j.foto_url).filter((v): v is string => !!v),
    [jugadores],
  );
  const rutasFotoKey = rutasFoto.join(",");

  useEffect(() => {
    if (rutasFoto.length === 0 || !navigator.onLine) return;
    const supabase = createClient();
    supabase.storage
      .from("jugadores")
      .createSignedUrls(rutasFoto, 3600)
      .then(({ data }) => {
        if (!data) return;
        setFotoUrls((prev) => {
          const next = { ...prev };
          for (const d of data) {
            if (d.signedUrl && d.path) next[d.path] = d.signedUrl;
          }
          return next;
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rutasFotoKey]);

  return (
    <div className="space-y-4">
      <PdfWatermark />
      <Link
        href="/plantilla"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground print:hidden"
      >
        <ChevronLeft className="size-4" />
        Plantilla
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{nombreApp}</h1>
          <p className="text-sm text-muted-foreground">
            Cultural y Deportiva Leonesa — {jugadores.length} jugadores
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="print:hidden"
          aria-label="Exportar a PDF"
          onClick={() => window.print()}
        >
          <Printer className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 print:grid-cols-4">
        {jugadores.map((j) => (
          <div
            key={j.id}
            className="flex flex-col items-center gap-2 rounded-md border p-3 text-center print:break-inside-avoid"
          >
            <JugadorAvatar
              src={j.foto_url ? fotoUrls[j.foto_url] : null}
              nombre={j.nombre}
              apellidos={j.apellidos}
              className="size-20"
            />
            <div className="min-w-0">
              <p className="font-heading text-2xl tabular-nums text-primary">
                {j.dorsal ?? "—"}
              </p>
              <p className="truncate text-sm font-medium">
                {j.alias || `${j.nombre} ${j.apellidos}`}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {posicionLabel(j.posicion)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
