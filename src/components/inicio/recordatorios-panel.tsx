"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { Trash2, ClipboardList } from "lucide-react";
import {
  crearRecordatorioLocal,
  toggleCompletadoRecordatorioLocal,
  eliminarRecordatorioLocal,
} from "@/app/(app)/inicio/local-actions";
import { localDb } from "@/lib/db/local-db";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export function RecordatoriosPanel() {
  const recordatorios = useLiveQuery(
    () =>
      localDb.recordatorios
        .toArray()
        .then((rows) =>
          rows.sort((a, b) => {
            if (a.completado !== b.completado) return a.completado ? 1 : -1;
            return b.created_at.localeCompare(a.created_at);
          }),
        ),
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
    const result = await crearRecordatorioLocal({ texto });
    setGuardando(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setTexto("");
  }

  async function handleToggle(id: string, completado: boolean) {
    setPendiente(id);
    await toggleCompletadoRecordatorioLocal(id, completado);
    setPendiente(null);
  }

  async function handleEliminar(id: string) {
    setPendiente(id);
    await eliminarRecordatorioLocal(id);
    setPendiente(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="size-4" />
          Recordatorios
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Añadir un recordatorio..."
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={guardando || !texto.trim()}>
            Añadir
          </Button>
        </form>

        {recordatorios.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin recordatorios pendientes.
          </p>
        ) : (
          <ul className="space-y-1">
            {recordatorios.map((r) => (
              <li key={r.id} className="flex items-center gap-2 py-1">
                <Checkbox
                  checked={r.completado}
                  disabled={pendiente === r.id}
                  onCheckedChange={() => handleToggle(r.id, !r.completado)}
                />
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm",
                    r.completado && "text-muted-foreground line-through",
                  )}
                >
                  {r.texto}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={pendiente === r.id}
                  onClick={() => handleEliminar(r.id)}
                  aria-label="Eliminar recordatorio"
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
