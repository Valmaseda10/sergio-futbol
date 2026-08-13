"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { crearEventoLocal, eliminarEventoLocal } from "@/app/(app)/partidos/local-actions";
import { localDb } from "@/lib/db/local-db";
import type { TipoEventoPartido } from "@/lib/types/database.types";
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
import { Card, CardContent } from "@/components/ui/card";

interface Jugador {
  id: string;
  nombre: string;
  apellidos: string;
  dorsal: number | null;
}

const TIPO_LABEL: Record<TipoEventoPartido, string> = {
  gol: "Gol",
  asistencia: "Asistencia",
  tarjeta_amarilla: "Tarjeta amarilla",
  tarjeta_roja: "Tarjeta roja",
};

export function EventosList({
  partidoId,
  convocados,
}: {
  partidoId: string;
  convocados: Jugador[];
}) {
  const eventos = useLiveQuery(
    () => localDb.eventos_partido.where("partido_id").equals(partidoId).toArray(),
    [partidoId],
    [],
  );
  const [jugadorId, setJugadorId] = useState("");
  const [tipo, setTipo] = useState<TipoEventoPartido>("gol");
  const [minuto, setMinuto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [borrando, setBorrando] = useState<string | null>(null);

  const jugadoresPorId = new Map(convocados.map((j) => [j.id, j]));

  async function handleAdd() {
    if (!jugadorId) {
      toast.error("Elige un jugador");
      return;
    }

    setEnviando(true);
    const result = await crearEventoLocal(partidoId, jugadorId, tipo, minuto);
    setEnviando(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Evento añadido");
    setJugadorId("");
    setMinuto("");
  }

  async function handleDelete(eventoId: string) {
    setBorrando(eventoId);
    await eliminarEventoLocal(eventoId);
    setBorrando(null);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={tipo}
              onValueChange={(v) => setTipo(v as TipoEventoPartido)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value) => TIPO_LABEL[value as TipoEventoPartido] ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIPO_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Jugador</Label>
            <Select value={jugadorId} onValueChange={(v) => setJugadorId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un convocado">
                  {(value) => {
                    const j = jugadoresPorId.get(value as string);
                    if (!j) return "Selecciona un convocado";
                    return `${j.dorsal != null ? `${j.dorsal} · ` : ""}${j.nombre} ${j.apellidos}`;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {convocados.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.dorsal != null ? `${j.dorsal} · ` : ""}
                    {j.nombre} {j.apellidos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="minuto">Minuto (opcional)</Label>
            <Input
              id="minuto"
              type="number"
              min={0}
              max={130}
              value={minuto}
              onChange={(e) => setMinuto(e.target.value)}
            />
          </div>
          <Button onClick={handleAdd} disabled={enviando} className="w-full">
            {enviando ? "Añadiendo..." : "Añadir evento"}
          </Button>
        </CardContent>
      </Card>

      {eventos.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Todavía no hay eventos registrados.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {eventos
            .slice()
            .sort((a, b) => (a.minuto ?? 999) - (b.minuto ?? 999))
            .map((evento) => {
              const jugador = jugadoresPorId.get(evento.jugador_id);
              return (
                <li
                  key={evento.id}
                  className="flex items-center gap-3 p-3 text-sm"
                >
                  <span className="w-10 shrink-0 text-muted-foreground">
                    {evento.minuto != null ? `${evento.minuto}'` : "—"}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">
                      {TIPO_LABEL[evento.tipo]}
                    </span>{" "}
                    — {jugador ? `${jugador.nombre} ${jugador.apellidos}` : "?"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={borrando === evento.id}
                    onClick={() => handleDelete(evento.id)}
                    aria-label="Eliminar evento"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}
