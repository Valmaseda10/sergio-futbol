"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { actualizarAsistenciaLocal } from "@/app/(app)/entrenamientos/local-actions";
import { localDb } from "@/lib/db/local-db";
import { createClient } from "@/lib/supabase/client";
import { JugadorAvatar } from "@/components/plantilla/jugador-avatar";
import { cn } from "@/lib/utils";

interface Jugador {
  id: string;
  nombre: string;
  apellidos: string;
  dorsal: number | null;
  foto_url: string | null;
}

interface Estado {
  id: string;
  nombre: string;
  color: string;
}

export function AsistenciaGrid({
  entrenamientoId,
  jugadores,
  estados,
}: {
  entrenamientoId: string;
  jugadores: Jugador[];
  estados: Estado[];
}) {
  const [pendiente, setPendiente] = useState<string | null>(null);
  const [fotoUrls, setFotoUrls] = useState<Record<string, string>>({});

  const asistenciasRows = useLiveQuery(
    () =>
      localDb.asistencias_entrenamiento
        .where("entrenamiento_id")
        .equals(entrenamientoId)
        .toArray(),
    [entrenamientoId],
    [],
  );

  const asistencias = useMemo(
    () =>
      Object.fromEntries(
        asistenciasRows
          .filter((a) => a.estado_id)
          .map((a) => [a.jugador_id, a.estado_id as string]),
      ),
    [asistenciasRows],
  );

  const { asisten, noAsisten } = useMemo(() => {
    let noAsistenCount = 0;
    for (const j of jugadores) {
      const estadoId = asistencias[j.id];
      const estado = estadoId ? estados.find((e) => e.id === estadoId) : null;
      if (estado && estado.nombre !== "SI") noAsistenCount += 1;
    }
    return {
      asisten: jugadores.length - noAsistenCount,
      noAsisten: noAsistenCount,
    };
  }, [jugadores, asistencias, estados]);

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

  async function handleChip(jugadorId: string, estadoId: string) {
    const actual = asistencias[jugadorId];
    const nuevoEstadoId = actual === estadoId ? null : estadoId;

    setPendiente(jugadorId);
    await actualizarAsistenciaLocal(entrenamientoId, jugadorId, nuevoEstadoId);
    setPendiente(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 rounded-md border p-3 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-pitch" />
          <span className="font-heading tabular-nums">{asisten}</span>
          <span className="text-muted-foreground">asisten</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-destructive" />
          <span className="font-heading tabular-nums">{noAsisten}</span>
          <span className="text-muted-foreground">no asisten</span>
        </span>
      </div>
      <ul className="divide-y rounded-md border">
        {jugadores.map((j) => {
          const estadoActualId = asistencias[j.id];
          const estadoActual = estados.find((e) => e.id === estadoActualId);

          return (
            <li key={j.id} className="space-y-2 p-3">
              <div className="flex items-center gap-3">
                <JugadorAvatar
                  src={j.foto_url ? fotoUrls[j.foto_url] ?? null : null}
                  nombre={j.nombre}
                  apellidos={j.apellidos}
                  className="size-8"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {j.dorsal != null ? `${j.dorsal} · ` : ""}
                    {j.nombre} {j.apellidos}
                  </p>
                </div>
                {!estadoActual && (
                  <span className="text-xs text-muted-foreground">Asiste</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {estados.map((estado) => {
                  const seleccionado = estadoActualId === estado.id;
                  return (
                    <button
                      key={estado.id}
                      type="button"
                      disabled={pendiente === j.id}
                      onClick={() => handleChip(j.id, estado.id)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50",
                        seleccionado
                          ? "text-white"
                          : "bg-background text-muted-foreground hover:text-foreground",
                      )}
                      style={
                        seleccionado
                          ? { backgroundColor: estado.color, borderColor: estado.color }
                          : { borderColor: estado.color }
                      }
                    >
                      {estado.nombre}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
