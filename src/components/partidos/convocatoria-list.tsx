"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toggleConvocadoLocal } from "@/app/(app)/partidos/local-actions";
import { localDb } from "@/lib/db/local-db";
import { createClient } from "@/lib/supabase/client";
import { JugadorAvatar } from "@/components/plantilla/jugador-avatar";
import { Checkbox } from "@/components/ui/checkbox";

interface Jugador {
  id: string;
  nombre: string;
  apellidos: string;
  dorsal: number | null;
  foto_url: string | null;
}

export function ConvocatoriaList({
  partidoId,
  jugadores,
}: {
  partidoId: string;
  jugadores: Jugador[];
}) {
  const [pendiente, setPendiente] = useState<string | null>(null);
  const [fotoUrls, setFotoUrls] = useState<Record<string, string>>({});

  const convocatorias = useLiveQuery(
    () =>
      localDb.convocatorias
        .where("partido_id")
        .equals(partidoId)
        .filter((c) => c.convocado)
        .toArray(),
    [partidoId],
    [],
  );
  const convocados = useMemo(
    () => new Set(convocatorias.map((c) => c.jugador_id)),
    [convocatorias],
  );

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

  async function handleToggle(jugadorId: string) {
    const yaConvocado = convocados.has(jugadorId);
    setPendiente(jugadorId);
    await toggleConvocadoLocal(partidoId, jugadorId, !yaConvocado);
    setPendiente(null);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {convocados.size} convocado{convocados.size !== 1 ? "s" : ""}
      </p>
      <ul className="divide-y rounded-md border">
        {jugadores.map((j) => {
          const marcado = convocados.has(j.id);
          return (
            <li key={j.id}>
              <label className="flex items-center gap-3 p-3 hover:bg-muted/50">
                <Checkbox
                  checked={marcado}
                  disabled={pendiente === j.id}
                  onCheckedChange={() => handleToggle(j.id)}
                />
                <JugadorAvatar
                  src={j.foto_url ? fotoUrls[j.foto_url] ?? null : null}
                  nombre={j.nombre}
                  apellidos={j.apellidos}
                  className="size-8"
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {j.dorsal != null ? `${j.dorsal} · ` : ""}
                  {j.nombre} {j.apellidos}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
