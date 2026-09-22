"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { actualizarVideoLocal } from "@/app/(app)/videos/local-actions";
import { getYoutubeVideoId } from "@/lib/youtube";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PartidoOpcion {
  id: string;
  rival: string;
  fecha: string;
}

interface ClipParaEditar {
  id: string;
  titulo: string;
  fecha: string;
  url: string;
  partido_id: string | null;
  notas: string | null;
  segundo_inicio: number | null;
  segundo_fin: number | null;
  storage_path: string | null;
}

export function ClipEditForm({
  video,
  partidos,
  onGuardado,
  onCancelar,
}: {
  video: ClipParaEditar;
  partidos: PartidoOpcion[];
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const [titulo, setTitulo] = useState(video.titulo);
  const [fecha, setFecha] = useState(video.fecha);
  const [partidoId, setPartidoId] = useState(video.partido_id ?? "");
  const [notas, setNotas] = useState(video.notas ?? "");
  const [segundoInicio, setSegundoInicio] = useState(
    video.segundo_inicio != null ? String(video.segundo_inicio) : "",
  );
  const [segundoFin, setSegundoFin] = useState(
    video.segundo_fin != null ? String(video.segundo_fin) : "",
  );
  const [guardando, setGuardando] = useState(false);

  const partidosPorId = new Map(partidos.map((p) => [p.id, p]));
  const esRecortableSegundos = !video.storage_path && getYoutubeVideoId(video.url) != null;

  async function handleGuardar() {
    setGuardando(true);
    const result = await actualizarVideoLocal(video.id, {
      titulo,
      fecha,
      partido_id: partidoId || null,
      notas: notas.trim() || null,
      ...(esRecortableSegundos
        ? {
            segundo_inicio: segundoInicio ? Number(segundoInicio) : null,
            segundo_fin: segundoFin ? Number(segundoFin) : null,
          }
        : {}),
    });
    setGuardando(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Clip actualizado");
    onGuardado();
  }

  return (
    <div className="space-y-4 rounded-md border p-3">
      <div className="space-y-2">
        <Label htmlFor="tituloClip">Título</Label>
        <Input id="tituloClip" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fechaClip">Fecha</Label>
        <Input
          id="fechaClip"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="partidoClip">Partido asociado (opcional)</Label>
        <Select value={partidoId} onValueChange={(v) => setPartidoId(v ?? "")}>
          <SelectTrigger id="partidoClip" className="w-full">
            <SelectValue placeholder="Sin partido asociado">
              {(value) => {
                if (!value) return "Sin partido asociado";
                const p = partidosPorId.get(value as string);
                return p ? `vs ${p.rival} (${p.fecha})` : "Sin partido asociado";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {partidos.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                vs {p.rival} ({p.fecha})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {esRecortableSegundos && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="inicioClip">Segundo inicio</Label>
            <Input
              id="inicioClip"
              type="number"
              min={0}
              inputMode="numeric"
              value={segundoInicio}
              onChange={(e) => setSegundoInicio(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="finClip">Segundo fin</Label>
            <Input
              id="finClip"
              type="number"
              min={0}
              inputMode="numeric"
              value={segundoFin}
              onChange={(e) => setSegundoFin(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="notasClip">Notas (opcional)</Label>
        <Textarea
          id="notasClip"
          rows={2}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button className="flex-1" disabled={guardando} onClick={handleGuardar}>
          <Save className="size-4" />
          {guardando ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
