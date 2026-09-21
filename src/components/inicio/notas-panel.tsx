"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { Trash2, NotebookPen } from "lucide-react";
import {
  crearNotaLocal,
  eliminarNotaLocal,
} from "@/app/(app)/inicio/local-actions";
import { localDb } from "@/lib/db/local-db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NotasPanel() {
  const notas = useLiveQuery(
    () =>
      localDb.notas
        .toArray()
        .then((rows) => rows.sort((a, b) => b.created_at.localeCompare(a.created_at))),
    [],
    [],
  );

  const [texto, setTexto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [pendiente, setPendiente] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setGuardando(true);
    const result = await crearNotaLocal({ texto });
    setGuardando(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setTexto("");
  }

  async function handleEliminar(id: string) {
    setPendiente(id);
    await eliminarNotaLocal(id);
    setPendiente(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <NotebookPen className="size-4" />
          Notas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Añadir una nota..."
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={guardando || !texto.trim()}>
            Añadir
          </Button>
        </form>

        {notas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin notas todavía.</p>
        ) : (
          <ul className="space-y-1">
            {notas.map((n) => (
              <li key={n.id} className="flex items-center gap-2 py-1">
                <span className="min-w-0 flex-1 truncate text-sm">{n.texto}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={pendiente === n.id}
                  onClick={() => handleEliminar(n.id)}
                  aria-label="Eliminar nota"
                >
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
