"use client";

import { useState } from "react";
import { Check, Pencil, Plus, ScrollText, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  CATEGORIAS_NORMA,
  PUNTOS_CASTIGO,
} from "@/lib/validations/norma";
import { useNormas } from "@/lib/use-normas";
import {
  actualizarNormaLocal,
  crearNormaLocal,
  eliminarNormaLocal,
} from "@/app/(app)/inicio/local-actions";
import type { CategoriaNorma } from "@/lib/types/database.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Fila en edición: `id` null = falta nueva de esa categoría.
type Edicion = { id: string | null; categoria: CategoriaNorma };

function FormularioNorma({
  inicial,
  onGuardar,
  onCancelar,
}: {
  inicial: { texto: string; puntos: number };
  onGuardar: (texto: string, puntos: number) => Promise<void>;
  onCancelar: () => void;
}) {
  const [texto, setTexto] = useState(inicial.texto);
  const [puntos, setPuntos] = useState(String(inicial.puntos));
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    await onGuardar(texto, Number(puntos));
    setGuardando(false);
  }

  return (
    <form onSubmit={guardar} className="flex items-center gap-2 py-1">
      <Input
        autoFocus
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Falta"
        className="min-w-0 flex-1"
        aria-label="Texto de la falta"
      />
      <Input
        type="number"
        min={1}
        max={10}
        value={puntos}
        onChange={(e) => setPuntos(e.target.value)}
        className="w-16 shrink-0"
        aria-label="Puntos"
      />
      <Button type="submit" size="icon" variant="outline" disabled={guardando} aria-label="Guardar">
        <Check className="size-4" />
      </Button>
      <Button type="button" size="icon" variant="ghost" onClick={onCancelar} aria-label="Cancelar">
        <X className="size-4" />
      </Button>
    </form>
  );
}

export function NormasPanel() {
  const normas = useNormas();
  const [edicion, setEdicion] = useState<Edicion | null>(null);

  async function guardar(texto: string, puntos: number) {
    if (!edicion) return;
    const values = { categoria: edicion.categoria, texto, puntos };
    const result = edicion.id
      ? await actualizarNormaLocal(edicion.id, values)
      : await crearNormaLocal(values);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setEdicion(null);
  }

  async function eliminar(id: string, texto: string) {
    if (
      !window.confirm(
        `¿Eliminar la falta "${texto}"? Las multas ya puestas no cambian.`,
      )
    ) {
      return;
    }
    await eliminarNormaLocal(id);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ScrollText className="size-4" />
          Régimen interno
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {CATEGORIAS_NORMA.map((cat) => (
          <div key={cat.value}>
            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
              {cat.label}
            </p>
            <ul className="space-y-1">
              {normas
                .filter((n) => n.categoria === cat.value)
                .map((n) =>
                  edicion?.id === n.id ? (
                    <li key={n.id}>
                      <FormularioNorma
                        inicial={{ texto: n.texto, puntos: n.puntos }}
                        onGuardar={guardar}
                        onCancelar={() => setEdicion(null)}
                      />
                    </li>
                  ) : (
                    <li
                      key={n.id}
                      className="flex items-center justify-between gap-2 py-0.5 text-sm"
                    >
                      <span className="min-w-0 flex-1">{n.texto}</span>
                      <Badge variant="outline" className="shrink-0">
                        {n.puntos} pt{n.puntos > 1 ? "s" : ""}
                      </Badge>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7 shrink-0"
                        aria-label="Editar falta"
                        onClick={() => setEdicion({ id: n.id, categoria: n.categoria })}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7 shrink-0 text-destructive"
                        aria-label="Eliminar falta"
                        onClick={() => eliminar(n.id, n.texto)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </li>
                  ),
                )}
              {edicion && edicion.id === null && edicion.categoria === cat.value && (
                <li>
                  <FormularioNorma
                    inicial={{ texto: "", puntos: 1 }}
                    onGuardar={guardar}
                    onCancelar={() => setEdicion(null)}
                  />
                </li>
              )}
            </ul>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="mt-1"
              onClick={() => setEdicion({ id: null, categoria: cat.value })}
            >
              <Plus className="size-4" />
              Añadir falta
            </Button>
          </div>
        ))}
        <p className="border-t pt-3 text-xs text-muted-foreground">
          Al llegar a {PUNTOS_CASTIGO} puntos sin resolver: recoger material o
          traer algo para compartir en la siguiente sesión. Los puntos se
          resuelven en ese momento, no se arrastran. Sin dinero de por medio.
        </p>
      </CardContent>
    </Card>
  );
}
