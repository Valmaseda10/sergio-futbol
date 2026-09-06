"use client";

// Panel de control para ir marcando sobre la marcha lo que pasa en el
// partido, en tres pasos rápidos: tocas qué ha pasado (el minuto se toma
// del cronómetro en ese instante), tocas quién ha sido, y por último tocas
// en qué zona del campo (opcional). Las categorías se definen libremente
// desde este mismo apartado, en "Categorías".

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronLeft, Pause, Play, RotateCcw, Tag, Trash2 } from "lucide-react";
import {
  crearEtiquetaPartidoLocal,
  eliminarEtiquetaPartidoLocal,
} from "@/app/(app)/partidos/local-actions";
import type { LocalEtiquetaPartido } from "@/lib/db/local-db";
import { useCronometro } from "@/components/tagueo/use-cronometro";
import { CampoCompletoSelector } from "@/components/partidos/campo-mini-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Jugador {
  id: string;
  nombre: string;
  apellidos: string;
  alias: string | null;
  dorsal: number | null;
}

interface Etiqueta {
  id: string;
  nombre: string;
  color: string;
}

type Paso = "categoria" | "jugador" | "zona";

function nombreMostrado(j: Jugador) {
  return j.alias || `${j.nombre} ${j.apellidos}`;
}

function dosDigitos(n: number) {
  return String(n).padStart(2, "0");
}

export function EtiquetasList({
  partidoId,
  convocados,
  etiquetas,
  registros,
}: {
  partidoId: string;
  convocados: Jugador[];
  etiquetas: Etiqueta[];
  registros: LocalEtiquetaPartido[];
}) {
  const cronometro = useCronometro(partidoId);

  const [paso, setPaso] = useState<Paso>("categoria");
  const [etiquetaActual, setEtiquetaActual] = useState<Etiqueta | null>(null);
  const [minutoCapturado, setMinutoCapturado] = useState(0);
  const [jugadorElegido, setJugadorElegido] = useState<string | null>(null); // null = equipo
  const [zona, setZona] = useState<{ top: number; left: number } | null>(null);
  const [notas, setNotas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [borrando, setBorrando] = useState<string | null>(null);

  const jugadoresPorId = new Map(convocados.map((j) => [j.id, j]));
  const etiquetasPorId = new Map(etiquetas.map((e) => [e.id, e]));

  function resetear() {
    setPaso("categoria");
    setEtiquetaActual(null);
    setJugadorElegido(null);
    setZona(null);
    setNotas("");
  }

  function handleElegirCategoria(etiqueta: Etiqueta) {
    setEtiquetaActual(etiqueta);
    setMinutoCapturado(cronometro.minuto);
    setPaso("jugador");
  }

  function handleElegirJugador(jugadorId: string | null) {
    setJugadorElegido(jugadorId);
    setPaso("zona");
  }

  function handleVolver() {
    if (paso === "zona") {
      setPaso("jugador");
      return;
    }
    if (paso === "jugador") {
      resetear();
    }
  }

  async function handleGuardar() {
    if (!etiquetaActual) return;
    setEnviando(true);
    const result = await crearEtiquetaPartidoLocal(
      partidoId,
      etiquetaActual.id,
      jugadorElegido,
      String(minutoCapturado),
      notas,
      zona,
    );
    setEnviando(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Registrado");
    resetear();
  }

  async function handleBorrar(id: string) {
    setBorrando(id);
    await eliminarEtiquetaPartidoLocal(id);
    setBorrando(null);
  }

  const jugadorElegidoNombre = jugadorElegido
    ? (jugadoresPorId.get(jugadorElegido) ? nombreMostrado(jugadoresPorId.get(jugadorElegido)!) : "?")
    : "Equipo";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <p className="font-heading text-2xl tabular-nums">
            {dosDigitos(cronometro.minuto)}:{dosDigitos(cronometro.segundos)}
          </p>
          <p className="text-xs text-muted-foreground">
            {cronometro.corriendo ? "En juego" : "Parado (descanso)"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={cronometro.reiniciar}
            aria-label="Reiniciar cronómetro"
          >
            <RotateCcw className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            onClick={cronometro.toggle}
            aria-label={cronometro.corriendo ? "Pausar" : "Reanudar"}
          >
            {cronometro.corriendo ? (
              <Pause className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
          </Button>
        </div>
      </div>

      {paso === "categoria" && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            ¿Qué ha pasado?
          </p>
          {etiquetas.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Todavía no hay categorías definidas. Créalas desde{" "}
              <Link href="/tagueo" className="font-medium underline">
                Tagueo → Categorías
              </Link>
              .
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {etiquetas.map((etiqueta) => (
                <button
                  key={etiqueta.id}
                  type="button"
                  onClick={() => handleElegirCategoria(etiqueta)}
                  className="flex items-center gap-2 rounded-md border py-2 pr-2 pl-3 text-sm font-medium"
                  style={{ borderColor: etiqueta.color }}
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: etiqueta.color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-left">
                    {etiqueta.nombre}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {paso === "jugador" && etiquetaActual && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleVolver}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: etiquetaActual.color }}
            />
            {etiquetaActual.nombre} · {minutoCapturado}&apos;
          </button>
          <p className="text-sm font-medium text-muted-foreground">
            ¿Quién ha sido?
          </p>
          <ul className="flex flex-wrap gap-2">
            <li>
              <button
                type="button"
                onClick={() => handleElegirJugador(null)}
                className="rounded-full border py-1 px-3 text-sm hover:bg-muted"
              >
                Equipo (sin jugador)
              </button>
            </li>
            {convocados.map((j) => (
              <li key={j.id}>
                <button
                  type="button"
                  onClick={() => handleElegirJugador(j.id)}
                  className="flex items-center gap-2 rounded-full border py-1 pr-3 pl-2 text-sm hover:bg-muted"
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                    {j.dorsal ?? nombreMostrado(j)[0]}
                  </span>
                  {nombreMostrado(j)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {paso === "zona" && etiquetaActual && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleVolver}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: etiquetaActual.color }}
            />
            {etiquetaActual.nombre} · {minutoCapturado}&apos; · {jugadorElegidoNombre}
          </button>
          <p className="text-sm font-medium text-muted-foreground">
            ¿En qué zona? (opcional)
          </p>
          <CampoCompletoSelector value={zona} onChange={setZona} />
          <Input
            placeholder="Nota (opcional)"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
          <Button
            className="w-full"
            disabled={enviando}
            onClick={handleGuardar}
          >
            {enviando ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      )}

      {registros.length > 0 && (
        <ul className="divide-y rounded-md border">
          {registros
            .slice()
            .sort((a, b) => (a.minuto ?? 999) - (b.minuto ?? 999))
            .map((registro) => {
              const etiqueta = etiquetasPorId.get(registro.etiqueta_id);
              const jugador = registro.jugador_id
                ? jugadoresPorId.get(registro.jugador_id)
                : null;
              return (
                <li
                  key={registro.id}
                  className={cn(
                    "flex items-center gap-3 p-3 text-sm",
                    borrando === registro.id && "opacity-50",
                  )}
                >
                  <span className="w-9 shrink-0 font-heading tabular-nums text-muted-foreground">
                    {registro.minuto != null ? `${registro.minuto}'` : "—"}
                  </span>
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: etiqueta?.color ?? "#94a3b8" }}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">
                      {etiqueta?.nombre ?? "Etiqueta"}
                    </span>
                    {jugador && (
                      <span className="text-muted-foreground">
                        {" "}
                        — {nombreMostrado(jugador)}
                      </span>
                    )}
                    {registro.notas && (
                      <span className="text-muted-foreground italic">
                        {" "}
                        · {registro.notas}
                      </span>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={borrando === registro.id}
                    onClick={() => handleBorrar(registro.id)}
                    aria-label="Eliminar registro"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              );
            })}
        </ul>
      )}

      {registros.length === 0 && paso === "categoria" && etiquetas.length > 0 && (
        <p className="flex items-center justify-center gap-1.5 py-4 text-center text-sm text-muted-foreground">
          <Tag className="size-4" />
          Todavía no has registrado nada en este partido.
        </p>
      )}
    </div>
  );
}
