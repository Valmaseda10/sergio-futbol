"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { Share2 } from "lucide-react";
import { toggleConvocadoLocal } from "@/app/(app)/partidos/local-actions";
import { localDb } from "@/lib/db/local-db";
import { createClient } from "@/lib/supabase/client";
import { capitalizarPrimera } from "@/lib/date";
import { JugadorAvatar } from "@/components/plantilla/jugador-avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

interface Jugador {
  id: string;
  nombre: string;
  apellidos: string;
  alias: string | null;
  dorsal: number | null;
  foto_url: string | null;
}

interface PartidoResumen {
  rival: string;
  fecha: string;
  hora: string | null;
  lugar: string | null;
}

function formatearFechaLarga(fecha: string) {
  return capitalizarPrimera(
    new Date(`${fecha}T00:00:00`).toLocaleDateString("es-ES", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    }),
  );
}

function construirTextoConvocatoria(
  partido: PartidoResumen,
  convocados: Jugador[],
) {
  const lineas = [
    `Convocatoria vs ${partido.rival}`,
    [
      formatearFechaLarga(partido.fecha),
      partido.hora ? partido.hora.slice(0, 5) : null,
      partido.lugar,
    ]
      .filter(Boolean)
      .join(" · "),
    "",
    ...convocados.map(
      (j, i) =>
        `${i + 1}. ${j.alias || `${j.nombre} ${j.apellidos}`}${j.dorsal != null ? ` (${j.dorsal})` : ""}`,
    ),
  ];
  return lineas.join("\n");
}

export function ConvocatoriaList({
  partidoId,
  partido,
  jugadores,
}: {
  partidoId: string;
  partido: PartidoResumen;
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

  // Aviso (no exclusión automática: el entrenador decide) de jugadores con
  // lesión activa el día del partido o que han faltado a la mayoría de los
  // últimos entrenamientos, para que salte a la vista al convocar.
  const lesionesActivas = useLiveQuery(
    () =>
      localDb.lesiones
        .filter(
          (l) =>
            l.fecha_inicio <= partido.fecha &&
            (l.fecha_alta_real == null || l.fecha_alta_real > partido.fecha),
        )
        .toArray(),
    [partido.fecha],
    [],
  );
  const jugadoresLesionados = useMemo(
    () => new Set(lesionesActivas.map((l) => l.jugador_id)),
    [lesionesActivas],
  );

  const entrenamientosRecientes = useLiveQuery(
    () =>
      localDb.entrenamientos
        .filter((e) => e.fecha <= partido.fecha)
        .toArray()
        .then((rows) =>
          rows.sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 5),
        ),
    [partido.fecha],
    [],
  );
  const entrenamientoIdsRecientes = useMemo(
    () => new Set(entrenamientosRecientes.map((e) => e.id)),
    [entrenamientosRecientes],
  );
  const asistenciasRecientes = useLiveQuery(
    () =>
      localDb.asistencias_entrenamiento
        .filter((a) => entrenamientoIdsRecientes.has(a.entrenamiento_id))
        .toArray(),
    [entrenamientoIdsRecientes],
    [],
  );
  const estados = useLiveQuery(() => localDb.estados.toArray(), [], []);
  const jugadoresBajaAsistencia = useMemo(() => {
    if (entrenamientosRecientes.length < 3) return new Set<string>();
    const nombrePorEstado = new Map(estados.map((e) => [e.id, e.nombre]));
    const faltas: Record<string, number> = {};
    for (const a of asistenciasRecientes) {
      const nombre = a.estado_id ? nombrePorEstado.get(a.estado_id) : undefined;
      if (nombre && nombre !== "SI") {
        faltas[a.jugador_id] = (faltas[a.jugador_id] ?? 0) + 1;
      }
    }
    const umbral = entrenamientosRecientes.length / 2;
    return new Set(
      Object.entries(faltas)
        .filter(([, n]) => n > umbral)
        .map(([jugadorId]) => jugadorId),
    );
  }, [asistenciasRecientes, estados, entrenamientosRecientes]);

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

  async function handleCompartir() {
    const jugadoresConvocados = jugadores.filter((j) => convocados.has(j.id));
    const texto = construirTextoConvocatoria(partido, jugadoresConvocados);

    if (navigator.share) {
      try {
        await navigator.share({ title: `Convocatoria vs ${partido.rival}`, text: texto });
      } catch {
        // El usuario ha cancelado el diálogo de compartir; no hacer nada.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Convocatoria copiada al portapapeles");
    } catch {
      toast.error("No se ha podido copiar la convocatoria");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {convocados.size} convocado{convocados.size !== 1 ? "s" : ""}
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={convocados.size === 0}
          onClick={handleCompartir}
        >
          <Share2 className="size-4" />
          Compartir
        </Button>
      </div>
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
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {j.alias || `${j.nombre} ${j.apellidos}`}
                  </span>
                  {jugadoresLesionados.has(j.id) && (
                    <span className="text-xs text-destructive">Lesionado</span>
                  )}
                  {!jugadoresLesionados.has(j.id) &&
                    jugadoresBajaAsistencia.has(j.id) && (
                      <span className="text-xs text-gold">
                        Poca asistencia últimamente
                      </span>
                    )}
                </span>
                {j.dorsal != null && (
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-gold font-heading text-xs tabular-nums">
                    {j.dorsal}
                  </span>
                )}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
