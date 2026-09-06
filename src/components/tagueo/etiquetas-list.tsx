"use client";

// Panel de control para ir marcando sobre la marcha lo que pasa en el
// partido: eliges jugador y minuto una vez (se quedan puestos para
// encadenar varias etiquetas seguidas sin repetir el paso), y tocas la
// categoría que corresponda para registrarla al momento. Las categorías se
// definen libremente desde Tagueo → Categorías.

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Tag, Trash2 } from "lucide-react";
import {
  crearEtiquetaPartidoLocal,
  eliminarEtiquetaPartidoLocal,
} from "@/app/(app)/partidos/local-actions";
import type { LocalEtiquetaPartido } from "@/lib/db/local-db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const SIN_JUGADOR = "__equipo__";

function nombreMostrado(j: Jugador) {
  return j.alias || `${j.nombre} ${j.apellidos}`;
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
  const [jugadorId, setJugadorId] = useState("");
  const [minuto, setMinuto] = useState("");
  const [notas, setNotas] = useState("");
  const [enviando, setEnviando] = useState<string | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);

  const jugadoresPorId = new Map(convocados.map((j) => [j.id, j]));
  const etiquetasPorId = new Map(etiquetas.map((e) => [e.id, e]));

  async function handleTaguear(etiquetaId: string) {
    setEnviando(etiquetaId);
    const result = await crearEtiquetaPartidoLocal(
      partidoId,
      etiquetaId,
      jugadorId || null,
      minuto,
      notas,
    );
    setEnviando(null);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    // El jugador y el minuto se quedan puestos para poder encadenar varias
    // etiquetas seguidas de la misma jugada; la nota es más específica de
    // cada toque, así que se limpia.
    setNotas("");
    toast.success("Etiqueta registrada");
  }

  async function handleBorrar(id: string) {
    setBorrando(id);
    await eliminarEtiquetaPartidoLocal(id);
    setBorrando(null);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-md border p-3">
        <div className="space-y-2">
          <Label htmlFor="jugadorEtiqueta">Jugador (opcional)</Label>
          <Select
            value={jugadorId || SIN_JUGADOR}
            onValueChange={(v) => setJugadorId(v === SIN_JUGADOR ? "" : (v ?? ""))}
          >
            <SelectTrigger id="jugadorEtiqueta" className="w-full">
              <SelectValue>
                {(value) => {
                  if (value === SIN_JUGADOR) return "Equipo (sin jugador)";
                  const j = jugadoresPorId.get(value as string);
                  return j
                    ? `${j.dorsal != null ? `${j.dorsal} · ` : ""}${nombreMostrado(j)}`
                    : "Equipo (sin jugador)";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SIN_JUGADOR}>Equipo (sin jugador)</SelectItem>
              {convocados.map((j) => (
                <SelectItem key={j.id} value={j.id}>
                  {j.dorsal != null ? `${j.dorsal} · ` : ""}
                  {nombreMostrado(j)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="minutoEtiqueta">Minuto (opcional)</Label>
            <Input
              id="minutoEtiqueta"
              type="number"
              min={0}
              max={130}
              value={minuto}
              onChange={(e) => setMinuto(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notaEtiqueta">Nota (opcional)</Label>
            <Input
              id="notaEtiqueta"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>
        </div>
      </div>

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
              disabled={enviando === etiqueta.id}
              onClick={() => handleTaguear(etiqueta.id)}
              className="flex items-center gap-2 rounded-md border py-2 pr-2 pl-3 text-sm font-medium disabled:opacity-50"
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
                  className="flex items-center gap-3 p-3 text-sm"
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
                    aria-label="Eliminar etiqueta"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              );
            })}
        </ul>
      )}

      {registros.length === 0 && etiquetas.length > 0 && (
        <p className="flex items-center justify-center gap-1.5 py-4 text-center text-sm text-muted-foreground">
          <Tag className="size-4" />
          Todavía no has registrado ninguna etiqueta en este partido.
        </p>
      )}
    </div>
  );
}
