"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Save, X } from "lucide-react";
import { guardarSesionLocal } from "@/app/(app)/videos/local-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ClipDisponible {
  id: string;
  titulo: string;
  fecha: string;
}

export interface SesionInicial {
  id: string;
  titulo: string;
  notas: string | null;
  clipIds: string[];
}

export function SesionForm({
  clips,
  inicial,
}: {
  clips: ClipDisponible[];
  inicial?: SesionInicial;
}) {
  const router = useRouter();
  const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
  const [notas, setNotas] = useState(inicial?.notas ?? "");
  const [seleccionados, setSeleccionados] = useState<string[]>(inicial?.clipIds ?? []);
  const [guardando, setGuardando] = useState(false);

  const clipsPorId = new Map(clips.map((c) => [c.id, c]));
  const elegidos = seleccionados.map((id) => clipsPorId.get(id)).filter((c): c is ClipDisponible => !!c);
  const disponibles = clips.filter((c) => !seleccionados.includes(c.id));

  function añadir(id: string) {
    setSeleccionados((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function quitar(id: string) {
    setSeleccionados((prev) => prev.filter((c) => c !== id));
  }

  function mover(id: string, direccion: -1 | 1) {
    setSeleccionados((prev) => {
      const i = prev.indexOf(id);
      const j = i + direccion;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function handleGuardar() {
    setGuardando(true);
    const result = await guardarSesionLocal({
      id: inicial?.id,
      titulo,
      notas: notas.trim() || null,
      clipIds: seleccionados,
    });
    setGuardando(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Sesión guardada");
    router.push(`/videos/sesiones/${result.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tituloSesion">Título</Label>
        <Input
          id="tituloSesion"
          placeholder="Ej: Jugadas a balón parado, agosto"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notasSesion">Notas (opcional)</Label>
        <Textarea
          id="notasSesion"
          rows={2}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Clips en la sesión ({elegidos.length})
        </p>
        {elegidos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Añade clips de la lista de abajo, en el orden en que quieres
            enseñarlos.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {elegidos.map((c, i) => (
              <li key={c.id} className="flex items-center gap-2 rounded-md border py-1.5 pr-2 pl-3">
                <span className="min-w-0 flex-1 truncate text-sm">
                  {i + 1}. {c.titulo}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={i === 0}
                  aria-label="Subir"
                  onClick={() => mover(c.id, -1)}
                >
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={i === elegidos.length - 1}
                  aria-label="Bajar"
                  onClick={() => mover(c.id, 1)}
                >
                  <ArrowDown className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Quitar de la sesión"
                  onClick={() => quitar(c.id)}
                >
                  <X className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Clips disponibles ({disponibles.length})
        </p>
        {disponibles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No quedan más clips por añadir.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {disponibles.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => añadir(c.id)}
                  className="flex w-full items-center justify-between rounded-md border py-1.5 px-3 text-left text-sm hover:bg-muted"
                >
                  <span className="min-w-0 truncate">{c.titulo}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">Añadir</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Button className="w-full" disabled={guardando} onClick={handleGuardar}>
        <Save className="size-4" />
        {guardando ? "Guardando..." : "Guardar sesión"}
      </Button>
    </div>
  );
}
